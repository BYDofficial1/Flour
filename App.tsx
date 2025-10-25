import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import type { Transaction, Reminder, Settings, Theme, Calculation } from './types';
import Header from './components/Header';
import TransactionForm from './components/TransactionForm';
import DashboardPage from './pages/DashboardPage';
import TransactionsPage from './pages/TransactionsPage';
import CalculatorPage from './pages/CalculatorPage';
import SettingsPage from './pages/SettingsPage';
import ReportsPage from './pages/ReportsPage';
import Sidebar from './components/Sidebar';
import ConfirmationModal from './components/ConfirmationModal';
import ReminderModal from './components/ReminderModal';
import { supabase } from './utils/supabase';
import { useNotifier } from './context/NotificationContext';
import { playNotificationSound } from './utils/sound';
import { InformationCircleIcon } from './components/icons/InformationCircleIcon';
import { CloseIcon } from './components/icons/CloseIcon';

export type Page = 'transactions' | 'dashboard' | 'calculator' | 'settings' | 'reports';
export type TimeFilter = {
    period: TimePeriod;
    startDate?: string;
    endDate?: string;
}
export type TimePeriod = 'today' | 'week' | 'month' | 'all' | 'custom';
export type SortKey = 'date' | 'total' | 'customerName';

const SYNC_QUEUES = {
    CREATES: 'unsynced_creates',
    UPDATES: 'unsynced_updates',
    DELETES: 'unsynced_deletes',
};

const CALC_SYNC_QUEUES = {
    CREATES: 'unsynced_calc_creates',
    UPDATES: 'unsynced_calc_updates',
    DELETES: 'unsynced_calc_deletes',
};

const fromSupabase = (t: any): Transaction => ({
  id: t.id,
  customerName: t.customer_name,
  item: t.item,
  quantity: t.quantity,
  rate: t.rate,
  total: t.total,
  date: t.date,
  customerMobile: t.customer_mobile,
  grindingCost: t.grinding_cost,
  cleaningCost: t.cleaning_cost,
  notes: t.notes,
  updatedAt: t.updated_at,
  paymentStatus: t.payment_status || 'paid',
  paidAmount: t.paid_amount,
});

const toSupabase = (t: Partial<Transaction>): any => ({
  id: t.id,
  customer_name: t.customerName,
  item: t.item,
  quantity: t.quantity,
  rate: t.rate,
  total: t.total,
  date: t.date,
  customer_mobile: t.customerMobile,
  grinding_cost: t.grindingCost,
  cleaning_cost: t.cleaningCost,
  notes: t.notes,
  updated_at: t.updatedAt,
  payment_status: t.paymentStatus,
  paid_amount: t.paidAmount,
});

const fromSupabaseCalc = (c: any): Calculation => ({
  id: c.id,
  customerName: c.customer_name,
  totalKg: c.total_kg,
  totalPrice: c.total_price,
  bags: c.bags,
  createdAt: c.created_at,
  notes: c.notes,
  pricePerMaund: c.price_per_maund,
  updatedAt: c.updated_at,
});

const toSupabaseCalc = (c: Partial<Calculation>): any => ({
  id: c.id,
  customer_name: c.customerName,
  total_kg: c.totalKg,
  total_price: c.totalPrice,
  bags: c.bags,
  notes: c.notes,
  price_per_maund: c.pricePerMaund,
  updated_at: c.updatedAt,
  created_at: c.createdAt,
});

const getQueue = <T,>(key: string): T[] => {
    const stored = localStorage.getItem(key);
    if (!stored) return [];
    try {
        const parsed = JSON.parse(stored);
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        console.error(`Failed to parse queue from localStorage for key "${key}":`, error);
        localStorage.removeItem(key);
        return [];
    }
};

const mergeData = (
    localData: Transaction[], 
    serverData: Transaction[], 
    pushedIds: Set<string>
): { mergedData: Transaction[], autoResolvedCount: number } => {
    
    const localMap = new Map(localData.map(d => [d.id, d]));
    const serverMap = new Map(serverData.map(d => [d.id, d]));
    const mergedMap = new Map<string, Transaction>();
    let autoResolvedCount = 0;

    // Process all server items
    for (const serverItem of serverData) {
        const localItem = localMap.get(serverItem.id);
        if (localItem) {
            // Item exists in both places. If we didn't just push it, check for conflicts.
            if (!pushedIds.has(localItem.id)) {
                const serverDate = new Date(serverItem.updatedAt || 0).getTime();
                const localDate = new Date(localItem.updatedAt || 0).getTime();
                // If versions differ by more than a second, it's a conflict we auto-resolve.
                if (Math.abs(serverDate - localDate) > 1000) {
                    autoResolvedCount++;
                }
            }
        }
        // "Server wins" strategy: always prioritize the server version.
        mergedMap.set(serverItem.id, serverItem);
    }
    
    // Add local-only items (newly created or that failed to sync before)
    for (const localItem of localData) {
        if (!serverMap.has(localItem.id)) {
            mergedMap.set(localItem.id, localItem);
        }
    }

    return { mergedData: Array.from(mergedMap.values()), autoResolvedCount };
};

const App: React.FC = () => {
    const { addNotification } = useNotifier();

    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [calculations, setCalculations] = useState<Calculation[]>([]);
    const [reminders, setReminders] = useState<Reminder[]>([]);
    
    const [currentPage, setCurrentPage] = useState<Page>('dashboard');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
    const [prefilledData, setPrefilledData] = useState<Partial<Transaction> | null>(null);
    const [transactionToDelete, setTransactionToDelete] = useState<string | null>(null);
    const [transactionForReminder, setTransactionForReminder] = useState<Transaction | null>(null);
    
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [isSyncing, setIsSyncing] = useState(false);
    const isSupabaseConfigured = !!supabase;
    const syncLock = useRef(false);
    const isInitialSync = useRef(true);
    const [queueVersion, setQueueVersion] = useState(0); // Used to trigger re-renders for unsyncedCount
    const editModeTapState = useRef<{ count: number; timer: number | null }>({ count: 0, timer: null });

    const [timeFilter, setTimeFilter] = useState<TimeFilter>({ period: 'all' });
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<Transaction['paymentStatus'][]>(['paid', 'unpaid', 'partial']);
    const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'ascending' | 'descending' }>({ key: 'date', direction: 'descending' });
    
    const [settings, setSettings] = useState<Settings>({ soundEnabled: true, theme: 'green' });
    const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(
        'Notification' in window ? Notification.permission : 'default'
    );
    const [isNoticeVisible, setIsNoticeVisible] = useState(false);
    
    const setQueue = <T,>(key: string, data: T[]) => {
        localStorage.setItem(key, JSON.stringify(data));
        setQueueVersion(v => v + 1);
    };

    const unsyncedCount = useMemo(() => {
        const tCreates = getQueue<Transaction>(SYNC_QUEUES.CREATES).length;
        const tUpdates = getQueue<Transaction>(SYNC_QUEUES.UPDATES).length;
        const tDeletes = getQueue<string>(SYNC_QUEUES.DELETES).length;
        const cCreates = getQueue<Calculation>(CALC_SYNC_QUEUES.CREATES).length;
        const cUpdates = getQueue<Calculation>(CALC_SYNC_QUEUES.UPDATES).length;
        const cDeletes = getQueue<string>(CALC_SYNC_QUEUES.DELETES).length;
        return tCreates + tUpdates + tDeletes + cCreates + cUpdates + cDeletes;
    }, [queueVersion]);

    const unsyncedTransactionIds = useMemo(() => {
        const creates = getQueue<Transaction>(SYNC_QUEUES.CREATES);
        const updates = getQueue<Transaction>(SYNC_QUEUES.UPDATES);
        return new Set([...creates.map(t => t.id), ...updates.map(t => t.id)]);
    }, [queueVersion]);

    useEffect(() => {
        const loader = document.getElementById('app-loader');
        if (loader) {
            const hideLoader = () => {
                loader.classList.add('fade-out');
                setTimeout(() => loader.remove(), 500);
            };
            window.addEventListener('typingAnimationComplete', () => setTimeout(hideLoader, 250), { once: true });
        }

        const noticeDismissed = localStorage.getItem('noticeDismissed');
        if (noticeDismissed !== 'true') {
            setIsNoticeVisible(true);
        }

        // Set edit mode to false on initial load
        setIsEditMode(false);
    }, []);

    const dismissNotice = () => {
        setIsNoticeVisible(false);
        localStorage.setItem('noticeDismissed', 'true');
    };

    const handleToggleEditMode = () => {
        if (editModeTapState.current.timer) {
            clearTimeout(editModeTapState.current.timer);
        }

        editModeTapState.current.count += 1;

        if (editModeTapState.current.count === 3) {
            const newEditModeState = !isEditMode;
            setIsEditMode(newEditModeState);
            addNotification(`Edit mode ${newEditModeState ? 'enabled' : 'disabled'}.`, newEditModeState ? 'success' : 'info');
            editModeTapState.current = { count: 0, timer: null };
            return;
        }

        editModeTapState.current.timer = window.setTimeout(() => {
            editModeTapState.current = { count: 0, timer: null };
        }, 400);
    };

    const syncData = useCallback(async () => {
        if (!isOnline || !isSupabaseConfigured || syncLock.current) return;

        syncLock.current = true;
        setIsSyncing(true);
        if (!isInitialSync.current) {
          addNotification('Syncing data...', 'info');
        }

        try {
            // --- Step 1: PUSH LOCAL CHANGES ---
            const tDeletes = getQueue<string>(SYNC_QUEUES.DELETES);
            if (tDeletes.length > 0) {
                const { error } = await supabase.from('transactions').delete().in('id', tDeletes);
                if (error) throw error;
            }

            const tCreates = getQueue<Transaction>(SYNC_QUEUES.CREATES);
            if (tCreates.length > 0) {
                const { error } = await supabase.from('transactions').upsert(tCreates.map(toSupabase));
                if (error) throw error;
            }

            const tUpdates = getQueue<Transaction>(SYNC_QUEUES.UPDATES);
            if (tUpdates.length > 0) {
                const { error } = await supabase.from('transactions').upsert(tUpdates.map(toSupabase));
                if (error) throw error;
            }

            const cDeletes = getQueue<string>(CALC_SYNC_QUEUES.DELETES);
            if (cDeletes.length > 0) {
                const { error } = await supabase.from('calculations').delete().in('id', cDeletes);
                if (error) throw error;
            }

            const cCreates = getQueue<Calculation>(CALC_SYNC_QUEUES.CREATES);
            if (cCreates.length > 0) {
                 const { error } = await supabase.from('calculations').upsert(cCreates.map(toSupabaseCalc));
                if (error) throw error;
            }

            const cUpdates = getQueue<Calculation>(CALC_SYNC_QUEUES.UPDATES);
            if (cUpdates.length > 0) {
                const { error } = await supabase.from('calculations').upsert(cUpdates.map(toSupabaseCalc));
                if (error) throw error;
            }

            const pushedTxIds = new Set([...tCreates.map(t => t.id), ...tUpdates.map(t => t.id)]);

            // --- Step 2: Clear queues on successful push ---
            setQueue<string>(SYNC_QUEUES.DELETES, []);
            setQueue<Transaction>(SYNC_QUEUES.CREATES, []);
            setQueue<Transaction>(SYNC_QUEUES.UPDATES, []);
            setQueue<string>(CALC_SYNC_QUEUES.DELETES, []);
            setQueue<Calculation>(CALC_SYNC_QUEUES.CREATES, []);
            setQueue<Calculation>(CALC_SYNC_QUEUES.UPDATES, []);

            // --- Step 3: PULL & MERGE SERVER CHANGES ---
            const [
                { data: serverTransactionsData, error: tError },
                { data: serverCalculationsData, error: cError }
            ] = await Promise.all([
                supabase.from('transactions').select('*'),
                supabase.from('calculations').select('*')
            ]);
            
            if (tError) throw tError;
            if (cError) throw cError;

            // Merge Transactions
            const serverTransactions = serverTransactionsData.map(fromSupabase);
            const currentLocalTransactions = getQueue<Transaction>('transactions');
            const { mergedData: finalTransactions, autoResolvedCount } = mergeData(
                currentLocalTransactions, 
                serverTransactions,
                pushedTxIds
            );

            setTransactions(finalTransactions);
            localStorage.setItem('transactions', JSON.stringify(finalTransactions));

            // For calculations, we'll do a simple overwrite for now
            const serverCalculations = serverCalculationsData.map(fromSupabaseCalc);
            setCalculations(serverCalculations);
            localStorage.setItem('calculations', JSON.stringify(serverCalculations));

            if (isInitialSync.current) {
                if (autoResolvedCount > 0) {
                    addNotification(`${autoResolvedCount} records auto-updated from server.`, 'info');
                }
            } else {
                 if (autoResolvedCount > 0) {
                    addNotification(`${autoResolvedCount} records auto-updated. Sync complete!`, 'success');
                } else {
                    addNotification('Sync complete!', 'success');
                }
            }

        } catch (error: any) {
            console.error("Sync failed:", error);
            let errorMessage = "An unknown error occurred.";
            if (error && typeof error === 'object') {
                if ('message' in error && typeof error.message === 'string' && error.message) {
                    errorMessage = error.message;
                } else {
                    try {
                        const stringified = JSON.stringify(error);
                        errorMessage = stringified === '{}' ? "Received an empty error object." : stringified;
                    } catch (e) {
                        errorMessage = "Could not stringify the error object.";
                    }
                }
            } else if (error) {
                errorMessage = String(error);
            }
            addNotification(`Sync failed: ${errorMessage}`, 'error');
        } finally {
            setIsSyncing(false);
            syncLock.current = false;
            isInitialSync.current = false;
        }
    }, [isOnline, isSupabaseConfigured, addNotification]);
    
    useEffect(() => {
        const localTransactions = getQueue<Transaction>('transactions');
        const localCalculations = getQueue<Calculation>('calculations');
        const localReminders = getQueue<Reminder>('reminders');
        const localSettings = localStorage.getItem('settings');
        
        if(localTransactions.length > 0) setTransactions(localTransactions);
        if(localCalculations.length > 0) setCalculations(localCalculations);
        if(localReminders.length > 0) setReminders(localReminders);
        if (localSettings) {
             const parsedSettings = JSON.parse(localSettings);
             setSettings(parsedSettings);
             document.documentElement.className = `theme-${parsedSettings.theme}`;
        } else {
             document.documentElement.className = `theme-green`;
        }

        let syncInterval: number | undefined;

        const startAutoSync = () => {
            if (syncInterval) clearInterval(syncInterval);
            if (isOnline && isSupabaseConfigured) {
                syncInterval = window.setInterval(() => {
                    syncData();
                }, 2 * 60 * 1000); // Sync every 2 minutes
            }
        };

        if (isOnline && isSupabaseConfigured) {
            syncData();
        }
        startAutoSync();

        const handleOnline = () => { 
            setIsOnline(true); 
            addNotification('You are back online! Syncing changes...', 'success'); 
            syncData(); 
            startAutoSync(); 
        };
        const handleOffline = () => { 
            setIsOnline(false); 
            addNotification('Connection lost. Switching to offline mode.', 'info'); 
            if (syncInterval) clearInterval(syncInterval);
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            if (syncInterval) clearInterval(syncInterval);
        };
    }, [isOnline, isSupabaseConfigured, syncData, addNotification]);

    const addTransaction = (data: Omit<Transaction, 'id' | 'updatedAt'>) => {
        const newTransaction: Transaction = { ...data, id: crypto.randomUUID(), updatedAt: new Date().toISOString() };
        const newTransactions = [...transactions, newTransaction];
        setTransactions(newTransactions);
        localStorage.setItem('transactions', JSON.stringify(newTransactions));
        
        const creates = getQueue<Transaction>(SYNC_QUEUES.CREATES);
        setQueue<Transaction>(SYNC_QUEUES.CREATES, [...creates, newTransaction]);
        
        addNotification('Transaction added successfully!', 'success');
        if (settings.soundEnabled) playNotificationSound();
        if (isOnline) syncData();
        closeModal();
    };

    const updateTransaction = (updatedTransaction: Transaction) => {
        const finalTransaction = { ...updatedTransaction, updatedAt: new Date().toISOString() };
        const newTransactions = transactions.map(t => t.id === finalTransaction.id ? finalTransaction : t);
        setTransactions(newTransactions);
        localStorage.setItem('transactions', JSON.stringify(newTransactions));
        
        const updates = getQueue<Transaction>(SYNC_QUEUES.UPDATES).filter(t => t.id !== finalTransaction.id);
        setQueue<Transaction>(SYNC_QUEUES.UPDATES, [...updates, finalTransaction]);

        addNotification('Transaction updated.', 'info');
        if (isOnline) syncData();
        closeModal();
    };

    const deleteTransaction = (id: string) => {
        setTransactions(prev => prev.filter(t => t.id !== id));
        localStorage.setItem('transactions', JSON.stringify(transactions.filter(t => t.id !== id)));
        
        const deletes = getQueue<string>(SYNC_QUEUES.DELETES);
        if (!deletes.includes(id)) {
            setQueue<string>(SYNC_QUEUES.DELETES, [...deletes, id]);
        }

        addNotification('Transaction deleted.', 'error');
        if (isOnline) syncData();
        setTransactionToDelete(null);
    };

    const addCalculation = (data: Omit<Calculation, 'id' | 'createdAt' | 'updatedAt'>) => {
        const now = new Date().toISOString();
        const newCalc: Calculation = { ...data, id: crypto.randomUUID(), createdAt: now, updatedAt: now };
        const newCalcs = [...calculations, newCalc];
        setCalculations(newCalcs);
        localStorage.setItem('calculations', JSON.stringify(newCalcs));
        
        const creates = getQueue<Calculation>(CALC_SYNC_QUEUES.CREATES);
        setQueue(CALC_SYNC_QUEUES.CREATES, [...creates, newCalc]);
        
        addNotification('Calculation saved!', 'success');
        if (settings.soundEnabled) playNotificationSound();
        if (isOnline) syncData();
    };

    const updateCalculation = (updatedCalc: Calculation) => {
        const finalCalc = { ...updatedCalc, updatedAt: new Date().toISOString() };
        const newCalcs = calculations.map(c => c.id === finalCalc.id ? finalCalc : c);
        setCalculations(newCalcs);
        localStorage.setItem('calculations', JSON.stringify(newCalcs));

        const updates = getQueue<Calculation>(CALC_SYNC_QUEUES.UPDATES).filter(c => c.id !== finalCalc.id);
        setQueue(CALC_SYNC_QUEUES.UPDATES, [...updates, finalCalc]);

        addNotification('Calculation updated.', 'info');
        if (isOnline) syncData();
    };

    const deleteCalculation = (id: string) => {
        setCalculations(prev => prev.filter(c => c.id !== id));
        localStorage.setItem('calculations', JSON.stringify(calculations.filter(c => c.id !== id)));

        const deletes = getQueue<string>(CALC_SYNC_QUEUES.DELETES);
        if (!deletes.includes(id)) {
            setQueue(CALC_SYNC_QUEUES.DELETES, [...deletes, id]);
        }
        addNotification('Calculation deleted.', 'error');
        if(isOnline) syncData();
    };
    
    const handleSetReminder = (transactionId: string, remindAt: Date) => {
        const newReminder: Reminder = { id: crypto.randomUUID(), transactionId, remindAt: remindAt.toISOString() };
        const newReminders = [...reminders.filter(r => r.transactionId !== transactionId), newReminder];
        setReminders(newReminders);
        localStorage.setItem('reminders', JSON.stringify(newReminders));
        addNotification('Reminder set!', 'success');
        setTransactionForReminder(null);
    };

    const onBulkDelete = (ids: string[]) => {
        setTransactions(prev => prev.filter(t => !ids.includes(t.id)));
        localStorage.setItem('transactions', JSON.stringify(transactions.filter(t => !ids.includes(t.id))));
        const deletes = getQueue<string>(SYNC_QUEUES.DELETES);
        setQueue<string>(SYNC_QUEUES.DELETES, [...new Set([...deletes, ...ids])]);
        addNotification(`${ids.length} transactions deleted.`, 'error');
        if(isOnline) syncData();
    };

    const onBulkUpdate = (ids: string[], newStatus: Transaction['paymentStatus']) => {
        let updatedCount = 0;
        const updatedTransactionsForQueue: Transaction[] = [];
        const newTransactions = transactions.map(t => {
            if (ids.includes(t.id)) {
                updatedCount++;
                const updatedTransaction: Transaction = {
                    ...t,
                    paymentStatus: newStatus,
                    paidAmount: newStatus === 'paid' ? t.total : (newStatus === 'unpaid' ? 0 : t.paidAmount),
                    updatedAt: new Date().toISOString()
                };
                updatedTransactionsForQueue.push(updatedTransaction);
                return updatedTransaction;
            }
            return t;
        });
        setTransactions(newTransactions);
        localStorage.setItem('transactions', JSON.stringify(newTransactions));
        
        const updates = getQueue<Transaction>(SYNC_QUEUES.UPDATES).filter(t => !ids.includes(t.id));
        setQueue<Transaction>(SYNC_QUEUES.UPDATES, [...updates, ...updatedTransactionsForQueue]);

        addNotification(`${updatedCount} transactions updated to "${newStatus}".`, 'info');
        if(isOnline) syncData();
    };

    const onBulkSetReminder = (ids: string[], remindAt: Date) => {
        const newReminders: Reminder[] = ids.map(id => ({ id: crypto.randomUUID(), transactionId: id, remindAt: remindAt.toISOString() }));
        const updatedReminders = [...reminders.filter(r => !ids.includes(r.transactionId)), ...newReminders];
        setReminders(updatedReminders);
        localStorage.setItem('reminders', JSON.stringify(updatedReminders));
        addNotification(`Reminders set for ${ids.length} transactions.`, 'success');
    };
    
    const requestNotifications = () => {
        if ('Notification' in window) {
            Notification.requestPermission().then(permission => {
                setNotificationPermission(permission);
                if (permission === 'granted') {
                    addNotification('Browser notifications enabled!', 'success');
                } else if (permission === 'denied') {
                    addNotification('Browser notifications have been blocked.', 'error');
                }
            });
        } else {
            addNotification('This browser does not support notifications.', 'info');
        }
    };

    const openModal = (transactionToEdit: Transaction | null = null, prefill: Partial<Transaction> | null = null) => {
        setEditingTransaction(transactionToEdit);
        setPrefilledData(prefill);
        setIsModalOpen(true);
    };
    const closeModal = () => {
        setIsModalOpen(false);
        setEditingTransaction(null);
        setPrefilledData(null);
    };

    const filteredTransactions = useMemo(() => {
        let startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const filtered = transactions.filter(t => {
            const transactionDate = new Date(t.date);
            let isInDateRange = true;
            if (timeFilter.period === 'today') {
                isInDateRange = transactionDate >= startOfDay;
            } else if (timeFilter.period !== 'all') {
                // Simplified logic, can be expanded
            }

            const searchMatch = !searchQuery ||
                t.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                t.item.toLowerCase().includes(searchQuery.toLowerCase());
            
            const statusMatch = statusFilter.length === 3 || statusFilter.includes(t.paymentStatus);

            return isInDateRange && searchMatch && statusMatch;
        });

        return filtered.sort((a, b) => {
            const dir = sortConfig.direction === 'ascending' ? 1 : -1;
            switch (sortConfig.key) {
                case 'date': return (new Date(a.date).getTime() - new Date(b.date).getTime()) * dir;
                case 'total': return (a.total - b.total) * dir;
                case 'customerName': return a.customerName.localeCompare(b.customerName) * dir;
                default: return 0;
            }
        });
    }, [transactions, timeFilter, searchQuery, statusFilter, sortConfig]);

    const handleSaveSettings = (newSettings: Settings) => {
        setSettings(newSettings);
        localStorage.setItem('settings', JSON.stringify(newSettings));
        document.documentElement.className = `theme-${newSettings.theme}`;
        addNotification('Settings saved!', 'success');
    };

    const CurrentPage = () => {
        switch (currentPage) {
            case 'dashboard':
                return <DashboardPage 
                            transactions={filteredTransactions} 
                            allTransactions={transactions}
                            timeFilter={timeFilter} 
                            setTimeFilter={setTimeFilter} 
                            isEditMode={isEditMode}
                            setCurrentPage={setCurrentPage}
                        />;
            case 'transactions':
                return <TransactionsPage 
                            transactions={filteredTransactions}
                            onEdit={openModal}
                            onDelete={(id) => setTransactionToDelete(id)}
                            openModal={openModal}
                            timeFilter={timeFilter}
                            setTimeFilter={setTimeFilter}
                            searchQuery={searchQuery}
                            setSearchQuery={setSearchQuery}
                            statusFilter={statusFilter}
                            setStatusFilter={setStatusFilter}
                            unsyncedIds={unsyncedTransactionIds}
                            onSetReminder={(t) => setTransactionForReminder(t)}
                            reminders={reminders}
                            onBulkDelete={onBulkDelete}
                            onBulkUpdate={onBulkUpdate}
                            onBulkSetReminder={onBulkSetReminder}
                            isEditMode={isEditMode}
                            sortConfig={sortConfig}
                            setSortConfig={setSortConfig}
                         />;
            case 'reports':
                return <ReportsPage transactions={transactions} />;
            case 'calculator':
                return <CalculatorPage 
                            isEditMode={isEditMode}
                            calculations={calculations}
                            onAddCalculation={addCalculation}
                            onUpdateCalculation={updateCalculation}
                            onDeleteCalculation={deleteCalculation}
                        />;
            case 'settings':
                return <SettingsPage 
                            currentSettings={settings}
                            onSave={handleSaveSettings}
                            notificationPermission={notificationPermission}
                            onRequestNotifications={requestNotifications}
                            isEditMode={isEditMode}
                        />;
            default:
                return <DashboardPage 
                            transactions={filteredTransactions} 
                            allTransactions={transactions}
                            timeFilter={timeFilter} 
                            setTimeFilter={setTimeFilter} 
                            isEditMode={isEditMode}
                            setCurrentPage={setCurrentPage}
                        />;
        }
    };
    
    return (
        <div className="flex h-screen bg-slate-900 text-slate-300 font-sans">
            <Sidebar 
                isOpen={isSidebarOpen} 
                setIsOpen={setIsSidebarOpen} 
                currentPage={currentPage} 
                setCurrentPage={setCurrentPage}
                isEditMode={isEditMode}
                onToggleEditMode={handleToggleEditMode}
            />

            <div className="flex-1 flex flex-col overflow-hidden lg:ml-64">
                <Header 
                    onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    isOnline={isOnline}
                    isSyncing={isSyncing}
                    unsyncedCount={unsyncedCount}
                    onSync={syncData}
                    isSupabaseConfigured={isSupabaseConfigured}
                    isEditMode={isEditMode}
                />

                {isNoticeVisible && (
                    <div className="bg-slate-700 text-slate-200 text-sm px-4 py-2 flex items-center justify-center gap-3 relative text-center">
                        <InformationCircleIcon className="h-5 w-5 text-slate-300 flex-shrink-0" />
                        <p>
                            <strong>Notice:</strong> This application is under active development and may be updated at any time.
                        </p>
                        <button 
                            onClick={dismissNotice} 
                            className="p-1 rounded-full hover:bg-slate-600 absolute right-2 top-1/2 -translate-y-1/2"
                            aria-label="Dismiss notice"
                        >
                            <CloseIcon className="h-4 w-4" />
                        </button>
                    </div>
                )}
                
                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-slate-900 no-scrollbar">
                    <div className="container mx-auto px-4 md:px-6 py-4">
                        <CurrentPage />
                    </div>
                </main>
            </div>

            {isModalOpen && (
                <TransactionForm
                    isOpen={isModalOpen}
                    onClose={closeModal}
                    onSubmit={editingTransaction ? updateTransaction : addTransaction}
                    initialData={editingTransaction}
                    prefilledData={prefilledData}
                />
            )}
            
            {transactionToDelete && (
                <ConfirmationModal
                    isOpen={!!transactionToDelete}
                    onClose={() => setTransactionToDelete(null)}
                    onConfirm={() => {
                        if (transactionToDelete) {
                            deleteTransaction(transactionToDelete);
                        }
                    }}
                    title="Delete Transaction"
                    message="Are you sure you want to delete this transaction? This action cannot be undone."
                />
            )}
            
            {transactionForReminder && (
                <ReminderModal
                    isOpen={!!transactionForReminder}
                    onClose={() => setTransactionForReminder(null)}
                    onSetReminder={handleSetReminder}
                    transaction={transactionForReminder}
                />
            )}

        </div>
    );
};

export default App;
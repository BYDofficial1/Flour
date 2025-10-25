
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import type { Transaction, Reminder, Settings, Theme, Calculation } from './types';
import Header from './components/Header';
import TransactionForm from './components/TransactionForm';
import DashboardPage from './pages/DashboardPage';
import TransactionsPage from './pages/TransactionsPage';
import CalculatorPage from './pages/CalculatorPage';
import SettingsPage from './pages/SettingsPage';
import ReportsPage from './pages/ReportsPage';
import CustomersPage from './pages/CustomersPage';
import Sidebar from './components/Sidebar';
import ConfirmationModal from './components/ConfirmationModal';
import ConflictResolutionModal from './components/ConflictResolutionModal';
import ReminderModal from './components/ReminderModal';
import { supabase } from './utils/supabase';
import { useNotifier } from './context/NotificationContext';
import { playNotificationSound } from './utils/sound';

export type Page = 'transactions' | 'dashboard' | 'customers' | 'calculator' | 'settings' | 'reports';
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
): { mergedData: Transaction[], newConflicts: { local: Transaction, server: Transaction }[] } => {
    
    const localMap = new Map(localData.map(d => [d.id, d]));
    const serverMap = new Map(serverData.map(d => [d.id, d]));
    const mergedMap = new Map<string, Transaction>();
    const newConflicts: { local: Transaction, server: Transaction }[] = [];

    // Process all server items
    for (const serverItem of serverData) {
        const localItem = localMap.get(serverItem.id);
        if (localItem) {
            // Item exists in both places
            if (pushedIds.has(localItem.id)) {
                 // We just pushed this. Server version is the most up-to-date.
                mergedMap.set(serverItem.id, serverItem);
            } else {
                const serverDate = new Date(serverItem.updatedAt || 0).getTime();
                const localDate = new Date(localItem.updatedAt || 0).getTime();
                if (Math.abs(serverDate - localDate) > 1000) { // Conflict
                    newConflicts.push({ local: localItem, server: serverItem });
                    // Keep local version for now until resolved by user
                    mergedMap.set(localItem.id, localItem);
                } else {
                    // No conflict, versions are same or close enough
                    mergedMap.set(serverItem.id, serverItem);
                }
            }
        } else {
            // Item is only on server, so add it
            mergedMap.set(serverItem.id, serverItem);
        }
    }
    
    // Add local-only items (newly created or that failed to sync before)
    for (const localItem of localData) {
        if (!serverMap.has(localItem.id)) {
            mergedMap.set(localItem.id, localItem);
        }
    }

    return { mergedData: Array.from(mergedMap.values()), newConflicts };
};

const App: React.FC = () => {
    const { addNotification } = useNotifier();

    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [calculations, setCalculations] = useState<Calculation[]>([]);
    const [reminders, setReminders] = useState<Reminder[]>([]);
    
    const [currentPage, setCurrentPage] = useState<Page>('dashboard');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(true);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
    const [prefilledData, setPrefilledData] = useState<Partial<Transaction> | null>(null);
    const [transactionToDelete, setTransactionToDelete] = useState<string | null>(null);
    const [transactionForReminder, setTransactionForReminder] = useState<Transaction | null>(null);
    const [conflicts, setConflicts] = useState<{ local: Transaction; server: Transaction }[]>([]);
    
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [isSyncing, setIsSyncing] = useState(false);
    const isSupabaseConfigured = !!supabase;
    const syncLock = useRef(false);
    const [queueVersion, setQueueVersion] = useState(0); // Used to trigger re-renders for unsyncedCount

    const [timeFilter, setTimeFilter] = useState<TimeFilter>({ period: 'today' });
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<Transaction['paymentStatus'][]>(['paid', 'unpaid', 'partial']);
    const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'ascending' | 'descending' }>({ key: 'date', direction: 'descending' });
    
    const [settings, setSettings] = useState<Settings>({ soundEnabled: true, theme: 'green' });
    const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(
        'Notification' in window ? Notification.permission : 'default'
    );
    
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
    }, []);

    const syncData = useCallback(async () => {
        if (!isOnline || !isSupabaseConfigured || syncLock.current) return;

        syncLock.current = true;
        setIsSyncing(true);
        addNotification('Syncing data...', 'info');

        const tUpdatesForConflictCheck = getQueue<Transaction>(SYNC_QUEUES.UPDATES);

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
            const { mergedData: finalTransactions, newConflicts } = mergeData(
                currentLocalTransactions, 
                serverTransactions,
                new Set(tUpdatesForConflictCheck.map(t => t.id))
            );

            setTransactions(finalTransactions);
            localStorage.setItem('transactions', JSON.stringify(finalTransactions));

            // For calculations, we'll do a simple overwrite for now
            const serverCalculations = serverCalculationsData.map(fromSupabaseCalc);
            setCalculations(serverCalculations);
            localStorage.setItem('calculations', JSON.stringify(serverCalculations));

            if (newConflicts.length > 0) {
                setConflicts(prev => [...prev, ...newConflicts]);
                addNotification(`${newConflicts.length} sync conflicts found. Please resolve them.`, 'error');
            } else {
                addNotification('Sync complete!', 'success');
            }

        } catch (error: any) {
            console.error("Sync failed:", error);
            const errorMessage = error.message || (typeof error === 'object' ? JSON.stringify(error) : String(error));
            addNotification(`Sync failed: ${errorMessage}`, 'error');
        } finally {
            setIsSyncing(false);
            syncLock.current = false;
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

        if (isOnline && isSupabaseConfigured) {
            syncData();
        }

        const handleOnline = () => { setIsOnline(true); addNotification('Back online!', 'success'); syncData(); };
        const handleOffline = () => { setIsOnline(false); addNotification('You are offline.', 'info'); };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [isSupabaseConfigured, syncData]);

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
                return <DashboardPage transactions={filteredTransactions} timeFilter={timeFilter} setTimeFilter={setTimeFilter} isEditMode={isEditMode} />;
            case 'transactions':
                return <TransactionsPage 
                            transactions={filteredTransactions}
                            onEdit={openModal}
                            onDelete={(id) => setTransactionToDelete(id)}
                            openModal={() => openModal()}
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
            case 'customers':
                return <CustomersPage transactions={transactions} />;
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
                return <DashboardPage transactions={filteredTransactions} timeFilter={timeFilter} setTimeFilter={setTimeFilter} isEditMode={isEditMode} />;
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
                onToggleEditMode={() => {
                    if(isEditMode) addNotification('Edit mode disabled.', 'info');
                    else addNotification('Edit mode enabled.', 'success');
                    setIsEditMode(!isEditMode)
                }}
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
                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-slate-900">
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

            {conflicts.length > 0 && (
                <ConflictResolutionModal
                    isOpen={conflicts.length > 0}
                    conflicts={conflicts}
                    onResolve={(chosenVersion: Transaction, choice: 'local' | 'server') => {
                        updateTransaction(chosenVersion);
                        setConflicts(prev => prev.filter(c => c.local.id !== chosenVersion.id));
                        addNotification(`Conflict resolved. Kept the ${choice} version.`, 'success');
                    }}
                />
            )}
        </div>
    );
};

export default App;

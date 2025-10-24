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
import ConflictResolutionModal from './components/ConflictResolutionModal';
import ReminderModal from './components/ReminderModal';
import { supabase } from './utils/supabase';
import { useNotifier } from './context/NotificationContext';
import { playNotificationSound } from './utils/sound';
import { formatCurrency } from './utils/currency';


export type Page = 'transactions' | 'dashboard' | 'calculator' | 'settings' | 'reports';
export type TimeFilter = {
    period: TimePeriod;
    startDate?: string;
    endDate?: string;
}
export type TimePeriod = 'today' | 'week' | 'month' | 'all' | 'custom';

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

// Map snake_case from DB to camelCase for UI (Transactions)
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
  paymentStatus: t.payment_status || 'paid', // Default old records to 'paid'
  paidAmount: t.paid_amount,
});

// Map camelCase from UI to snake_case for DB (Transactions)
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
  payment_status: t.paymentStatus,
  paid_amount: t.paidAmount,
});

// Map snake_case from DB to camelCase for UI (Calculations)
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

// Map camelCase from UI to snake_case for DB (Calculations)
const toSupabaseCalc = (c: Partial<Calculation>): any => ({
  id: c.id,
  customer_name: c.customerName,
  total_kg: c.totalKg,
  total_price: c.totalPrice,
  bags: c.bags,
  created_at: c.createdAt,
  notes: c.notes,
  price_per_maund: c.pricePerMaund,
});


const getQueue = <T,>(key: string): T[] => {
    const stored = localStorage.getItem(key);
    if (!stored) return [];
    try {
        const parsed = JSON.parse(stored);
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        console.error(`Failed to parse queue from localStorage for key "${key}":`, error);
        localStorage.removeItem(key); // Clear corrupted data
        return [];
    }
};


const App: React.FC = () => {
    const { addNotification } = useNotifier();
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [calculations, setCalculations] = useState<Calculation[]>([]); // New state for calculations
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
    const [prefilledData, setPrefilledData] = useState<Partial<Transaction> | null>(null);
    const [timeFilter, setTimeFilter] = useState<TimeFilter>({ period: 'all' });
    const [currentPage, setCurrentPage] = useState<Page>('dashboard');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [deletingTransactionId, setDeletingTransactionId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [isEditMode, setIsEditMode] = useState(false);

    // Sync states
    const [isOnline, setIsOnline] = useState<boolean>(() => navigator.onLine);
    const [unsyncedCount, setUnsyncedCount] = useState<number>(0);
    const [isSyncing, setIsSyncing] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isSupabaseConfigured] = useState<boolean>(!!supabase);
    const [unsyncedIds, setUnsyncedIds] = useState<Set<string>>(new Set());
    const [conflicts, setConflicts] = useState<{ local: Transaction, server: Transaction }[]>([]);
    const [statusFilter, setStatusFilter] = useState<Transaction['paymentStatus'][]>([]);

    // Reminder and Notification states
    const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(Notification.permission);
    const [reminders, setReminders] = useState<Reminder[]>([]);
    const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);
    const [transactionForReminder, setTransactionForReminder] = useState<Transaction | null>(null);

    // Settings state
    const [settings, setSettings] = useState<Settings>({
        soundEnabled: true,
        theme: 'green',
    });

    const toggleEditMode = () => {
        setIsEditMode(prev => {
            addNotification(`Edit mode ${!prev ? 'enabled' : 'disabled'}.`, 'info');
            return !prev;
        });
    };

    useEffect(() => {
        const savedSettings = localStorage.getItem('app-settings');
        if (savedSettings) {
             try {
                const parsed = JSON.parse(savedSettings);
                if (typeof parsed === 'object' && parsed !== null) {
                    const loadedSettings: Settings = {
                        soundEnabled: parsed.soundEnabled ?? true,
                        theme: parsed.theme ?? 'green'
                    };
                    setSettings(loadedSettings);
                    document.documentElement.className = `theme-${loadedSettings.theme}`;
                }
            } catch (error) {
                console.error("Failed to parse settings from cache:", error);
                localStorage.removeItem('app-settings');
            }
        }
    }, []);

    const handleSaveSettings = (newSettings: Settings) => {
        setSettings(newSettings);
        document.documentElement.className = `theme-${newSettings.theme}`;
        localStorage.setItem('app-settings', JSON.stringify(newSettings));
        addNotification('Settings saved!', 'success');
    };

    const checkUnsyncedChanges = useCallback(() => {
        const txCreates = getQueue<Transaction>(SYNC_QUEUES.CREATES);
        const txUpdates = getQueue<Transaction>(SYNC_QUEUES.UPDATES);
        const txDeletes = getQueue<string>(SYNC_QUEUES.DELETES);
        const calcCreates = getQueue<Calculation>(CALC_SYNC_QUEUES.CREATES);
        const calcUpdates = getQueue<Calculation>(CALC_SYNC_QUEUES.UPDATES);
        const calcDeletes = getQueue<string>(CALC_SYNC_QUEUES.DELETES);

        setUnsyncedCount(txCreates.length + txUpdates.length + txDeletes.length + calcCreates.length + calcUpdates.length + calcDeletes.length);
        setUnsyncedIds(new Set([...txCreates.map(t => t.id), ...txUpdates.map(t => t.id)]));
    }, []);

    const setQueue = useCallback(<T,>(key: string, queue: T[]) => {
        localStorage.setItem(key, JSON.stringify(queue));
        checkUnsyncedChanges();
    }, [checkUnsyncedChanges]);
    
    const clearQueues = useCallback(() => {
        Object.values(SYNC_QUEUES).forEach(key => localStorage.removeItem(key));
        Object.values(CALC_SYNC_QUEUES).forEach(key => localStorage.removeItem(key));
        checkUnsyncedChanges();
    }, [checkUnsyncedChanges]);

    const loadFromCache = useCallback(() => {
        // Load Transactions
        const savedTxs = localStorage.getItem('transactions');
        if (savedTxs) {
            try {
                setTransactions(JSON.parse(savedTxs));
            } catch (e) {
                console.error("Failed to parse transactions from cache", e);
                localStorage.removeItem('transactions');
            }
        }
        // Load Calculations
        const savedCalcs = localStorage.getItem('calculations');
        if (savedCalcs) {
            try {
                setCalculations(JSON.parse(savedCalcs));
            } catch (e) {
                console.error("Failed to parse calculations from cache", e);
                localStorage.removeItem('calculations');
            }
        }
    }, []);

    const fetchFromServerAndCache = useCallback(async () => {
        if (!isOnline || !isSupabaseConfigured) {
            if (!isSupabaseConfigured && isOnline) {
                addNotification('Supabase not configured. Working in offline mode.', 'info');
            }
            return;
        }

        try {
            // Fetch Transactions
            const { data: txData, error: txError } = await supabase!.from('transactions').select('*').order('date', { ascending: false });
            if (txError) throw txError;
            const mappedTxs = txData.map(fromSupabase);
            setTransactions(mappedTxs);
            localStorage.setItem('transactions', JSON.stringify(mappedTxs));

            // Fetch Calculations
            const { data: calcData, error: calcError } = await supabase!.from('calculations').select('*').order('created_at', { ascending: false });
            if (calcError) throw calcError;
            const mappedCalcs = calcData.map(fromSupabaseCalc);
            setCalculations(mappedCalcs);
            localStorage.setItem('calculations', JSON.stringify(mappedCalcs));

        } catch (error: any) {
            console.error("Error fetching from Supabase, working with cached data:", error.message || error);
            addNotification(`Failed to fetch latest data: ${error.message}. Displaying cached version.`, 'error');
        }
    }, [isOnline, isSupabaseConfigured, addNotification]);
    
    // Main effect for app initialization
    useEffect(() => {
        // Step 1: Load from cache to render UI immediately behind the loader
        loadFromCache();

        // Prepare promises for loader animations and minimum display time
        const typingPromise = new Promise<void>(resolve => {
            const timeout = setTimeout(() => resolve(), 6000); // Failsafe
            window.addEventListener('typingAnimationComplete', () => {
                clearTimeout(timeout);
                resolve();
            }, { once: true });
        });
        const timeoutPromise = new Promise<void>(resolve => setTimeout(resolve, 5000));

        Promise.all([typingPromise, timeoutPromise]).then(() => {
            setIsLoading(false); // Hide loader after animations and delay
        });

        // Step 2: Fetch latest data from server in the background
        fetchFromServerAndCache();
        
        // The rest of the setup
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        checkUnsyncedChanges();

        const savedReminders = localStorage.getItem('reminders');
        if (savedReminders) {
            try {
                const parsed = JSON.parse(savedReminders);
                if (Array.isArray(parsed)) {
                    setReminders(parsed);
                }
            } catch (error) {
                console.error("Failed to parse reminders from cache:", error);
                localStorage.removeItem('reminders');
            }
        }

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [loadFromCache, fetchFromServerAndCache, checkUnsyncedChanges]);


    // Effect to remove the HTML loader from the DOM
    useEffect(() => {
        if (!isLoading) {
            const loader = document.getElementById('app-loader');
            if (loader) {
                loader.classList.add('fade-out');
                setTimeout(() => {
                    loader.remove();
                }, 500); // Match CSS animation duration
            }
        }
    }, [isLoading]);


    // Real-time Supabase subscription
    useEffect(() => {
        if (!isSupabaseConfigured) return;

        const txChannel = supabase!.channel('public:transactions')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, payload => {
            console.log('Real-time change received (transactions):', payload);
            setTransactions(currentTxs => {
                const creates = getQueue<Transaction>(SYNC_QUEUES.CREATES);
                const updates = getQueue<Transaction>(SYNC_QUEUES.UPDATES);
                let newTxs = currentTxs;
                if (payload.eventType === 'INSERT') {
                    const newTx = fromSupabase(payload.new);
                    if (!creates.some(t => t.id === newTx.id) && !currentTxs.some(t => t.id === newTx.id)) {
                        newTxs = [newTx, ...currentTxs];
                    }
                } else if (payload.eventType === 'UPDATE') {
                    const updatedTx = fromSupabase(payload.new);
                    if (!updates.some(t => t.id === updatedTx.id)) {
                        newTxs = currentTxs.map(t => t.id === updatedTx.id ? updatedTx : t);
                    }
                } else if (payload.eventType === 'DELETE') {
                    newTxs = currentTxs.filter(t => t.id !== payload.old.id);
                }
                if (newTxs !== currentTxs) localStorage.setItem('transactions', JSON.stringify(newTxs));
                return newTxs;
            });
          }).subscribe();

        const calcChannel = supabase!.channel('public:calculations')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'calculations' }, payload => {
            console.log('Real-time change received (calculations):', payload);
             setCalculations(currentCalcs => {
                const creates = getQueue<Calculation>(CALC_SYNC_QUEUES.CREATES);
                const updates = getQueue<Calculation>(CALC_SYNC_QUEUES.UPDATES);
                let newCalcs = currentCalcs;
                if (payload.eventType === 'INSERT') {
                    const newCalc = fromSupabaseCalc(payload.new);
                    if (!creates.some(c => c.id === newCalc.id) && !currentCalcs.some(c => c.id === newCalc.id)) {
                        newCalcs = [newCalc, ...currentCalcs];
                    }
                } else if (payload.eventType === 'UPDATE') {
                    const updatedCalc = fromSupabaseCalc(payload.new);
                    if (!updates.some(c => c.id === updatedCalc.id)) {
                        newCalcs = currentCalcs.map(c => c.id === updatedCalc.id ? updatedCalc : c);
                    }
                } else if (payload.eventType === 'DELETE') {
                    newCalcs = currentCalcs.filter(c => c.id !== payload.old.id);
                }
                if (newCalcs !== currentCalcs) localStorage.setItem('calculations', JSON.stringify(newCalcs));
                return newCalcs;
            });
          }).subscribe();

        return () => {
          supabase!.removeChannel(txChannel);
          supabase!.removeChannel(calcChannel);
        };
    }, [isSupabaseConfigured]);
    
    const handleSync = useCallback(async () => {
        if (!isOnline || isSyncing || !isSupabaseConfigured) return;
        
        setIsSyncing(true);
        addNotification('Syncing offline changes...', 'info');

        // Get all queues
        const txCreates = getQueue<Transaction>(SYNC_QUEUES.CREATES);
        const txUpdates = getQueue<Transaction>(SYNC_QUEUES.UPDATES);
        const txDeletes = getQueue<string>(SYNC_QUEUES.DELETES);
        const calcCreates = getQueue<Calculation>(CALC_SYNC_QUEUES.CREATES);
        const calcUpdates = getQueue<Calculation>(CALC_SYNC_QUEUES.UPDATES);
        const calcDeletes = getQueue<string>(CALC_SYNC_QUEUES.DELETES);
        
        let hadErrors = false;
        
        try {
            // Process Transactions
            if (txDeletes.length > 0) await supabase!.from('transactions').delete().in('id', txDeletes);
            if (txCreates.length > 0) await supabase!.from('transactions').insert(txCreates.map(toSupabase));
            // Simplified update without conflict resolution for now
            if (txUpdates.length > 0) await supabase!.from('transactions').upsert(txUpdates.map(toSupabase));

            // Process Calculations
            if (calcDeletes.length > 0) await supabase!.from('calculations').delete().in('id', calcDeletes);
            if (calcCreates.length > 0) await supabase!.from('calculations').insert(calcCreates.map(toSupabaseCalc));
            if (calcUpdates.length > 0) await supabase!.from('calculations').upsert(calcUpdates.map(toSupabaseCalc));

            clearQueues();
            addNotification('Sync successful!', 'success');

        } catch (error: any) {
            hadErrors = true;
            console.error("Sync error:", error.message || error);
            addNotification(`Sync failed. Some changes could not be saved. Error: ${error.message}`, 'error');
        }
        
        await fetchFromServerAndCache();
        setIsSyncing(false);
    }, [isOnline, isSyncing, fetchFromServerAndCache, clearQueues, addNotification, isSupabaseConfigured, setQueue]);

    const handleResolveConflict = async (chosenVersion: Transaction, choice: 'local' | 'server') => {
        const conflict = conflicts.find(c => c.local.id === chosenVersion.id || c.server.id === chosenVersion.id);
        if (!conflict) return;
    
        if (choice === 'local') {
            addNotification(`Overwriting server with your version for ${chosenVersion.customerName}...`, 'info');
            const { error } = await supabase!.from('transactions').upsert(toSupabase(chosenVersion));
            if (error) {
                addNotification(`Failed to save your version: ${error.message}`, 'error');
                return; 
            }
            addNotification('Your version was saved to the server.', 'success');
        } else { // 'server'
            addNotification(`Keeping server version for ${chosenVersion.customerName}. Your offline changes are discarded.`, 'success');
        }
        
        const updates = getQueue<Transaction>(SYNC_QUEUES.UPDATES);
        setQueue(SYNC_QUEUES.UPDATES, updates.filter(t => t.id !== chosenVersion.id));
        setConflicts(prev => prev.filter(c => c.local.id !== chosenVersion.id));
        
        await fetchFromServerAndCache();
    };

    useEffect(() => {
        if (isOnline && unsyncedCount > 0 && !isSyncing) {
            handleSync();
        }
    }, [isOnline, unsyncedCount, isSyncing, handleSync]);

    // Reminder and notification permission logic
    const requestNotificationPermission = async () => {
        if (!('Notification' in window)) {
            addNotification('This browser does not support desktop notifications.', 'error');
            return;
        }
        const permission = await Notification.requestPermission();
        setNotificationPermission(permission);
        if (permission === 'granted') {
            addNotification('Notifications enabled!', 'success');
             new Notification('Chakki Hisab Notifications', {
                body: 'You will now receive reminders and alerts.',
            });
        } else {
            addNotification('Notifications were not enabled. You can change this in your browser settings.', 'info');
        }
    };
    
    // Periodically check permission status in case user changes it in browser settings
    useEffect(() => {
        const interval = setInterval(() => {
            if (Notification.permission !== notificationPermission) {
                setNotificationPermission(Notification.permission);
            }
        }, 3000);
        return () => clearInterval(interval);
    }, [notificationPermission]);

    // Save reminders to localStorage
    useEffect(() => {
        localStorage.setItem('reminders', JSON.stringify(reminders));
    }, [reminders]);

    // Check for due reminders every minute
    useEffect(() => {
        const interval = setInterval(() => {
            const now = new Date();
            const dueReminders = reminders.filter(r => new Date(r.remindAt) <= now);

            if (dueReminders.length > 0) {
                dueReminders.forEach(reminder => {
                    const transaction = transactions.find(t => t.id === reminder.transactionId);
                    if (transaction && transaction.paymentStatus !== 'paid') {
                        const balanceDue = transaction.total - (transaction.paidAmount || 0);
                        const notificationBody = `Reminder: ${transaction.customerName} has an outstanding balance of ${formatCurrency(balanceDue)}.`;
                        
                        const triggerNotification = (attempt: number) => {
                            if (notificationPermission === 'granted') {
                                new Notification('Transaction Reminder', {
                                    body: notificationBody,
                                    tag: `${transaction.id}-${attempt}`,
                                });
                            } else {
                                addNotification(notificationBody, 'info');
                            }

                            if (settings.soundEnabled) {
                                playNotificationSound();
                            }
                        };
                        triggerNotification(1);
                        setTimeout(() => triggerNotification(2), 30000);
                    }
                });
                const dueReminderIds = new Set(dueReminders.map(r => r.id));
                setReminders(prev => prev.filter(r => !dueReminderIds.has(r.id)));
            }
        }, 60000);
        
        return () => clearInterval(interval);
    }, [reminders, transactions, notificationPermission, addNotification, settings.soundEnabled]);


    const handleOpenReminderModal = (transaction: Transaction) => {
        setTransactionForReminder(transaction);
        setIsReminderModalOpen(true);
    };

    const handleSetReminder = (transactionId: string, remindAt: Date) => {
        const newReminder: Reminder = {
            id: crypto.randomUUID(),
            transactionId,
            remindAt: remindAt.toISOString(),
        };
        setReminders(prev => [...prev.filter(r => r.transactionId !== transactionId), newReminder]);
        addNotification('Reminder set successfully!', 'success');
        setIsReminderModalOpen(false);
    };

    const handleBulkSetReminders = (transactionIds: string[], remindAt: Date) => {
        const newReminders = transactionIds.map(id => ({
            id: crypto.randomUUID(),
            transactionId: id,
            remindAt: remindAt.toISOString(),
        }));
        setReminders(prev => [
            ...prev.filter(r => !transactionIds.includes(r.transactionId)),
            ...newReminders,
        ]);
        addNotification(`${transactionIds.length} reminders set successfully!`, 'success');
        setIsReminderModalOpen(false);
    };
    
    const dateFilteredTransactions = useMemo(() => {
        const sorted = [...transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        const now = new Date();
        const { period, startDate, endDate } = timeFilter;
        if (period === 'all') return sorted;
        if (period === 'custom') {
             if (!startDate || !endDate) return [];
            const start = new Date(startDate); start.setHours(0, 0, 0, 0);
            const end = new Date(endDate); end.setHours(23, 59, 59, 999);
            if (isNaN(start.getTime()) || isNaN(end.getTime())) return [];
            return sorted.filter(t => {
                const transactionDate = new Date(t.date);
                return transactionDate >= start && transactionDate <= end;
            });
        }
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        if (period === 'today') {
            return sorted.filter(t => {
                const transactionDate = new Date(t.date);
                return transactionDate >= today && transactionDate < new Date(today.getTime() + 24 * 60 * 60 * 1000);
            });
        }
        if (period === 'week') {
            const startOfWeek = new Date(today);
            startOfWeek.setDate(today.getDate() - today.getDay());
            return sorted.filter(t => new Date(t.date) >= startOfWeek);
        }
        if (period === 'month') {
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            return sorted.filter(t => new Date(t.date) >= startOfMonth);
        }
        return sorted;
    }, [transactions, timeFilter]);

    const filteredTransactions = useMemo(() => {
        let result = dateFilteredTransactions;

        if (statusFilter.length > 0) {
            result = result.filter(transaction => statusFilter.includes(transaction.paymentStatus));
        }

        if (!searchQuery) return result;
        
        const lowercasedQuery = searchQuery.toLowerCase();
        return result.filter(transaction =>
            transaction.customerName.toLowerCase().includes(lowercasedQuery) ||
            transaction.item.toLowerCase().includes(lowercasedQuery)
        );
    }, [dateFilteredTransactions, searchQuery, statusFilter]);


    const handleAddTransaction = useCallback(async (transaction: Omit<Transaction, 'id' | 'updatedAt'>) => {
        const newTransaction: Transaction = {
            ...transaction,
            id: crypto.randomUUID(),
        };
        const newTransactions = [newTransaction, ...transactions];
        setTransactions(newTransactions);
        localStorage.setItem('transactions', JSON.stringify(newTransactions));
        setIsModalOpen(false);
        addNotification(`Transaction for ${transaction.customerName} added!`, 'success');

        if (isOnline && isSupabaseConfigured) {
            try {
                const { error } = await supabase!.from('transactions').insert(toSupabase(newTransaction));
                if (error) throw error;
            } catch (error: any) {
                addNotification('Network error. Transaction saved for offline sync.', 'info');
                setQueue(SYNC_QUEUES.CREATES, [...getQueue<Transaction>(SYNC_QUEUES.CREATES), newTransaction]);
            }
        } else {
            setQueue(SYNC_QUEUES.CREATES, [...getQueue<Transaction>(SYNC_QUEUES.CREATES), newTransaction]);
        }
    }, [isOnline, transactions, setQueue, addNotification, isSupabaseConfigured]);

    const handleUpdateTransaction = useCallback(async (updatedTransaction: Transaction) => {
        const newTransactions = transactions.map(t => t.id === updatedTransaction.id ? updatedTransaction : t);
        setTransactions(newTransactions);
        localStorage.setItem('transactions', JSON.stringify(newTransactions));
        setEditingTransaction(null);
        setIsModalOpen(false);
        addNotification(`Transaction for ${updatedTransaction.customerName} updated!`, 'success');

        const creates = getQueue<Transaction>(SYNC_QUEUES.CREATES);
        if (creates.some(t => t.id === updatedTransaction.id)) {
            setQueue(SYNC_QUEUES.CREATES, creates.map(t => t.id === updatedTransaction.id ? updatedTransaction : t));
            return;
        }

        if (isOnline && isSupabaseConfigured) {
            try {
                await supabase!.from('transactions').update(toSupabase(updatedTransaction)).eq('id', updatedTransaction.id);
            } catch (error) {
                addNotification('Network error. Update saved for offline sync.', 'info');
                setQueue(SYNC_QUEUES.UPDATES, [...getQueue<Transaction>(SYNC_QUEUES.UPDATES), updatedTransaction]);
            }
        } else {
             setQueue(SYNC_QUEUES.UPDATES, [...getQueue<Transaction>(SYNC_QUEUES.UPDATES), updatedTransaction]);
        }
    }, [isOnline, transactions, setQueue, addNotification, isSupabaseConfigured]);
    
    const openDeleteModal = (id: string) => setDeletingTransactionId(id);
    const closeDeleteModal = () => setDeletingTransactionId(null);

    const handleDeleteTransaction = useCallback(async () => {
        if (!deletingTransactionId) return;
        const idToDelete = deletingTransactionId;
        
        setTransactions(prev => prev.filter(t => t.id !== idToDelete));
        localStorage.setItem('transactions', JSON.stringify(transactions.filter(t => t.id !== idToDelete)));
        addNotification(`Transaction deleted!`, 'success');
        
        const creates = getQueue<Transaction>(SYNC_QUEUES.CREATES);
        if (creates.some(t => t.id === idToDelete)) {
            setQueue(SYNC_QUEUES.CREATES, creates.filter(t => t.id !== idToDelete));
        } else {
            setQueue(SYNC_QUEUES.DELETES, [...getQueue<string>(SYNC_QUEUES.DELETES), idToDelete]);
        }

        if (isOnline && isSupabaseConfigured) {
            try {
                await supabase!.from('transactions').delete().eq('id', idToDelete);
            } catch (error) {
                addNotification('Network error. Deletion saved for offline sync.', 'info');
            }
        }
        setDeletingTransactionId(null);
    }, [isOnline, transactions, deletingTransactionId, setQueue, addNotification, isSupabaseConfigured]);

    // Calculation Handlers
    const handleAddCalculation = useCallback(async (calculation: Omit<Calculation, 'id' | 'createdAt' | 'updatedAt'>) => {
        const newCalculation: Calculation = {
            ...calculation,
            id: crypto.randomUUID(),
            createdAt: new Date().toISOString(),
        };
        const newCalculations = [newCalculation, ...calculations];
        setCalculations(newCalculations);
        localStorage.setItem('calculations', JSON.stringify(newCalculations));
        addNotification(`Calculation for ${calculation.customerName} saved!`, 'success');
        
        if (isOnline && isSupabaseConfigured) {
            try {
                await supabase!.from('calculations').insert(toSupabaseCalc(newCalculation));
            } catch (error) {
                addNotification('Network error. Calculation saved for offline sync.', 'info');
                setQueue(CALC_SYNC_QUEUES.CREATES, [...getQueue<Calculation>(CALC_SYNC_QUEUES.CREATES), newCalculation]);
            }
        } else {
            setQueue(CALC_SYNC_QUEUES.CREATES, [...getQueue<Calculation>(CALC_SYNC_QUEUES.CREATES), newCalculation]);
        }
    }, [isOnline, calculations, setQueue, addNotification, isSupabaseConfigured]);

    const handleUpdateCalculation = useCallback(async (updatedCalculation: Calculation) => {
        const newCalculations = calculations.map(c => c.id === updatedCalculation.id ? updatedCalculation : c);
        setCalculations(newCalculations);
        localStorage.setItem('calculations', JSON.stringify(newCalculations));
        addNotification(`Calculation for ${updatedCalculation.customerName} updated!`, 'success');

        const creates = getQueue<Calculation>(CALC_SYNC_QUEUES.CREATES);
        if (creates.some(c => c.id === updatedCalculation.id)) {
            setQueue(CALC_SYNC_QUEUES.CREATES, creates.map(c => c.id === updatedCalculation.id ? updatedCalculation : c));
            return;
        }

        if (isOnline && isSupabaseConfigured) {
            try {
                await supabase!.from('calculations').update(toSupabaseCalc(updatedCalculation)).eq('id', updatedCalculation.id);
            } catch (error) {
                addNotification('Network error. Calculation update saved for offline sync.', 'info');
                setQueue(CALC_SYNC_QUEUES.UPDATES, [...getQueue<Calculation>(CALC_SYNC_QUEUES.UPDATES), updatedCalculation]);
            }
        } else {
            setQueue(CALC_SYNC_QUEUES.UPDATES, [...getQueue<Calculation>(CALC_SYNC_QUEUES.UPDATES), updatedCalculation]);
        }
    }, [isOnline, calculations, setQueue, addNotification, isSupabaseConfigured]);

    const handleDeleteCalculation = useCallback(async (idToDelete: string) => {
        setCalculations(prev => prev.filter(c => c.id !== idToDelete));
        localStorage.setItem('calculations', JSON.stringify(calculations.filter(c => c.id !== idToDelete)));
        addNotification(`Calculation deleted!`, 'success');

        const creates = getQueue<Calculation>(CALC_SYNC_QUEUES.CREATES);
        if (creates.some(c => c.id === idToDelete)) {
            setQueue(CALC_SYNC_QUEUES.CREATES, creates.filter(c => c.id !== idToDelete));
        } else {
            setQueue(CALC_SYNC_QUEUES.DELETES, [...getQueue<string>(CALC_SYNC_QUEUES.DELETES), idToDelete]);
        }

        if (isOnline && isSupabaseConfigured) {
            try {
                await supabase!.from('calculations').delete().eq('id', idToDelete);
            } catch (error) {
                 addNotification('Network error. Deletion saved for offline sync.', 'info');
            }
        }
    }, [isOnline, calculations, setQueue, addNotification, isSupabaseConfigured]);


    const handleBulkDelete = useCallback(async (idsToDelete: string[]) => {
        const newTransactions = transactions.filter(t => !idsToDelete.includes(t.id));
        setTransactions(newTransactions);
        localStorage.setItem('transactions', JSON.stringify(newTransactions));
        addNotification(`${idsToDelete.length} transactions deleted!`, 'success');

        const creates = getQueue<Transaction>(SYNC_QUEUES.CREATES);
        const updates = getQueue<Transaction>(SYNC_QUEUES.UPDATES);
        const deletes = getQueue<string>(SYNC_QUEUES.DELETES);

        const finalCreates = creates.filter(t => !idsToDelete.includes(t.id));
        const finalUpdates = updates.filter(t => !idsToDelete.includes(t.id));
        const finalDeletes = [...deletes, ...idsToDelete.filter(id => !creates.some(c => c.id === id))];
        
        setQueue(SYNC_QUEUES.CREATES, finalCreates);
        setQueue(SYNC_QUEUES.UPDATES, finalUpdates);
        setQueue(SYNC_QUEUES.DELETES, Array.from(new Set(finalDeletes))); // Ensure uniqueness

        if (isOnline && isSupabaseConfigured) {
            try {
                const { error } = await supabase!.from('transactions').delete().in('id', idsToDelete);
                if (error) throw error;
            } catch (error: any) {
                 addNotification('Network error. Deletions saved for offline sync.', 'info');
            }
        }
    }, [transactions, setQueue, addNotification, isOnline, isSupabaseConfigured]);

    const handleBulkUpdate = useCallback(async (idsToUpdate: string[], newStatus: Transaction['paymentStatus']) => {
        const updatedTransactions = transactions.map(t => {
            if (idsToUpdate.includes(t.id)) {
                let paidAmount = t.paidAmount;
                if (newStatus === 'paid') {
                    paidAmount = t.total;
                } else if (newStatus === 'unpaid') {
                    paidAmount = 0;
                }
                return { ...t, paymentStatus: newStatus, paidAmount };
            }
            return t;
        });
        
        setTransactions(updatedTransactions);
        localStorage.setItem('transactions', JSON.stringify(updatedTransactions));
        addNotification(`${idsToUpdate.length} transactions updated to "${newStatus}"!`, 'success');

        const creates = getQueue<Transaction>(SYNC_QUEUES.CREATES);
        const updates = getQueue<Transaction>(SYNC_QUEUES.UPDATES);

        const newCreates = creates.map(t => idsToUpdate.includes(t.id) ? updatedTransactions.find(ut => ut.id === t.id)! : t);
        
        const updatesFromState = updatedTransactions.filter(t => idsToUpdate.includes(t.id) && !creates.some(c => c.id === t.id));
        const newUpdates = [...updates.filter(t => !idsToUpdate.includes(t.id)), ...updatesFromState];

        setQueue(SYNC_QUEUES.CREATES, newCreates);
        setQueue(SYNC_QUEUES.UPDATES, newUpdates);

        if (isOnline && isSupabaseConfigured) {
            try {
                const { error } = await supabase!.from('transactions').upsert(updatesFromState.map(toSupabase));
                if (error) throw error;
            } catch (error: any) {
                 addNotification('Network error. Updates saved for offline sync.', 'info');
            }
        }
    }, [transactions, setQueue, addNotification, isOnline, isSupabaseConfigured]);

    const openModal = () => setIsModalOpen(true);
    const closeModal = () => {
        setIsModalOpen(false);
        setEditingTransaction(null);
        setPrefilledData(null);
    };

    const handleEditTransaction = (transaction: Transaction) => {
        setEditingTransaction(transaction);
        openModal();
    };

    return (
        <div className="flex min-h-screen bg-slate-900">
            <Sidebar 
                isOpen={isSidebarOpen}
                setIsOpen={setIsSidebarOpen}
                currentPage={currentPage}
                setCurrentPage={setCurrentPage}
                isEditMode={isEditMode}
                onToggleEditMode={toggleEditMode}
            />
            <div className="flex-1 lg:pl-64">
                <Header 
                    onMenuClick={() => setIsSidebarOpen(true)}
                    isOnline={isOnline}
                    isSyncing={isSyncing}
                    unsyncedCount={unsyncedCount}
                    onSync={handleSync}
                    isSupabaseConfigured={isSupabaseConfigured}
                    isEditMode={isEditMode}
                />
                <main className="container mx-auto p-4 md:p-6 lg:p-8">
                     {isLoading ? (
                        <div className="flex justify-center items-center h-64">
                            {/* The loader is now in index.html, so this part can be empty or a lighter spinner if needed after initial load */}
                        </div>
                    ) : (
                        <div className="animate-[fadeIn_0.3s_ease-out]">
                             <style>{`@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }`}</style>
                            {currentPage === 'transactions' && (
                                <TransactionsPage
                                    transactions={filteredTransactions}
                                    onEdit={handleEditTransaction}
                                    onDelete={openDeleteModal}
                                    openModal={openModal}
                                    timeFilter={timeFilter}
                                    setTimeFilter={setTimeFilter}
                                    searchQuery={searchQuery}
                                    setSearchQuery={setSearchQuery}
                                    statusFilter={statusFilter}
                                    setStatusFilter={setStatusFilter}
                                    unsyncedIds={unsyncedIds}
                                    onSetReminder={handleOpenReminderModal}
                                    reminders={reminders}
                                    onBulkDelete={handleBulkDelete}
                                    onBulkUpdate={handleBulkUpdate}
                                    onBulkSetReminder={handleBulkSetReminders}
                                    isEditMode={isEditMode}
                                />
                            )}
                            {currentPage === 'dashboard' && (
                                <DashboardPage
                                    transactions={dateFilteredTransactions}
                                    timeFilter={timeFilter}
                                    setTimeFilter={setTimeFilter}
                                    isEditMode={isEditMode}
                                />
                            )}
                            {currentPage === 'calculator' && (
                                <CalculatorPage 
                                    isEditMode={isEditMode}
                                    calculations={calculations}
                                    onAddCalculation={handleAddCalculation}
                                    onUpdateCalculation={handleUpdateCalculation}
                                    onDeleteCalculation={handleDeleteCalculation}
                                />
                            )}
                             {currentPage === 'settings' && (
                                <SettingsPage
                                    currentSettings={settings}
                                    onSave={handleSaveSettings}
                                    notificationPermission={notificationPermission}
                                    onRequestNotifications={requestNotificationPermission}
                                    isEditMode={isEditMode}
                                />
                             )}
                             {currentPage === 'reports' && (
                                <ReportsPage transactions={transactions} />
                             )}
                        </div>
                    )}
                </main>
            </div>

            <TransactionForm
                isOpen={isModalOpen}
                onClose={closeModal}
                onSubmit={editingTransaction ? handleUpdateTransaction : handleAddTransaction}
                initialData={editingTransaction}
                prefilledData={prefilledData}
            />
            <ConfirmationModal
                isOpen={!!deletingTransactionId}
                onClose={closeDeleteModal}
                onConfirm={handleDeleteTransaction}
                title="Delete Transaction"
                message="Are you sure you want to delete this transaction? This action cannot be undone."
            />
            <ConflictResolutionModal
                isOpen={conflicts.length > 0}
                conflicts={conflicts}
                onResolve={handleResolveConflict}
            />
            <ReminderModal
                isOpen={isReminderModalOpen}
                onClose={() => setIsReminderModalOpen(false)}
                onSetReminder={handleSetReminder}
                transaction={transactionForReminder}
            />
        </div>
    );
};

export default App;


import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import type { Transaction, Reminder, Settings } from './types';
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
import { speak } from './utils/speech';
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

// Map snake_case from DB to camelCase for UI
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

// Map camelCase from UI to snake_case for DB
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
  // Do not send `updated_at`. The database trigger will handle it.
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
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
    const [prefilledData, setPrefilledData] = useState<Partial<Transaction> | null>(null);
    const [timeFilter, setTimeFilter] = useState<TimeFilter>({ period: 'all' });
    const [currentPage, setCurrentPage] = useState<Page>('dashboard');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [deletingTransactionId, setDeletingTransactionId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [isEditMode, setIsEditMode] = useState(false);
    const editModeTimeoutRef = useRef<number | null>(null);

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
    });

    useEffect(() => {
        const savedSettings = localStorage.getItem('app-settings');
        if (savedSettings) {
             try {
                const parsed = JSON.parse(savedSettings);
                if (typeof parsed === 'object' && parsed !== null) {
                    setSettings(prev => ({ ...prev, ...parsed }));
                }
            } catch (error) {
                console.error("Failed to parse settings from cache:", error);
                localStorage.removeItem('app-settings');
            }
        }
    }, []);

    const handleSaveSettings = (newSettings: Settings) => {
        setSettings(newSettings);
        localStorage.setItem('app-settings', JSON.stringify(newSettings));
        addNotification('Settings saved!', 'success');
    };

    const checkUnsyncedChanges = useCallback(() => {
        const creates = getQueue<Transaction>(SYNC_QUEUES.CREATES);
        const updates = getQueue<Transaction>(SYNC_QUEUES.UPDATES);
        const deletes = getQueue<string>(SYNC_QUEUES.DELETES);
        setUnsyncedCount(creates.length + updates.length + deletes.length);
        setUnsyncedIds(new Set([...creates.map(t => t.id), ...updates.map(t => t.id)]));
    }, []);

    const setQueue = useCallback(<T,>(key: string, queue: T[]) => {
        localStorage.setItem(key, JSON.stringify(queue));
        checkUnsyncedChanges();
    }, [checkUnsyncedChanges]);
    
    const clearQueues = useCallback(() => {
        localStorage.removeItem(SYNC_QUEUES.CREATES);
        localStorage.removeItem(SYNC_QUEUES.UPDATES);
        localStorage.removeItem(SYNC_QUEUES.DELETES);
        checkUnsyncedChanges();
    }, [checkUnsyncedChanges]);

    const loadFromCache = useCallback(() => {
        const saved = localStorage.getItem('transactions');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed)) {
                    setTransactions(parsed);
                } else {
                    setTransactions([]);
                    localStorage.removeItem('transactions');
                }
            } catch (error) {
                console.error("Failed to parse transactions from cache:", error);
                setTransactions([]);
                localStorage.removeItem('transactions');
            }
        } else {
            setTransactions([]);
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
            const { data, error } = await supabase!
                .from('transactions')
                .select('*')
                .order('date', { ascending: false });
            if (error) throw error;
            const mappedData = data.map(fromSupabase);
            setTransactions(mappedData);
            localStorage.setItem('transactions', JSON.stringify(mappedData));
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

        const channel = supabase!.channel('public:transactions')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, payload => {
            console.log('Real-time change received:', payload);
            
            const handleRealtimeUpdate = (txs: Transaction[]) => {
                const creates = getQueue<Transaction>(SYNC_QUEUES.CREATES);
                const updates = getQueue<Transaction>(SYNC_QUEUES.UPDATES);

                if (payload.eventType === 'INSERT') {
                    const newTx = fromSupabase(payload.new);
                    if (creates.some(t => t.id === newTx.id) || txs.some(t => t.id === newTx.id)) return txs;
                    
                    addNotification(`New transaction added from another device.`, 'info');
                    return [newTx, ...txs];
                }

                if (payload.eventType === 'UPDATE') {
                    const updatedTx = fromSupabase(payload.new);
                    if (updates.some(t => t.id === updatedTx.id)) {
                        addNotification(`Remote update for ${updatedTx.customerName} conflicts with your changes. Sync to resolve.`, 'error');
                        return txs; 
                    }
                    addNotification(`Transaction for ${updatedTx.customerName} updated remotely.`, 'info');
                    return txs.map(t => t.id === updatedTx.id ? updatedTx : t);
                }

                if (payload.eventType === 'DELETE') {
                    const deletedId = payload.old.id;
                    addNotification(`A transaction was deleted from another device.`, 'info');
                    return txs.filter(t => t.id !== deletedId);
                }

                return txs;
            };

            setTransactions(currentTxs => {
                const newTxs = handleRealtimeUpdate(currentTxs);
                if (newTxs !== currentTxs) {
                    localStorage.setItem('transactions', JSON.stringify(newTxs));
                }
                return newTxs;
            });
          })
          .subscribe();

        return () => {
          supabase!.removeChannel(channel);
        };
    }, [isSupabaseConfigured, addNotification]);
    
    const handleSync = useCallback(async () => {
        if (!isOnline || isSyncing || !isSupabaseConfigured) return;
        
        setIsSyncing(true);
        addNotification('Syncing offline changes...', 'info');

        const creates = getQueue<Transaction>(SYNC_QUEUES.CREATES);
        const updates = getQueue<Transaction>(SYNC_QUEUES.UPDATES);
        const deletes = getQueue<string>(SYNC_QUEUES.DELETES);
        
        let hadErrors = false;
        
        try {
            // 1. Process Deletes
            if (deletes.length > 0) {
                const { error } = await supabase!.from('transactions').delete().in('id', deletes);
                if (error) {
                    hadErrors = true;
                    throw new Error(`Sync deletes failed: ${error.message}`);
                }
            }
            
            // 2. Process Creates
            if (creates.length > 0) {
                const { error } = await supabase!.from('transactions').insert(creates.map(toSupabase));
                 if (error) {
                    hadErrors = true;
                    throw new Error(`Sync creates failed: ${error.message}`);
                }
            }

            // 3. Process Updates with conflict detection
            const conflictsFound: { local: Transaction, server: Transaction }[] = [];
            if (updates.length > 0) {
                const updatesToPush: Transaction[] = [];
                
                for (const localUpdate of updates) {
                     const { data: serverTx, error: fetchError } = await supabase!
                        .from('transactions')
                        .select('id, updated_at')
                        .eq('id', localUpdate.id)
                        .single();

                    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = row not found
                        throw new Error(`Conflict check failed for ${localUpdate.id}: ${fetchError.message}`);
                    }
                    
                    const serverUpdatedAt = serverTx ? new Date(serverTx.updated_at).getTime() : 0;
                    const localBaseUpdatedAt = localUpdate.updatedAt ? new Date(localUpdate.updatedAt).getTime() : 0;

                    if (!serverTx || serverUpdatedAt > localBaseUpdatedAt) {
                        // CONFLICT!
                        const { data: serverFullTx, error: serverFullError } = await supabase!
                            .from('transactions')
                            .select('*')
                            .eq('id', localUpdate.id)
                            .single();
                        
                        if (serverFullError && serverFullError.code !== 'PGRST116') {
                             throw new Error(`Conflict data fetch failed for ${localUpdate.id}: ${serverFullError.message}`);
                        }
                        if (serverFullTx) {
                            conflictsFound.push({ local: localUpdate, server: fromSupabase(serverFullTx) });
                        } else {
                             conflictsFound.push({ local: localUpdate, server: { ...localUpdate, customerName: `${localUpdate.customerName} (Deleted on Server)` } });
                        }

                    } else {
                        // No conflict, add to batch update
                        updatesToPush.push(localUpdate);
                    }
                }

                if (updatesToPush.length > 0) {
                    const { error } = await supabase!.from('transactions').upsert(updatesToPush.map(toSupabase));
                    if (error) {
                        hadErrors = true;
                        throw new Error(`Sync updates failed: ${error.message}`);
                    }
                }

                if (conflictsFound.length > 0) {
                    setConflicts(conflictsFound);
                    const conflictedIds = new Set(conflictsFound.map(c => c.local.id));
                    const remainingUpdates = updates.filter(u => !conflictedIds.has(u.id));
                    setQueue(SYNC_QUEUES.UPDATES, remainingUpdates);
                    addNotification(`${conflictsFound.length} updates have conflicts. Please resolve them.`, 'error');
                }
            }

            if (!hadErrors && conflictsFound.length === 0) {
                clearQueues();
                addNotification('Sync successful!', 'success');
            }
        } catch (error: any) {
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
                        const speechMessage = `Reminder for ${transaction.customerName}. Amount due is ${balanceDue} rupees.`;
                        
                        if (notificationPermission === 'granted') {
                            new Notification('Transaction Reminder', {
                                body: notificationBody,
                                tag: transaction.id, // Avoid duplicate notifications for the same transaction
                            });
                        } else {
                            // Fallback to an in-app toast notification if permission isn't granted
                            addNotification(notificationBody, 'info');
                        }
                        if (settings.soundEnabled) {
                            speak(speechMessage);
                        }
                    }
                });
                
                // Remove all due reminders at once to avoid multiple re-renders in a loop
                const dueReminderIds = new Set(dueReminders.map(r => r.id));
                setReminders(prev => prev.filter(r => !dueReminderIds.has(r.id)));
            }
        }, 60000); // Check every minute
        
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
        // Remove any existing reminder for this transaction before adding a new one
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

        // Remove old reminders for these transactions and add the new ones
        setReminders(prev => [
            ...prev.filter(r => !transactionIds.includes(r.transactionId)),
            ...newReminders,
        ]);

        addNotification(`${transactionIds.length} reminders set successfully!`, 'success');
        setIsReminderModalOpen(false);
    };
    
    const resetEditModeTimer = useCallback(() => {
        if (editModeTimeoutRef.current) {
            clearTimeout(editModeTimeoutRef.current);
        }
        editModeTimeoutRef.current = window.setTimeout(() => {
            setIsEditMode(false);
        }, 120000); // 2 minutes
    }, []);

    useEffect(() => {
        if (isEditMode) {
            resetEditModeTimer();
            window.addEventListener('mousemove', resetEditModeTimer);
            window.addEventListener('keydown', resetEditModeTimer);
        } else {
            if (editModeTimeoutRef.current) {
                clearTimeout(editModeTimeoutRef.current);
            }
            window.removeEventListener('mousemove', resetEditModeTimer);
            window.removeEventListener('keydown', resetEditModeTimer);
        }

        return () => {
            window.removeEventListener('mousemove', resetEditModeTimer);
            window.removeEventListener('keydown', resetEditModeTimer);
            if (editModeTimeoutRef.current) {
                clearTimeout(editModeTimeoutRef.current);
            }
        };
    }, [isEditMode, resetEditModeTimer]);

    const toggleEditMode = () => {
        setIsEditMode(prev => !prev);
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
                console.error("Failed to add online, queueing for sync:", error.message);
                addNotification('Network error. Transaction saved for offline sync.', 'info');
                const creates = getQueue<Transaction>(SYNC_QUEUES.CREATES);
                setQueue(SYNC_QUEUES.CREATES, [...creates, newTransaction]);
            }
        } else {
            if (!isSupabaseConfigured) {
                addNotification('Supabase not configured. Transaction saved for offline sync.', 'info');
            }
            const creates = getQueue<Transaction>(SYNC_QUEUES.CREATES);
            setQueue(SYNC_QUEUES.CREATES, [...creates, newTransaction]);
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
        const isUnsyncedCreate = creates.some(t => t.id === updatedTransaction.id);

        if (isUnsyncedCreate) {
            const newCreates = creates.map(t => t.id === updatedTransaction.id ? updatedTransaction : t);
            setQueue(SYNC_QUEUES.CREATES, newCreates);
            return;
        }

        if (isOnline && isSupabaseConfigured) {
            try {
                const { error } = await supabase!.from('transactions').update(toSupabase(updatedTransaction)).eq('id', updatedTransaction.id);
                if (error) throw error;
            } catch (error: any) {
                console.error("Failed to update online, queueing for sync:", error.message);
                addNotification('Network error. Update saved for offline sync.', 'info');
                const updates = getQueue<Transaction>(SYNC_QUEUES.UPDATES);
                setQueue(SYNC_QUEUES.UPDATES, [...updates, updatedTransaction]);
            }
        } else {
             if (!isSupabaseConfigured) {
                addNotification('Supabase not configured. Update saved for offline sync.', 'info');
            }
            const updates = getQueue<Transaction>(SYNC_QUEUES.UPDATES);
            if (!updates.some(t => t.id === updatedTransaction.id)) {
                 setQueue(SYNC_QUEUES.UPDATES, [...updates, updatedTransaction]);
            }
        }
    }, [isOnline, transactions, setQueue, addNotification, isSupabaseConfigured]);
    
    const openDeleteModal = (id: string) => {
        setDeletingTransactionId(id);
    };

    const closeDeleteModal = () => {
        setDeletingTransactionId(null);
    };

    const handleDeleteTransaction = useCallback(async () => {
        if (!deletingTransactionId) return;
        
        const idToDelete = deletingTransactionId;
        const transactionToDelete = transactions.find(t => t.id === idToDelete);
        const newTransactions = transactions.filter(t => t.id !== idToDelete);
        setTransactions(newTransactions);
        localStorage.setItem('transactions', JSON.stringify(newTransactions));
        addNotification(`Transaction for ${transactionToDelete?.customerName || '...'} deleted!`, 'success');
        
        const creates = getQueue<Transaction>(SYNC_QUEUES.CREATES);
        const isUnsyncedCreate = creates.some(t => t.id === idToDelete);

        if (isUnsyncedCreate) {
            const newCreates = creates.filter(t => t.id !== idToDelete);
            setQueue(SYNC_QUEUES.CREATES, newCreates);
            setDeletingTransactionId(null);
            return;
        }

        const updates = getQueue<Transaction>(SYNC_QUEUES.UPDATES);
        const isUnsyncedUpdate = updates.some(t => t.id === idToDelete);
        if (isUnsyncedUpdate) {
            // Remove from updates, add to deletes
            const newUpdates = updates.filter(t => t.id !== idToDelete);
            setQueue(SYNC_QUEUES.UPDATES, newUpdates);
        }

        if (isOnline && isSupabaseConfigured) {
            try {
                const { error } = await supabase!.from('transactions').delete().eq('id', idToDelete);
                if (error) throw error;
            } catch (error: any) {
                console.error("Failed to delete online, queueing for sync:", error.message);
                addNotification('Network error. Deletion saved for offline sync.', 'info');
                const deletes = getQueue<string>(SYNC_QUEUES.DELETES);
                setQueue(SYNC_QUEUES.DELETES, [...deletes, idToDelete]);
            }
        } else {
             if (!isSupabaseConfigured) {
                addNotification('Supabase not configured. Deletion saved for offline sync.', 'info');
            }
            const deletes = getQueue<string>(SYNC_QUEUES.DELETES);
            if(!deletes.includes(idToDelete)) {
                setQueue(SYNC_QUEUES.DELETES, [...deletes, idToDelete]);
            }
        }
        
        setDeletingTransactionId(null);
    }, [isOnline, transactions, deletingTransactionId, setQueue, addNotification, isSupabaseConfigured]);


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
        <div className="flex min-h-screen bg-primary-50">
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
                />
                <main className="container mx-auto p-4 md:p-6 lg:p-8">
                     {isLoading ? (
                        <div className="flex justify-center items-center h-64">
                            {/* The loader is now in index.html, so this part can be empty or a lighter spinner if needed after initial load */}
                        </div>
                    ) : (
                        <>
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
                                    isEditMode={isEditMode}
                                    onSetReminder={handleOpenReminderModal}
                                    reminders={reminders}
                                    onBulkDelete={handleBulkDelete}
                                    onBulkUpdate={handleBulkUpdate}
                                    onBulkSetReminder={handleBulkSetReminders}
                                />
                            )}
                            {currentPage === 'dashboard' && (
                                <DashboardPage
                                    transactions={dateFilteredTransactions}
                                    timeFilter={timeFilter}
                                    setTimeFilter={setTimeFilter}
                                />
                            )}
                            {currentPage === 'calculator' && (
                                <CalculatorPage isEditMode={isEditMode} />
                            )}
                             {currentPage === 'settings' && (
                                <SettingsPage
                                    currentSettings={settings}
                                    onSave={handleSaveSettings}
                                    isEditMode={isEditMode}
                                    notificationPermission={notificationPermission}
                                    onRequestNotifications={requestNotificationPermission}
                                />
                             )}
                             {currentPage === 'reports' && (
                                <ReportsPage transactions={transactions} />
                             )}
                        </>
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
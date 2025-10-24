import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import type { Transaction } from './types';
import Header from './components/Header';
import TransactionForm from './components/TransactionForm';
import DashboardPage from './pages/DashboardPage';
import TransactionsPage from './pages/TransactionsPage';
import CalculatorPage from './pages/CalculatorPage';
import Sidebar from './components/Sidebar';
import ConfirmationModal from './components/ConfirmationModal';
import { supabase } from './utils/supabase';
import { useNotifier } from './context/NotificationContext';
import { InformationCircleIcon } from './components/icons/InformationCircleIcon';

export type TimePeriod = 'today' | 'week' | 'month' | 'all' | 'custom';
export type Page = 'transactions' | 'dashboard' | 'calculator';
export type TimeFilter = {
    period: TimePeriod;
    startDate?: string;
    endDate?: string;
}

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
  // Do not send `updated_at`. The database trigger will handle it.
});

const getQueue = <T,>(key: string): T[] => {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : [];
};


const App: React.FC = () => {
    const { addNotification } = useNotifier();
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
    const [prefilledData, setPrefilledData] = useState<Partial<Transaction> | null>(null);
    const [timeFilter, setTimeFilter] = useState<TimeFilter>({ period: 'all' });
    const [currentPage, setCurrentPage] = useState<Page>('transactions');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [deletingTransactionId, setDeletingTransactionId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [isEditMode, setIsEditMode] = useState(false);
    const editModeTimeoutRef = useRef<number | null>(null);

    // New states for online/offline sync
    const [isOnline, setIsOnline] = useState<boolean>(() => navigator.onLine);
    const [unsyncedCount, setUnsyncedCount] = useState<number>(0);
    const [isSyncing, setIsSyncing] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isSupabaseConfigured] = useState<boolean>(!!supabase);
    const [unsyncedIds, setUnsyncedIds] = useState<Set<string>>(new Set());
    const [conflictedIds, setConflictedIds] = useState<Set<string>>(new Set());

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
        setTransactions(saved ? JSON.parse(saved) : []);
    }, []);

    const loadInitialData = useCallback(async () => {
        setIsLoading(true);
        if (navigator.onLine) {
            if (!isSupabaseConfigured) {
                addNotification('Supabase not configured. Working in offline mode.', 'info');
                loadFromCache();
                setIsLoading(false);
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
                console.error("Error fetching from Supabase, loading from cache:", error.message || error);
                addNotification(`Failed to fetch data: ${error.message}. Working in offline mode.`, 'error');
                loadFromCache();
            }
        } else {
            loadFromCache();
        }
        setIsLoading(false);
    }, [loadFromCache, addNotification, isSupabaseConfigured]);
    
    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        loadInitialData();
        checkUnsyncedChanges();

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [loadInitialData, checkUnsyncedChanges]);
    
    const handleSync = useCallback(async () => {
        if (!isOnline || isSyncing || !isSupabaseConfigured) return;
        
        setIsSyncing(true);
        setConflictedIds(new Set()); // Clear previous conflicts
        addNotification('Syncing offline changes...', 'info');

        const creates = getQueue<Transaction>(SYNC_QUEUES.CREATES);
        const updates = getQueue<Transaction>(SYNC_QUEUES.UPDATES);
        const deletes = getQueue<string>(SYNC_QUEUES.DELETES);
        
        let hadErrors = false;
        const conflictedUpdates: Transaction[] = [];

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
                        // CONFLICT! The server version is newer or was deleted. Discard local change.
                        conflictedUpdates.push(localUpdate);
                    } else {
                        // No conflict, add to batch update
                        updatesToPush.push(localUpdate);
                    }
                }

                if (updatesToPush.length > 0) {
                    // Use upsert for the non-conflicted batch
                    const { error } = await supabase!.from('transactions').upsert(updatesToPush.map(toSupabase));
                    if (error) {
                        hadErrors = true;
                        throw new Error(`Sync updates failed: ${error.message}`);
                    }
                }

                if (conflictedUpdates.length > 0) {
                    setConflictedIds(new Set(conflictedUpdates.map(t => t.id)));
                    addNotification(`${conflictedUpdates.length} updates had conflicts and were discarded. The latest data is now shown.`, 'error');
                }
            }

            if (!hadErrors) {
                clearQueues();
                console.log("Sync successful!");
                if (conflictedUpdates.length === 0) {
                    addNotification('Sync successful!', 'success');
                }
            }
        } catch (error: any) {
            console.error("Sync error:", error.message || error);
            addNotification(`Sync failed. Some changes could not be saved. Error: ${error.message}`, 'error');
        }
        
        await loadInitialData();
        setIsSyncing(false);
    }, [isOnline, isSyncing, loadInitialData, clearQueues, addNotification, isSupabaseConfigured]);

    // Auto-sync when coming online with pending changes
    useEffect(() => {
        if (isOnline && unsyncedCount > 0 && !isSyncing) {
            handleSync();
        }
    }, [isOnline, unsyncedCount, isSyncing, handleSync]);
    
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
        if (!searchQuery) return dateFilteredTransactions;
        const lowercasedQuery = searchQuery.toLowerCase();
        return dateFilteredTransactions.filter(transaction =>
            transaction.customerName.toLowerCase().includes(lowercasedQuery) ||
            transaction.item.toLowerCase().includes(lowercasedQuery)
        );
    }, [dateFilteredTransactions, searchQuery]);


    const handleAddTransaction = useCallback(async (transaction: Omit<Transaction, 'id' | 'date' | 'updatedAt'>) => {
        const newTransaction: Transaction = {
            ...transaction,
            id: crypto.randomUUID(),
            date: new Date().toISOString(),
        };
        const newTransactions = [newTransaction, ...transactions];
        setTransactions(newTransactions);
        localStorage.setItem('transactions', JSON.stringify(newTransactions));
        setIsModalOpen(false);
        addNotification('Transaction added successfully!', 'success');

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
        addNotification('Transaction updated successfully!', 'success');

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
        const newTransactions = transactions.filter(t => t.id !== idToDelete);
        setTransactions(newTransactions);
        localStorage.setItem('transactions', JSON.stringify(newTransactions));
        addNotification('Transaction deleted!', 'success');
        
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
        <div className="flex min-h-screen bg-amber-50">
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
                            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary-500"></div>
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
                                    unsyncedIds={unsyncedIds}
                                    conflictedIds={conflictedIds}
                                    isEditMode={isEditMode}
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
        </div>
    );
};

export default App;
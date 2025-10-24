import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import type { Transaction } from './types';
import Header from './components/Header';
import TransactionForm from './components/TransactionForm';
import DashboardPage from './pages/DashboardPage';
import TransactionsPage from './pages/TransactionsPage';
import CalculatorPage from './pages/CalculatorPage';
import Sidebar from './components/Sidebar';
import ConfirmationModal from './components/ConfirmationModal';
import ConflictResolutionModal from './components/ConflictResolutionModal';
import { supabase } from './utils/supabase';
import { useNotifier } from './context/NotificationContext';

export type Page = 'transactions' | 'dashboard' | 'calculator';
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
    return stored ? JSON.parse(stored) : [];
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

    // New states for online/offline sync
    const [isOnline, setIsOnline] = useState<boolean>(() => navigator.onLine);
    const [unsyncedCount, setUnsyncedCount] = useState<number>(0);
    const [isSyncing, setIsSyncing] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isSupabaseConfigured] = useState<boolean>(!!supabase);
    const [unsyncedIds, setUnsyncedIds] = useState<Set<string>>(new Set());
    const [conflicts, setConflicts] = useState<{ local: Transaction, server: Transaction }[]>([]);
    const [statusFilter, setStatusFilter] = useState<Transaction['paymentStatus'][]>([]);

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
                        // CONFLICT! The server version is newer or was deleted.
                        const { data: serverFullTx, error: serverFullError } = await supabase!
                            .from('transactions')
                            .select('*')
                            .eq('id', localUpdate.id)
                            .single();
                        
                        if (serverFullError && serverFullError.code !== 'PGRST116') {
                             throw new Error(`Conflict data fetch failed for ${localUpdate.id}: ${serverFullError.message}`);
                        }
                        // If serverFullTx is null, it means the record was deleted on the server.
                        // We can treat this as a conflict where server version is "deleted".
                        if (serverFullTx) {
                            conflictsFound.push({ local: localUpdate, server: fromSupabase(serverFullTx) });
                        } else {
                            // Handle case where item was deleted on server. For now, treat as a standard conflict.
                            // We can enhance the modal later to show "Deleted on Server".
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
                    const remainingUpdates = updates.filter(u => conflictedIds.has(u.id));
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
        
        await loadInitialData();
        setIsSyncing(false);
    }, [isOnline, isSyncing, loadInitialData, clearQueues, addNotification, isSupabaseConfigured, setQueue]);

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
        
        // Clean up local state and queues for the resolved item
        const updates = getQueue<Transaction>(SYNC_QUEUES.UPDATES);
        setQueue(SYNC_QUEUES.UPDATES, updates.filter(t => t.id !== chosenVersion.id));
        setConflicts(prev => prev.filter(c => c.local.id !== chosenVersion.id));
        
        // Refresh local data to show the resolved state
        await loadInitialData();
    };

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
                                    statusFilter={statusFilter}
                                    setStatusFilter={setStatusFilter}
                                    unsyncedIds={unsyncedIds}
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
            <ConflictResolutionModal
                isOpen={conflicts.length > 0}
                conflicts={conflicts}
                onResolve={handleResolveConflict}
            />
        </div>
    );
};

export default App;
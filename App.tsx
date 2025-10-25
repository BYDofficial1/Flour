import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from './utils/supabase';
import type { Transaction, Reminder, Settings, Calculation } from './types';
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
import { useNotifier } from './context/NotificationContext';
import { playNotificationSound } from './utils/sound';
import { getErrorMessage } from './utils/error';
import { SyncIcon } from './components/icons/SyncIcon';
import { ExclamationCircleIcon } from './components/icons/ExclamationCircleIcon';
import { formatCurrency } from './utils/currency';
import { PlusIcon } from './components/icons/PlusIcon';
import AuthModal from './components/AuthModal';

export type Page = 'transactions' | 'dashboard' | 'calculator' | 'settings' | 'reports';
export type TimeFilter = {
    period: TimePeriod;
    startDate?: string;
    endDate?: string;
}
export type TimePeriod = 'today' | 'week' | 'month' | 'all' | 'custom';
export type SortKey = 'date' | 'total' | 'customer_name';


const App: React.FC = () => {
    const { addNotification } = useNotifier();

    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [isSyncing, setIsSyncing] = useState(false);

    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [calculations, setCalculations] = useState<Calculation[]>([]);
    const [reminders, setReminders] = useState<Reminder[]>(() => JSON.parse(localStorage.getItem('reminders') || '[]'));
    const [settings, setSettings] = useState<Settings>(() => JSON.parse(localStorage.getItem('settings') || JSON.stringify({ soundEnabled: true, theme: 'green' })));
    
    const [currentPage, setCurrentPage] = useState<Page>('dashboard');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
    const [prefilledData, setPrefilledData] = useState<Partial<Transaction> | null>(null);
    const [transactionToDelete, setTransactionToDelete] = useState<string | null>(null);
    const [transactionForReminder, setTransactionForReminder] = useState<Transaction | null>(null);
    
    const [timeFilter, setTimeFilter] = useState<TimeFilter>({ period: 'all' });
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<Transaction['payment_status'][]>(['paid', 'unpaid', 'partial']);
    const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'ascending' | 'descending' }>({ key: 'date', direction: 'descending' });

    const [isEditMode, setIsEditMode] = useState(false);
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    
    // --- Auth & Session Management ---
    useEffect(() => {
        const setupPublicSession = async () => {
            const { data: { session: currentSession } } = await supabase.auth.getSession();
            if (currentSession) {
                setSession(currentSession);
                setUser(currentSession.user);
                return;
            }

            const demoEmail = 'admin@attachakki.com';
            const demoPassword = 'attachakki';

            const { data, error: signInError } = await supabase.auth.signInWithPassword({
                email: demoEmail,
                password: demoPassword,
            });

            if (signInError) {
                console.warn('Public user sign-in failed, attempting sign-up:', signInError.message);
                const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
                    email: demoEmail,
                    password: demoPassword,
                });

                if (signUpError) {
                    console.error('Public user sign-up also failed:', signUpError.message);
                    const errorMsg = 'Failed to initialize the public session. This might be a network issue or a problem with the backend configuration (RLS policies).';
                    addNotification(errorMsg, 'error');
                    setLoadError(errorMsg);
                    setIsLoading(false);
                    return;
                }
                setSession(signUpData.session);
                setUser(signUpData.user);
            } else {
                setSession(data.session);
                setUser(data.user);
            }
        };

        setupPublicSession();
    }, [addNotification]);


    // --- Online/Offline Status ---
    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // --- Theming ---
    useEffect(() => {
        document.documentElement.className = `theme-${settings.theme}`;
    }, [settings.theme]);

    // --- Initial Loader ---
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
    
    // --- Reminder Notifications ---
    useEffect(() => {
        if ('Notification' in window && Notification.permission === 'granted' && transactions.length > 0) {
            const now = new Date();
            const dueReminders = reminders.filter(r => !r.isDismissed && new Date(r.remindAt) <= now);
            
            if (dueReminders.length > 0) {
                const updatedReminders = reminders.map(r => {
                    const isDue = dueReminders.some(due => due.id === r.id);
                    if (isDue) {
                        const transaction = transactions.find(t => t.id === r.transactionId);
                        if (transaction) {
                             new Notification('Reminder: Transaction Due', {
                                body: `Payment for ${transaction.customer_name} is due. Total: ${formatCurrency(transaction.total)}`,
                                tag: `reminder-${transaction.id}`
                            });
                        }
                        return { ...r, isDismissed: true };
                    }
                    return r;
                });
                
                setReminders(updatedReminders);
                localStorage.setItem('reminders', JSON.stringify(updatedReminders));
            }
        }
    }, [transactions, reminders]);


    // --- Data Fetching ---
    useEffect(() => {
        if (!user) return; // Wait for the public user session to be established

        const fetchData = async () => {
            setIsLoading(true);
            setLoadError(null);
            setIsSyncing(true);

            const [transactionsResponse, calculationsResponse] = await Promise.all([
                supabase.from('transactions').select('*').order('date', { ascending: false }),
                supabase.from('calculations').select('*').order('created_at', { ascending: false })
            ]);

            setIsSyncing(false);

            if (transactionsResponse.error || calculationsResponse.error) {
                const error = transactionsResponse.error || calculationsResponse.error;
                const message = getErrorMessage(error);
                addNotification(`Could not fetch data: ${message}`, 'error');
                console.error('Data fetch error:', error);
                setLoadError("There was a problem loading your data. This is often a database permissions (RLS) issue. Please ensure your Supabase project is set up correctly.");
                setIsLoading(false);
                return;
            }
            
            setTransactions(transactionsResponse.data || []);
            setCalculations(calculationsResponse.data || []);
            setIsLoading(false);
        };

        fetchData();
    }, [user, addNotification]);


    // --- Data Mutation ---
    const addTransaction = async (data: Omit<Transaction, 'id' | 'updated_at' | 'user_id'>) => {
        if (!isEditMode) {
            addNotification('Edit mode is locked. Please unlock to make changes.', 'error');
            return;
        }
        if (!user) return;
        const newTransactionData = { ...data, user_id: user.id };
        
        const tempId = crypto.randomUUID();
        const optimisticTransaction: Transaction = { ...newTransactionData, id: tempId, updated_at: new Date().toISOString() };
        setTransactions(prev => [optimisticTransaction, ...prev]);

        setIsSyncing(true);
        const { data: dbData, error } = await supabase.from('transactions').insert(newTransactionData).select().single();
        setIsSyncing(false);

        if (error) {
            const message = getErrorMessage(error);
            console.error('Error adding transaction:', error);
            addNotification(`Save failed: ${message}`, 'error');
            setTransactions(prev => prev.filter(t => t.id !== tempId));
        } else {
            addNotification('Transaction added!', 'success');
            setTransactions(prev => prev.map(t => t.id === tempId ? dbData : t));
        }
        if (settings.soundEnabled) playNotificationSound();
        closeModal();
    };

    const updateTransaction = async (updatedTransaction: Transaction) => {
        if (!isEditMode) {
            addNotification('Edit mode is locked. Please unlock to make changes.', 'error');
            return;
        }
        const finalTransaction = { ...updatedTransaction, updated_at: new Date().toISOString() };
        const originalTransactions = transactions;
        
        setTransactions(prev => prev.map(t => t.id === finalTransaction.id ? finalTransaction : t));

        setIsSyncing(true);
        const { error } = await supabase.from('transactions').update(finalTransaction).eq('id', finalTransaction.id);
        setIsSyncing(false);

        if (error) {
            const message = getErrorMessage(error);
            console.error('Error updating transaction:', error);
            addNotification(`Update failed: ${message}`, 'error');
            setTransactions(originalTransactions);
        } else {
            addNotification('Transaction updated.', 'info');
        }
        closeModal();
    };

    const deleteTransaction = async (id: string) => {
        if (!isEditMode) {
            addNotification('Edit mode is locked. Please unlock to make changes.', 'error');
            return;
        }
        const originalTransactions = transactions;
        setTransactions(prev => prev.filter(t => t.id !== id));
        
        setIsSyncing(true);
        const { error } = await supabase.from('transactions').delete().eq('id', id);
        setIsSyncing(false);

        if (error) {
            const message = getErrorMessage(error);
            console.error('Error deleting transaction:', error);
            addNotification(`Delete failed: ${message}`, 'error');
            setTransactions(originalTransactions);
        } else {
            addNotification('Transaction deleted.', 'error');
        }
        setTransactionToDelete(null);
    };

    const addCalculation = async (data: Omit<Calculation, 'id' | 'created_at' | 'updated_at' | 'user_id'>) => {
        if (!isEditMode) {
            addNotification('Edit mode is locked. Please unlock to make changes.', 'error');
            return;
        }
        if (!user) return;
        const newCalcData = { ...data, user_id: user.id };
        const { data: dbData, error } = await supabase.from('calculations').insert(newCalcData).select().single();

        if (error) {
            const message = getErrorMessage(error);
            addNotification(`Save failed: ${message}`, 'error');
        } else {
            setCalculations(prev => [dbData, ...prev]);
            addNotification('Calculation saved!', 'success');
            if (settings.soundEnabled) playNotificationSound();
        }
    };

    const updateCalculation = async (updatedCalc: Calculation) => {
        if (!isEditMode) {
            addNotification('Edit mode is locked. Please unlock to make changes.', 'error');
            return;
        }
        const finalCalc = { ...updatedCalc, updated_at: new Date().toISOString() };
        const { error } = await supabase.from('calculations').update(finalCalc).eq('id', finalCalc.id);

        if (error) {
            const message = getErrorMessage(error);
            addNotification(`Update failed: ${message}`, 'error');
        } else {
            setCalculations(prev => prev.map(c => c.id === finalCalc.id ? finalCalc : c));
            addNotification('Calculation updated.', 'info');
        }
    };

    const deleteCalculation = async (id: string) => {
        if (!isEditMode) {
            addNotification('Edit mode is locked. Please unlock to make changes.', 'error');
            return;
        }
        const { error } = await supabase.from('calculations').delete().eq('id', id);
        if (error) {
            const message = getErrorMessage(error);
            addNotification(`Delete failed: ${message}`, 'error');
        } else {
            setCalculations(prev => prev.filter(c => c.id !== id));
            addNotification('Calculation deleted.', 'error');
        }
    };
    
    // Local-only mutations
    const handleSetReminder = (transactionId: string, remindAt: Date) => {
        const newReminder: Reminder = { id: crypto.randomUUID(), transactionId, remindAt: remindAt.toISOString(), isDismissed: false };
        const newReminders = [...reminders.filter(r => r.transactionId !== transactionId), newReminder];
        setReminders(newReminders);
        localStorage.setItem('reminders', JSON.stringify(newReminders));
        addNotification('Reminder set!', 'success');
        setTransactionForReminder(null);
    };

    const handleSaveSettings = (newSettings: Settings) => {
        if (!isEditMode) {
            addNotification('Edit mode is locked. Please unlock to save settings.', 'error');
            return;
        }
        setSettings(newSettings);
        localStorage.setItem('settings', JSON.stringify(newSettings));
        document.documentElement.className = `theme-${newSettings.theme}`;
        addNotification('Settings saved!', 'success');
    };
    
    // --- UI Actions ---
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

    // --- Edit Mode Actions ---
    const handleToggleEditMode = () => {
        if (isEditMode) {
            setIsEditMode(false);
            addNotification('Edit Mode Locked.', 'info');
        } else {
            setIsAuthModalOpen(true);
        }
    };

    const handleAuthSuccess = () => {
        setIsEditMode(true);
        setIsAuthModalOpen(false);
        addNotification('Edit Mode Unlocked!', 'success');
    };

    // --- Filtering & Sorting ---
    const filteredTransactions = useMemo(() => {
        const filtered = transactions.filter(t => {
            const transactionDate = new Date(t.date);
            let isInDateRange = true;
            if (timeFilter.period === 'today') {
                 const startOfDay = new Date();
                 startOfDay.setHours(0, 0, 0, 0);
                 isInDateRange = transactionDate >= startOfDay;
            } else if (timeFilter.period === 'week') {
                 const startOfWeek = new Date();
                 startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
                 startOfWeek.setHours(0, 0, 0, 0);
                 isInDateRange = transactionDate >= startOfWeek;
            } else if (timeFilter.period === 'month') {
                 const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
                 isInDateRange = transactionDate >= startOfMonth;
            } else if (timeFilter.period === 'custom' && timeFilter.startDate && timeFilter.endDate) {
                 const startDate = new Date(timeFilter.startDate);
                 startDate.setHours(0,0,0,0);
                 const endDate = new Date(timeFilter.endDate);
                 endDate.setHours(23,59,59,999);
                 isInDateRange = transactionDate >= startDate && transactionDate <= endDate;
            }
            
            const searchMatch = !searchQuery ||
                t.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                t.item.toLowerCase().includes(searchQuery.toLowerCase());
            
            const statusMatch = statusFilter.length === 3 || statusFilter.includes(t.payment_status);

            return isInDateRange && searchMatch && statusMatch;
        });

        return filtered.sort((a, b) => {
            const dir = sortConfig.direction === 'ascending' ? 1 : -1;
            if (sortConfig.key === 'date') return (new Date(a.date).getTime() - new Date(b.date).getTime()) * dir;
            if (sortConfig.key === 'total') return (a.total - b.total) * dir;
            if (sortConfig.key === 'customer_name') return a.customer_name.localeCompare(b.customer_name) * dir;
            return 0;
        });
    }, [transactions, timeFilter, searchQuery, statusFilter, sortConfig]);

    // --- Page Rendering ---
    // Memoize page components to prevent them from unmounting and losing state (like input focus) on re-render.
    const pageContent = useMemo(() => {
        switch (currentPage) {
            case 'dashboard': return <DashboardPage transactions={filteredTransactions} timeFilter={timeFilter} setTimeFilter={setTimeFilter} />;
            case 'transactions': return <TransactionsPage transactions={filteredTransactions} onEdit={openModal} onDelete={(id) => setTransactionToDelete(id)} onSetReminder={(t) => setTransactionForReminder(t)} reminders={reminders} sortConfig={sortConfig} setSortConfig={setSortConfig} timeFilter={timeFilter} setTimeFilter={setTimeFilter} searchQuery={searchQuery} setSearchQuery={setSearchQuery} statusFilter={statusFilter} setStatusFilter={setStatusFilter} isEditMode={isEditMode} />;
            case 'reports': return <ReportsPage transactions={transactions} isEditMode={isEditMode} />;
            case 'calculator': return <CalculatorPage calculations={calculations} onAddCalculation={addCalculation} onUpdateCalculation={updateCalculation} onDeleteCalculation={deleteCalculation} isEditMode={isEditMode} />;
            case 'settings': return <SettingsPage currentSettings={settings} onSave={handleSaveSettings} isEditMode={isEditMode} />;
            default: return <DashboardPage transactions={filteredTransactions} timeFilter={timeFilter} setTimeFilter={setTimeFilter} />;
        }
    }, [currentPage, filteredTransactions, timeFilter, searchQuery, statusFilter, sortConfig, transactions, calculations, reminders, settings, addCalculation, updateCalculation, deleteCalculation, handleSaveSettings, isEditMode]);
    
    if (isLoading) {
        return (
             <div className="flex h-screen w-screen items-center justify-center bg-slate-900">
                <div className="flex flex-col items-center gap-4">
                    <SyncIcon className="h-8 w-8 animate-spin text-primary-500" />
                    <p className="text-slate-400">Connecting...</p>
                </div>
            </div>
        );
    }
    
    if (loadError) {
        return (
            <div className="flex h-screen w-screen items-center justify-center bg-slate-900 p-4">
                <div className="text-center max-w-md">
                    <ExclamationCircleIcon className="h-12 w-12 text-red-400 mx-auto mb-4"/>
                    <h2 className="text-2xl font-bold text-slate-100">Failed to Load Data</h2>
                    <p className="text-slate-400 mt-2">{loadError}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="mt-6 px-6 py-2 bg-primary-600 text-white font-semibold rounded-lg shadow-md hover:bg-primary-700 transition-colors"
                    >
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-slate-900 text-slate-300 font-sans">
            <Sidebar 
                isOpen={isSidebarOpen} 
                setIsOpen={setIsSidebarOpen} 
                currentPage={currentPage} 
                setCurrentPage={setCurrentPage}
            />

            <div className="flex-1 flex flex-col overflow-hidden lg:ml-64">
                <Header 
                    onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)} 
                    isOnline={isOnline}
                    isSyncing={isSyncing}
                    isEditMode={isEditMode}
                    onToggleEditMode={handleToggleEditMode}
                />
                
                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-slate-900 no-scrollbar">
                    <div className="container mx-auto px-4 md:px-6 py-4">
                        {pageContent}
                    </div>
                </main>
            </div>

            {isModalOpen && <TransactionForm isOpen={isModalOpen} onClose={closeModal} onSubmit={editingTransaction ? updateTransaction : addTransaction} initialData={editingTransaction} prefilledData={prefilledData} />}
            {transactionToDelete && <ConfirmationModal isOpen={!!transactionToDelete} onClose={() => setTransactionToDelete(null)} onConfirm={() => { if (transactionToDelete) deleteTransaction(transactionToDelete); }} title="Delete Transaction" message="Are you sure you want to delete this transaction? This action cannot be undone." />}
            {transactionForReminder && <ReminderModal isOpen={!!transactionForReminder} onClose={() => setTransactionForReminder(null)} onSetReminder={handleSetReminder} transaction={transactionForReminder} />}
            {isAuthModalOpen && <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} onAuthSuccess={handleAuthSuccess} />}

            {currentPage === 'transactions' && isEditMode && (
                <button
                    onClick={() => openModal()}
                    className="fixed right-6 bottom-6 bg-primary-500 text-white rounded-full p-4 shadow-lg hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-primary-500 transition-all duration-300 transform hover:scale-110 z-30 backface-hidden"
                    aria-label="Add new transaction"
                >
                    <PlusIcon />
                </button>
            )}
        </div>
    );
};

export default App;
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from './utils/supabase';
import type { Transaction, Reminder, Settings, Calculation, Service, Expense, ExpenseCategory, Receivable } from './types';
import Header from './components/Header';
import TransactionForm from './components/TransactionForm';
import DashboardPage from './pages/DashboardPage';
import TransactionsPage from './pages/TransactionsPage';
import CalculatorPage from './pages/CalculatorPage';
import SettingsPage from './pages/SettingsPage';
import ReportsPage from './pages/ReportsPage';
import ExpensesPage from './pages/ExpensesPage';
import ReceivablesPage from './pages/ReceivablesPage';
import Sidebar from './components/Sidebar';
import ConfirmationModal from './components/ConfirmationModal';
import ReminderModal from './components/ReminderModal';
import { useNotifier } from './context/NotificationContext';
import { playNotificationSound, SoundType } from './utils/sound';
import { getErrorMessage } from './utils/error';
import { ExclamationCircleIcon } from './components/icons/ExclamationCircleIcon';
import { formatCurrency } from './utils/currency';
import { PlusIcon } from './components/icons/PlusIcon';
import AuthModal from './components/AuthModal';

export type Page = 'transactions' | 'dashboard' | 'reports' | 'calculator' | 'settings' | 'expenses' | 'receivables';
export type TimeFilter = {
    period: TimePeriod;
    startDate?: string;
    endDate?: string;
}
export type TimePeriod = 'today' | 'week' | 'month' | 'all' | 'custom';
export type SortKey = 'date' | 'total' | 'customer_name';


// --- Custom Hooks ---

const useAuth = (notify: (message: string, type: SoundType) => void) => {
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);

    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setUser(session?.user ?? null);
            // Only stop loading when a session state is definitively determined
            if (_event === 'INITIAL_SESSION' || _event === 'SIGNED_OUT') {
                setIsLoading(false);
            }
        });

        const initializeSession = async () => {
            const { data: { session: initialSession } } = await supabase.auth.getSession();

            if (!initialSession) {
                const demoEmail = 'admin@attachakki.com';
                const demoPassword = 'attachakki';

                const { error: signInError } = await supabase.auth.signInWithPassword({
                    email: demoEmail,
                    password: demoPassword,
                });

                if (signInError) {
                    console.warn('Public user sign-in failed, attempting sign-up:', signInError.message);
                    const { error: signUpError } = await supabase.auth.signUp({
                        email: demoEmail,
                        password: demoPassword,
                    });

                    if (signUpError) {
                        console.error('Public user sign-up also failed:', signUpError.message);
                        const errorMsg = 'Failed to initialize the public session. This might be a network issue or a problem with the backend configuration (RLS policies).';
                        notify(errorMsg, 'error');
                        setLoadError(errorMsg);
                        setIsLoading(false);
                    }
                }
            } else {
                 // If a session exists, onAuthStateChange will handle setting the user and loading state
            }
        };

        initializeSession();

        return () => subscription.unsubscribe();
    }, [notify]);

    return { session, user, isLoading, loadError };
};

const useSettings = (notify: (message: string, type: SoundType) => void) => {
    const [settings, setSettings] = useState<Settings>(() => JSON.parse(localStorage.getItem('settings') || JSON.stringify({ soundEnabled: true, theme: 'green' })));
    
    useEffect(() => {
        document.documentElement.className = `theme-${settings.theme}`;
    }, [settings.theme]);

    const handleSaveSettings = (newSettings: Settings, isEditMode: boolean) => {
        if (!isEditMode) {
            notify('Edit mode is locked. Please unlock to save settings.', 'error');
            return;
        }
        setSettings(newSettings);
        localStorage.setItem('settings', JSON.stringify(newSettings));
        notify('Settings saved!', 'success');
    };

    return { settings, handleSaveSettings };
};


const useDataStore = (user: User | null, notify: (message: string, type: SoundType) => void, isEditMode: boolean) => {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [calculations, setCalculations] = useState<Calculation[]>([]);
    const [services, setServices] = useState<Service[]>([]);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([]);
    const [receivables, setReceivables] = useState<Receivable[]>([]);

    const [isDataLoading, setIsDataLoading] = useState(true);
    const [dataLoadError, setDataLoadError] = useState<string | null>(null);
    const [isSyncing, setIsSyncing] = useState(false);

    useEffect(() => {
        if (!user) return;

        const fetchData = async () => {
            setIsDataLoading(true);
            setDataLoadError(null);
            setIsSyncing(true);

            const [transactionsResponse, calculationsResponse, servicesResponse, expensesResponse, expenseCategoriesResponse, receivablesResponse] = await Promise.all([
                supabase.from('transactions').select('*').order('date', { ascending: false }),
                supabase.from('calculations').select('*').order('created_at', { ascending: false }),
                supabase.from('services').select('*').order('name', { ascending: true }),
                supabase.from('expenses').select('*').order('date', { ascending: false }),
                supabase.from('expense_categories').select('*').order('name', { ascending: true }),
                supabase.from('receivables').select('*').order('created_at', { ascending: false })
            ]);

            setIsSyncing(false);

            const dataError = transactionsResponse.error || calculationsResponse.error || servicesResponse.error || expensesResponse.error || expenseCategoriesResponse.error || receivablesResponse.error;
            if (dataError) {
                const message = getErrorMessage(dataError);
                 if (receivablesResponse.error && (receivablesResponse.error as any).code === '42P01') {
                     console.warn("Receivables table not found. Please run the database update script.");
                     setReceivables([]);
                } else {
                    notify(`Could not fetch data: ${message}`, 'error');
                    console.error('Data fetch error:', dataError);
                    setDataLoadError("There was a problem loading your data. This is often a database permissions (RLS) issue. Please ensure your Supabase project is set up correctly.");
                    setIsDataLoading(false);
                    return;
                }
            }
            
            setTransactions(transactionsResponse.data || []);
            setCalculations(calculationsResponse.data || []);
            setExpenses(expensesResponse.data || []);
            setReceivables(receivablesResponse.data || []);
            
            if (servicesResponse.data && servicesResponse.data.length === 0) {
                const defaultServices = [
                    { name: 'Wheat Grinding', category: 'grinding', user_id: user.id }, { name: 'Own Wheat Grinding', category: 'grinding', user_id: user.id },
                    { name: 'Daliya Grinding', category: 'grinding', user_id: user.id }, { name: 'Own Daliya Grinding', category: 'grinding', user_id: user.id },
                    { name: 'Flour Sale', category: 'sale', user_id: user.id }, { name: 'Daliya Sale', category: 'sale', user_id: user.id },
                    { name: 'Other', category: 'other', user_id: user.id },
                ];
                const { data: insertedServices, error: insertError } = await supabase.from('services').insert(defaultServices).select();
                if (insertError) notify('Failed to create default services.', 'error');
                else setServices(insertedServices || []);
            } else {
                setServices(servicesResponse.data || []);
            }

            if (expenseCategoriesResponse.data && expenseCategoriesResponse.data.length === 0) {
                const defaultCategories = [ { name: 'Utilities', user_id: user.id }, { name: 'Maintenance', user_id: user.id }, { name: 'Supplies', user_id: user.id }, { name: 'Repairs', user_id: user.id }, { name: 'Other', user_id: user.id }, ];
                const { data: insertedCategories, error: insertError } = await supabase.from('expense_categories').insert(defaultCategories).select();
                if (insertError) notify('Failed to create default expense categories.', 'error');
                else setExpenseCategories(insertedCategories || []);
            } else {
                setExpenseCategories(expenseCategoriesResponse.data || []);
            }
            setIsDataLoading(false);
        };

        fetchData();
    }, [user, notify]);

    const checkEditMode = () => {
        if (!isEditMode) {
            notify('Edit mode is locked. Please unlock to make changes.', 'error');
            return false;
        }
        return true;
    };
    
    const restoreData = async (backupData: any) => {
        if (!checkEditMode() || !user) return;

        setIsSyncing(true);
        notify('Starting data restore... Please do not close the app.', 'info');
        
        try {
            // Delete existing data
            const deletePromises = [
                supabase.from('transactions').delete().eq('user_id', user.id),
                supabase.from('expenses').delete().eq('user_id', user.id),
                supabase.from('receivables').delete().eq('user_id', user.id),
                supabase.from('calculations').delete().eq('user_id', user.id),
                supabase.from('services').delete().eq('user_id', user.id),
                supabase.from('expense_categories').delete().eq('user_id', user.id),
            ];
            const deleteResults = await Promise.all(deletePromises);
            const deleteError = deleteResults.find(res => res.error);
            if (deleteError) throw deleteError.error;
            notify('Existing data cleared.', 'info');

            // Insert new data
            const insertPromises = [
                backupData.data.transactions.length > 0 ? supabase.from('transactions').insert(backupData.data.transactions.map((t:any) => ({...t, user_id: user.id}))) : Promise.resolve({error: null}),
                backupData.data.expenses.length > 0 ? supabase.from('expenses').insert(backupData.data.expenses.map((e:any) => ({...e, user_id: user.id}))) : Promise.resolve({error: null}),
                backupData.data.receivables.length > 0 ? supabase.from('receivables').insert(backupData.data.receivables.map((r:any) => ({...r, user_id: user.id}))) : Promise.resolve({error: null}),
                backupData.data.calculations.length > 0 ? supabase.from('calculations').insert(backupData.data.calculations.map((c:any) => ({...c, user_id: user.id}))) : Promise.resolve({error: null}),
                backupData.data.services.length > 0 ? supabase.from('services').insert(backupData.data.services.map((s:any) => ({...s, user_id: user.id}))) : Promise.resolve({error: null}),
                backupData.data.expenseCategories.length > 0 ? supabase.from('expense_categories').insert(backupData.data.expenseCategories.map((ec:any) => ({...ec, user_id: user.id}))) : Promise.resolve({error: null}),
            ];
            const insertResults = await Promise.all(insertPromises);
            const insertError = insertResults.find(res => res.error);
            if (insertError) throw insertError.error;
            notify('New data imported.', 'info');
            
            // Update local state
            setTransactions(backupData.data.transactions || []);
            setExpenses(backupData.data.expenses || []);
            setReceivables(backupData.data.receivables || []);
            setCalculations(backupData.data.calculations || []);
            setServices(backupData.data.services || []);
            setExpenseCategories(backupData.data.expenseCategories || []);

            notify('Data restored successfully! App will now reload.', 'success');
            setTimeout(() => window.location.reload(), 2000);
        } catch (error) {
            notify(`Restore failed: ${getErrorMessage(error)}`, 'error');
            // Refetch data to get back to a consistent state
            if(user) {
                 // simplified refetch
                 window.location.reload();
            }
        } finally {
            setIsSyncing(false);
        }
    };


    // --- Mutation Functions ---
    const addTransaction = async (data: Omit<Transaction, 'id' | 'updated_at' | 'user_id'>) => {
        if (!checkEditMode() || !user) return;
        const optimisticTransaction: Transaction = { ...data, user_id: user.id, id: crypto.randomUUID(), updated_at: new Date().toISOString() };
        setTransactions(prev => [optimisticTransaction, ...prev]);
        setIsSyncing(true);
        const { data: dbData, error } = await supabase.from('transactions').insert({ ...data, user_id: user.id }).select().single();
        setIsSyncing(false);
        if (error) {
            notify(`Save failed: ${getErrorMessage(error)}`, 'error');
            setTransactions(prev => prev.filter(t => t.id !== optimisticTransaction.id));
        } else {
            notify(`Transaction for ${data.customer_name} added!`, 'success');
            setTransactions(prev => prev.map(t => t.id === optimisticTransaction.id ? dbData : t));
        }
    };

    const updateTransaction = async (updatedTransaction: Transaction) => {
        if (!checkEditMode()) return;
        const finalTransaction = { ...updatedTransaction, updated_at: new Date().toISOString() };
        const originalTransactions = transactions;
        setTransactions(prev => prev.map(t => t.id === finalTransaction.id ? finalTransaction : t));
        setIsSyncing(true);
        const { error } = await supabase.from('transactions').update(finalTransaction).eq('id', finalTransaction.id);
        setIsSyncing(false);
        if (error) {
            notify(`Update failed: ${getErrorMessage(error)}`, 'error');
            setTransactions(originalTransactions);
        } else {
            notify(`Transaction for ${updatedTransaction.customer_name} updated.`, 'info');
        }
    };

    const deleteTransaction = async (id: string) => {
        if (!checkEditMode()) return;
        const originalTransactions = transactions;
        const transactionToDeleteData = originalTransactions.find(t => t.id === id);
        setTransactions(prev => prev.filter(t => t.id !== id));
        setIsSyncing(true);
        const { error } = await supabase.from('transactions').delete().eq('id', id);
        setIsSyncing(false);
        if (error) {
            notify(`Delete failed: ${getErrorMessage(error)}`, 'error');
            setTransactions(originalTransactions);
        } else {
            notify(`Transaction${transactionToDeleteData ? ` for ${transactionToDeleteData.customer_name}` : ''} deleted.`, 'info');
        }
    };

    const addCalculation = async (data: Omit<Calculation, 'id' | 'created_at' | 'updated_at' | 'user_id'>) => {
        if (!checkEditMode() || !user) return;
        const { data: dbData, error } = await supabase.from('calculations').insert({ ...data, user_id: user.id }).select().single();
        if (error) notify(`Save failed: ${getErrorMessage(error)}`, 'error');
        else {
            setCalculations(prev => [dbData, ...prev]);
            notify(`Calculation for ${data.customer_name || 'Unnamed'} saved!`, 'success');
        }
    };

    const updateCalculation = async (updatedCalc: Calculation) => {
        if (!checkEditMode()) return;
        const finalCalc = { ...updatedCalc, updated_at: new Date().toISOString() };
        const { error } = await supabase.from('calculations').update(finalCalc).eq('id', finalCalc.id);
        if (error) notify(`Update failed: ${getErrorMessage(error)}`, 'error');
        else {
            setCalculations(prev => prev.map(c => c.id === finalCalc.id ? finalCalc : c));
            notify(`Calculation for ${updatedCalc.customer_name || 'Unnamed'} updated.`, 'info');
        }
    };

    const deleteCalculation = async (id: string) => {
        if (!checkEditMode()) return;
        const calcToDelete = calculations.find(c => c.id === id);
        setCalculations(prev => prev.filter(c => c.id !== id));
        const { error } = await supabase.from('calculations').delete().eq('id', id);
        if (error) {
            notify(`Delete failed: ${getErrorMessage(error)}`, 'error');
            setCalculations(prev => [...prev, calcToDelete!].sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
        } else {
            notify(`${calcToDelete?.customer_name || 'Calculation'} deleted.`, 'info');
        }
    };
    
    // Services, Expenses, Categories, Receivables... (similar pattern)
     const addService = async (data: Omit<Service, 'id' | 'created_at' | 'user_id'>) => {
        if (!user) return;
        const { data: dbData, error } = await supabase.from('services').insert({ ...data, user_id: user.id }).select().single();
        if (error) notify(getErrorMessage(error), 'error');
        else {
            setServices(prev => [...prev, dbData].sort((a, b) => a.name.localeCompare(b.name)));
            notify(`Service "${data.name}" added!`, 'success');
        }
    };

    const updateService = async (updatedService: Service) => {
        const { error } = await supabase.from('services').update(updatedService).eq('id', updatedService.id);
        if (error) notify(getErrorMessage(error), 'error');
        else {
            setServices(prev => prev.map(s => s.id === updatedService.id ? updatedService : s));
            notify(`Service "${updatedService.name}" updated.`, 'info');
        }
    };

    const deleteService = async (id: string) => {
        const serviceToDelete = services.find(s => s.id === id);
        setServices(prev => prev.filter(s => s.id !== id));
        const { error } = await supabase.from('services').delete().eq('id', id);
        if (error) {
            notify(getErrorMessage(error), 'error');
            setServices(prev => [...prev, serviceToDelete!].sort((a,b)=>a.name.localeCompare(b.name)));
        } else {
            notify(`Service "${serviceToDelete?.name || 'Unknown'}" deleted.`, 'info');
        }
    };
    
    const addExpense = async (data: Omit<Expense, 'id' | 'created_at' | 'user_id'>) => {
        if (!checkEditMode() || !user) return;
        const { data: dbData, error } = await supabase.from('expenses').insert({ ...data, user_id: user.id }).select().single();
        if (error) notify(getErrorMessage(error), 'error');
        else {
            setExpenses(prev => [dbData, ...prev].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
            notify(`Expense "${data.expense_name}" added!`, 'success');
        }
    };

    const updateExpense = async (updatedExpense: Expense) => {
        if (!checkEditMode()) return;
        const { error } = await supabase.from('expenses').update(updatedExpense).eq('id', updatedExpense.id);
        if (error) notify(getErrorMessage(error), 'error');
        else {
            setExpenses(prev => prev.map(e => e.id === updatedExpense.id ? updatedExpense : e));
            notify(`Expense "${updatedExpense.expense_name}" updated.`, 'info');
        }
    };

    const deleteExpense = async (id: string) => {
        if (!checkEditMode()) return;
        const expenseToDelete = expenses.find(e => e.id === id);
        setExpenses(prev => prev.filter(e => e.id !== id));
        const { error } = await supabase.from('expenses').delete().eq('id', id);
        if (error) {
            notify(getErrorMessage(error), 'error');
            setExpenses(prev => [...prev, expenseToDelete!].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
        } else {
            notify(`Expense "${expenseToDelete?.expense_name || 'Unknown'}" deleted.`, 'info');
        }
    };

    const addExpenseCategory = async (data: Omit<ExpenseCategory, 'id' | 'created_at' | 'user_id'>) => {
        if (!user) return;
        const { data: dbData, error } = await supabase.from('expense_categories').insert({ ...data, user_id: user.id }).select().single();
        if (error) notify(getErrorMessage(error), 'error');
        else {
            setExpenseCategories(prev => [...prev, dbData].sort((a, b) => a.name.localeCompare(b.name)));
            notify(`Category "${data.name}" added!`, 'success');
        }
    };

    const updateExpenseCategory = async (updatedCategory: ExpenseCategory) => {
        const { error } = await supabase.from('expense_categories').update({ name: updatedCategory.name }).eq('id', updatedCategory.id);
        if (error) notify(getErrorMessage(error), 'error');
        else {
            setExpenseCategories(prev => prev.map(c => c.id === updatedCategory.id ? { ...c, name: updatedCategory.name } : c));
            notify(`Category "${updatedCategory.name}" updated.`, 'info');
        }
    };

    const deleteExpenseCategory = async (id: string) => {
        const categoryToDelete = expenseCategories.find(c => c.id === id);
        setExpenseCategories(prev => prev.filter(c => c.id !== id));
        const { error } = await supabase.from('expense_categories').delete().eq('id', id);
        if (error) {
            notify(getErrorMessage(error), 'error');
            setExpenseCategories(prev => [...prev, categoryToDelete!].sort((a,b) => a.name.localeCompare(b.name)));
        } else {
            notify(`Category "${categoryToDelete?.name || 'Unknown'}" deleted.`, 'info');
        }
    };
    
    const addReceivable = async (data: Omit<Receivable, 'id' | 'created_at' | 'updated_at' | 'user_id'>) => {
        if (!checkEditMode() || !user) return;
        const { data: dbData, error } = await supabase.from('receivables').insert({ ...data, user_id: user.id }).select().single();
        if (error) notify(getErrorMessage(error), 'error');
        else {
            setReceivables(prev => [dbData, ...prev]);
            notify(`Collection for "${data.person_name}" added!`, 'success');
        }
    };

    const updateReceivable = async (updatedReceivable: Receivable) => {
        if (!checkEditMode()) return;
        const finalReceivable = { ...updatedReceivable, updated_at: new Date().toISOString() };
        const { error } = await supabase.from('receivables').update(finalReceivable).eq('id', finalReceivable.id);
        if (error) notify(getErrorMessage(error), 'error');
        else {
            setReceivables(prev => prev.map(r => r.id === finalReceivable.id ? finalReceivable : r));
            notify(`Collection for "${updatedReceivable.person_name}" updated.`, 'info');
        }
    };
    
    const deleteReceivable = async (id: string) => {
        if (!checkEditMode()) return;
        const receivableToDelete = receivables.find(r => r.id === id);
        setReceivables(prev => prev.filter(r => r.id !== id));
        const { error } = await supabase.from('receivables').delete().eq('id', id);
        if (error) {
            notify(getErrorMessage(error), 'error');
            setReceivables(prev => [...prev, receivableToDelete!].sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
        } else {
            notify(`Collection for "${receivableToDelete?.person_name || 'Unknown'}" deleted.`, 'info');
        }
    };


    return {
        transactions, calculations, services, expenses, expenseCategories, receivables,
        isDataLoading, dataLoadError, isSyncing,
        addTransaction, updateTransaction, deleteTransaction,
        addCalculation, updateCalculation, deleteCalculation,
        addService, updateService, deleteService,
        addExpense, updateExpense, deleteExpense,
        addExpenseCategory, updateExpenseCategory, deleteExpenseCategory,
        addReceivable, updateReceivable, deleteReceivable,
        restoreData,
    };
};

const App: React.FC = () => {
    const { addNotification } = useNotifier();
    const [isEditMode, setIsEditMode] = useState(false);
    
    const notify = useCallback((message: string, type: SoundType) => {
        addNotification(message, type);
        const savedSettings = JSON.parse(localStorage.getItem('settings') || '{}');
        if (savedSettings.soundEnabled) {
            playNotificationSound(type);
        }
    }, [addNotification]);
    
    const { user, isLoading: isAuthLoading, loadError } = useAuth(notify);
    const { settings, handleSaveSettings } = useSettings(notify);
    const { 
        transactions, calculations, services, expenses, expenseCategories, receivables,
        isDataLoading, dataLoadError, isSyncing,
        addTransaction, updateTransaction, deleteTransaction,
        addCalculation, updateCalculation, deleteCalculation,
        addService, updateService, deleteService,
        addExpense, updateExpense, deleteExpense,
        addExpenseCategory, updateExpenseCategory, deleteExpenseCategory,
        addReceivable, updateReceivable, deleteReceivable,
        restoreData
    } = useDataStore(user, notify, isEditMode);

    const [reminders, setReminders] = useState<Reminder[]>(() => JSON.parse(localStorage.getItem('reminders') || '[]'));

    // --- UI State ---
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [currentPage, setCurrentPage] = useState<Page>('dashboard');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    
    // Modals
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
    const [prefilledData, setPrefilledData] = useState<Partial<Transaction> | null>(null);
    const [transactionToDelete, setTransactionToDelete] = useState<string | null>(null);
    const [transactionForReminder, setTransactionForReminder] = useState<Transaction | null>(null);
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    
    // Filters & Sorting
    const [timeFilter, setTimeFilter] = useState<TimeFilter>({ period: 'all' });
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<Transaction['payment_status'][]>(['paid', 'unpaid', 'partial']);
    const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'ascending' | 'descending' }>({ key: 'date', direction: 'descending' });


    // --- Side Effects ---
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
    
    useEffect(() => {
        if ('Notification' in window && Notification.permission === 'granted' && transactions.length > 0) {
            const now = new Date();
            const dueReminders = reminders.filter(r => !r.isDismissed && new Date(r.remindAt) <= now);
            if (dueReminders.length > 0) {
                const updatedReminders = reminders.map(r => {
                    if (dueReminders.some(due => due.id === r.id)) {
                        const transaction = transactions.find(t => t.id === r.transactionId);
                        if (transaction) {
                             new Notification('Reminder: Transaction Due', { body: `Payment for ${transaction.customer_name} is due. Total: ${formatCurrency(transaction.total)}`, tag: `reminder-${transaction.id}` });
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

    // --- Data Handlers ---
    const handleSetReminder = (transactionId: string, remindAt: Date) => {
        const newReminder: Reminder = { id: crypto.randomUUID(), transactionId, remindAt: remindAt.toISOString(), isDismissed: false };
        const newReminders = [...reminders.filter(r => r.transactionId !== transactionId), newReminder];
        setReminders(newReminders);
        localStorage.setItem('reminders', JSON.stringify(newReminders));
        notify('Reminder set!', 'success');
        setTransactionForReminder(null);
    };

    const closeModalAndReset = () => {
        setIsModalOpen(false);
        setEditingTransaction(null);
        setPrefilledData(null);
    };

    const handleAddOrUpdateTransaction = (data: any) => {
        if (editingTransaction) {
            updateTransaction({ ...editingTransaction, ...data });
        } else {
            addTransaction(data);
        }
        closeModalAndReset();
    };

    const openModal = (transactionToEdit: Transaction | null = null, prefill: Partial<Transaction> | null = null) => {
        setEditingTransaction(transactionToEdit);
        setPrefilledData(prefill);
        setIsModalOpen(true);
    };

    const handleToggleEditMode = () => {
        if (isEditMode) {
            setIsEditMode(false);
            notify('Edit Mode Locked.', 'info');
        } else {
            setIsAuthModalOpen(true);
        }
    };

    const handleAuthSuccess = () => {
        setIsEditMode(true);
        setIsAuthModalOpen(false);
        notify('Edit Mode Unlocked!', 'success');
    };

    // --- Memoized Derived State ---
    const filteredTransactions = useMemo(() => {
        const filtered = transactions.filter(t => {
            const transactionDate = new Date(t.date);
            let isInDateRange = true;
            if (timeFilter.period === 'today') {
                 const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
                 isInDateRange = transactionDate >= startOfDay;
            } else if (timeFilter.period === 'week') {
                 const startOfWeek = new Date(); startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay()); startOfWeek.setHours(0, 0, 0, 0);
                 isInDateRange = transactionDate >= startOfWeek;
            } else if (timeFilter.period === 'month') {
                 const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
                 isInDateRange = transactionDate >= startOfMonth;
            } else if (timeFilter.period === 'custom' && timeFilter.startDate && timeFilter.endDate) {
                 const startDate = new Date(timeFilter.startDate); startDate.setHours(0,0,0,0);
                 const endDate = new Date(timeFilter.endDate); endDate.setHours(23,59,59,999);
                 isInDateRange = transactionDate >= startDate && transactionDate <= endDate;
            }
            const searchMatch = !searchQuery || t.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) || t.item.toLowerCase().includes(searchQuery.toLowerCase());
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

    const filteredExpenses = useMemo(() => {
        return expenses.filter(e => {
            const expenseDate = new Date(e.date);
            let isInDateRange = true;
            if (timeFilter.period === 'today') {
                 const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
                 isInDateRange = expenseDate >= startOfDay;
            } else if (timeFilter.period === 'week') {
                 const startOfWeek = new Date(); startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay()); startOfWeek.setHours(0, 0, 0, 0);
                 isInDateRange = expenseDate >= startOfWeek;
            } else if (timeFilter.period === 'month') {
                 const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
                 isInDateRange = expenseDate >= startOfMonth;
            } else if (timeFilter.period === 'custom' && timeFilter.startDate && timeFilter.endDate) {
                 const startDate = new Date(timeFilter.startDate); startDate.setHours(0,0,0,0);
                 const endDate = new Date(timeFilter.endDate); endDate.setHours(23,59,59,999);
                 isInDateRange = expenseDate >= startDate && expenseDate <= endDate;
            }
            return isInDateRange;
        });
    }, [expenses, timeFilter]);
    
    // --- Render Logic ---
    const finalLoadError = loadError || dataLoadError;
    if (finalLoadError) {
        return (
            <div className="flex h-screen w-screen items-center justify-center bg-slate-900 p-4">
                <div className="text-center max-w-md">
                    <ExclamationCircleIcon className="h-12 w-12 text-red-400 mx-auto mb-4"/>
                    <h2 className="text-2xl font-bold text-slate-100">Failed to Load Data</h2>
                    <p className="text-slate-400 mt-2">{finalLoadError}</p>
                    <button onClick={() => window.location.reload()} className="mt-6 px-6 py-2 bg-primary-600 text-white font-semibold rounded-lg shadow-md hover:bg-primary-700">Try Again</button>
                </div>
            </div>
        );
    }

    const pageContent = useMemo(() => {
        switch (currentPage) {
            case 'dashboard': return <DashboardPage transactions={filteredTransactions} expenses={filteredExpenses} timeFilter={timeFilter} setTimeFilter={setTimeFilter} />;
            case 'transactions': return <TransactionsPage transactions={filteredTransactions} onEdit={openModal} onDelete={(id) => setTransactionToDelete(id)} onSetReminder={(t) => setTransactionForReminder(t)} reminders={reminders} sortConfig={sortConfig} setSortConfig={setSortConfig} timeFilter={timeFilter} setTimeFilter={setTimeFilter} searchQuery={searchQuery} setSearchQuery={setSearchQuery} statusFilter={statusFilter} setStatusFilter={setStatusFilter} isEditMode={isEditMode} />;
            case 'reports': return <ReportsPage transactions={transactions} expenses={expenses} isEditMode={isEditMode} />;
            case 'expenses': return <ExpensesPage expenses={expenses} onAddExpense={addExpense} onUpdateExpense={updateExpense} onDeleteExpense={deleteExpense} isEditMode={isEditMode} expenseCategories={expenseCategories} />;
            case 'receivables': return <ReceivablesPage receivables={receivables} onAddReceivable={addReceivable} onUpdateReceivable={updateReceivable} onDeleteReceivable={deleteReceivable} isEditMode={isEditMode} />;
            case 'calculator': return <CalculatorPage calculations={calculations} onAddCalculation={addCalculation} onUpdateCalculation={updateCalculation} onDeleteCalculation={deleteCalculation} isEditMode={isEditMode} />;
            case 'settings': return <SettingsPage currentSettings={settings} onSave={(s) => handleSaveSettings(s, isEditMode)} isEditMode={isEditMode} services={services} onAddService={addService} onUpdateService={updateService} onDeleteService={deleteService} expenseCategories={expenseCategories} onAddExpenseCategory={addExpenseCategory} onUpdateExpenseCategory={updateExpenseCategory} onDeleteExpenseCategory={deleteExpenseCategory} allData={{transactions, expenses, receivables, calculations, services, expenseCategories, settings}} onRestoreData={restoreData} />;
            default: return <DashboardPage transactions={filteredTransactions} expenses={filteredExpenses} timeFilter={timeFilter} setTimeFilter={setTimeFilter} />;
        }
    }, [currentPage, filteredTransactions, filteredExpenses, timeFilter, searchQuery, statusFilter, sortConfig, transactions, calculations, reminders, settings, isEditMode, services, expenses, expenseCategories, receivables, addCalculation, updateCalculation, deleteCalculation, handleSaveSettings, addService, updateService, deleteService, addExpense, updateExpense, deleteExpense, addExpenseCategory, updateExpenseCategory, deleteExpenseCategory, addReceivable, updateReceivable, deleteReceivable, restoreData]);

    return (
        <div className="flex h-screen bg-slate-900 text-slate-300 font-sans">
            <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} currentPage={currentPage} setCurrentPage={setCurrentPage} isEditMode={isEditMode} />
            <div className="flex-1 flex flex-col overflow-hidden lg:ml-64">
                <Header onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)} isOnline={isOnline} isSyncing={isSyncing} isEditMode={isEditMode} onToggleEditMode={handleToggleEditMode} isLoading={isAuthLoading || isDataLoading} />
                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-slate-900 no-scrollbar">
                    <div className="container mx-auto px-4 md:px-6 py-4">{pageContent}</div>
                </main>
            </div>

            {isModalOpen && <TransactionForm isOpen={isModalOpen} onClose={closeModalAndReset} onSubmit={handleAddOrUpdateTransaction} initialData={editingTransaction} prefilledData={prefilledData} services={services} transactions={transactions} />}
            {transactionToDelete && <ConfirmationModal isOpen={!!transactionToDelete} onClose={() => setTransactionToDelete(null)} onConfirm={() => { if (transactionToDelete) deleteTransaction(transactionToDelete); setTransactionToDelete(null); }} title="Delete Transaction" message="Are you sure you want to delete this transaction? This action cannot be undone." />}
            {transactionForReminder && <ReminderModal isOpen={!!transactionForReminder} onClose={() => setTransactionForReminder(null)} onSetReminder={handleSetReminder} transaction={transactionForReminder} />}
            {isAuthModalOpen && <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} onAuthSuccess={handleAuthSuccess} />}

            {currentPage === 'transactions' && isEditMode && (
                <button onClick={() => openModal()} className="fixed right-6 bottom-6 bg-primary-500 text-white rounded-full p-4 shadow-lg hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-primary-500 transition-all duration-300 transform hover:scale-110 z-30" aria-label="Add new transaction">
                    <PlusIcon />
                </button>
            )}
        </div>
    );
};

export default App;

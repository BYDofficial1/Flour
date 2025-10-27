import React, { useState, useMemo } from 'react';
import type { Transaction, Expense } from '../types';
import { formatCurrency } from '../utils/currency';
import { exportMonthlyReportToTxt } from '../utils/export';
import { ExportIcon } from '../components/icons/ExportIcon';
import { RupeeIcon } from '../components/icons/RupeeIcon';
import { WeightIcon } from '../components/icons/WeightIcon';
import { ChartIcon } from '../components/icons/ChartIcon';
import { ExclamationCircleIcon } from '../components/icons/ExclamationCircleIcon';
import { DocumentPlusIcon } from '../components/icons/DocumentPlusIcon';
import { SortIcon } from '../components/icons/SortIcon';
import { ReceiptIcon } from '../components/icons/ReceiptIcon';
import ExpenseBreakdownChart from '../components/ExpenseBreakdownChart';

interface ReportsPageProps {
    transactions: Transaction[];
    expenses: Expense[];
    isEditMode: boolean;
}

const StatCard: React.FC<{ title: string; value: React.ReactNode; icon: React.ReactNode; colorClass?: string }> = ({ title, value, icon, colorClass = 'text-primary-400' }) => (
    <div className="bg-slate-800 p-4 rounded-xl shadow-md flex items-center space-x-4 border border-slate-700">
        <div className={`p-3 rounded-lg ${colorClass.replace('text-', 'bg-')}/10`}>
            {React.cloneElement(icon as React.ReactElement, { className: `h-6 w-6 ${colorClass}` })}
        </div>
        <div>
            <p className="text-sm text-slate-400 font-medium">{title}</p>
            <div className="text-xl font-bold text-slate-100">{value}</div>
        </div>
    </div>
);


const StatusBadge: React.FC<{ status: Transaction['payment_status'] | 'settled' }> = ({ status }) => {
    const baseClasses = "px-2 py-0.5 text-xs font-semibold rounded-full capitalize";
    const styles = {
        paid: 'bg-green-500/20 text-green-300',
        unpaid: 'bg-red-500/20 text-red-300',
        partial: 'bg-yellow-500/20 text-yellow-300',
        settled: 'bg-blue-500/20 text-blue-300',
    };
    return <span className={`${baseClasses} ${styles[status]}`}>{status}</span>;
};


type SortKey = 'date' | 'total' | 'customer_name';

const ReportsPage: React.FC<ReportsPageProps> = ({ transactions, expenses, isEditMode }) => {
    const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().substring(0, 7)); // YYYY-MM
    const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'ascending' | 'descending' }>({ key: 'date', direction: 'descending' });

    const { monthlyTransactions, monthlyExpenses, stats } = useMemo(() => {
        if (!selectedDate) {
            return { monthlyTransactions: [], monthlyExpenses: [], stats: { totalSales: 0, totalQuantity: 0, totalTransactions: 0, totalDue: 0, totalExpenses: 0, netProfit: 0 }};
        }
        
        const [year, month] = selectedDate.split('-').map(Number);
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59);

        const filteredTransactions = transactions.filter(t => {
            const transactionDate = new Date(t.date);
            return transactionDate >= startDate && transactionDate <= endDate;
        });
        
        const filteredExpenses = expenses.filter(e => {
            const expenseDate = new Date(e.date);
            return expenseDate >= startDate && expenseDate <= endDate;
        });

        const sortedTransactions = [...filteredTransactions].sort((a, b) => {
            const dir = sortConfig.direction === 'ascending' ? 1 : -1;
            if (sortConfig.key === 'date') return (new Date(a.date).getTime() - new Date(b.date).getTime()) * dir;
            if (sortConfig.key === 'total') return (a.total - b.total) * dir;
            if (sortConfig.key === 'customer_name') return a.customer_name.localeCompare(b.customer_name) * dir;
            return 0;
        });

        const monthlyStats = filteredTransactions.reduce((acc, t) => {
            acc.totalSales += t.total;
            acc.totalQuantity += t.quantity;
            if (t.payment_status !== 'paid' && !t.is_settled) {
                acc.totalDue += t.total - (t.paid_amount || 0);
            }
            return acc;
        }, { totalSales: 0, totalQuantity: 0, totalTransactions: filteredTransactions.length, totalDue: 0 });
        
        const totalExpenses = filteredExpenses.reduce((acc, e) => acc + e.amount, 0);
        const netProfit = monthlyStats.totalSales - totalExpenses;
        
        return { 
            monthlyTransactions: sortedTransactions,
            monthlyExpenses: filteredExpenses,
            stats: { ...monthlyStats, totalExpenses, netProfit } 
        };
    }, [transactions, expenses, selectedDate, sortConfig]);
    
    const handleExport = () => {
        const [year, month] = selectedDate.split('-').map(Number);
        const dateForReport = new Date(year, month - 1, 1);
        exportMonthlyReportToTxt(monthlyTransactions, dateForReport, stats);
    };

    const requestSort = (key: SortKey) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const getSortDirection = (key: SortKey): 'asc' | 'desc' | 'none' => {
        if (!sortConfig || sortConfig.key !== key) return 'none';
        return sortConfig.direction === 'ascending' ? 'asc' : 'desc';
    }


    return (
        <div className="mt-4 space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <h2 className="text-2xl font-bold text-slate-200">Monthly Reports</h2>
                <div className="flex items-center gap-4">
                    <input 
                        type="month"
                        value={selectedDate}
                        onChange={e => setSelectedDate(e.target.value)}
                        className="px-3 py-2 bg-slate-700 text-slate-100 border border-slate-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-primary-500 transition-colors"
                    />
                    <button
                        onClick={handleExport}
                        disabled={monthlyTransactions.length === 0 || !isEditMode}
                        title={!isEditMode ? "Unlock Edit Mode to export" : "Export monthly report"}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-600 text-white rounded-lg shadow-md hover:bg-slate-700 disabled:bg-slate-700/50 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors"
                    >
                        <ExportIcon />
                        <span className="font-semibold hidden sm:inline">Export</span>
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-5 gap-8">
                {/* Left Column: Stats & Expense Chart */}
                <div className="xl:col-span-2 space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2 gap-6">
                        <StatCard 
                            title="Total Sales (Revenue)"
                            value={formatCurrency(stats.totalSales)}
                            icon={<RupeeIcon />}
                            colorClass="text-green-400"
                        />
                        <StatCard 
                            title="Total Expenses"
                            value={formatCurrency(stats.totalExpenses)}
                            icon={<ReceiptIcon />}
                            colorClass="text-red-400"
                        />
                         <StatCard 
                            title="Net Profit"
                            value={formatCurrency(stats.netProfit)}
                            icon={<RupeeIcon />}
                            colorClass={stats.netProfit >= 0 ? "text-primary-400" : "text-red-400"}
                        />
                        <StatCard 
                            title="Total Due"
                            value={formatCurrency(stats.totalDue)}
                            icon={<ExclamationCircleIcon />}
                            colorClass="text-amber-400"
                        />
                        <StatCard 
                            title="Total Quantity"
                            value={`${stats.totalQuantity.toLocaleString()} kg`}
                            icon={<WeightIcon />}
                        />
                        <StatCard 
                            title="Total Transactions"
                            value={stats.totalTransactions.toString()}
                            icon={<ChartIcon />}
                        />
                    </div>
                    <ExpenseBreakdownChart expenses={monthlyExpenses} />
                </div>
                
                {/* Right Column: Transaction List */}
                <div className="xl:col-span-3 bg-slate-800 p-4 rounded-xl shadow-md border border-slate-700">
                     <h3 className="text-lg font-bold text-slate-100 mb-4">
                        Transactions for {new Date(selectedDate + '-02').toLocaleString('default', { month: 'long', year: 'numeric' })}
                     </h3>
                     {monthlyTransactions.length > 0 ? (
                        <div className="space-y-3">
                             {/* Header for sorting */}
                            <div className="hidden lg:grid grid-cols-5 gap-4 px-4 text-xs text-slate-400 font-bold uppercase">
                                 <button onClick={() => requestSort('date')} className="flex items-center hover:text-white">Date <SortIcon direction={getSortDirection('date')} /></button>
                                 <button onClick={() => requestSort('customer_name')} className="col-span-2 flex items-center hover:text-white">Customer <SortIcon direction={getSortDirection('customer_name')} /></button>
                                 <button onClick={() => requestSort('total')} className="flex items-center justify-end hover:text-white">Total <SortIcon direction={getSortDirection('total')} /></button>
                                 <span className="text-right">Status</span>
                            </div>
                            {monthlyTransactions.map(t => {
                                const effectiveStatus = t.is_settled ? 'settled' : t.payment_status;
                                return (
                                <div key={t.id} className="bg-slate-800/50 hover:bg-slate-700/50 transition-colors duration-200 p-4 rounded-lg grid grid-cols-2 lg:grid-cols-5 gap-x-4 gap-y-2 items-center text-sm">
                                    <div className="lg:col-span-1">
                                        <p className="font-semibold text-slate-100">{new Date(t.date).toLocaleDateString('en-CA')}</p>
                                    </div>
                                   <div className="col-span-2 lg:col-span-2">
                                        <p className="font-bold text-slate-100 truncate">{t.customer_name}</p>
                                        <p className="text-slate-400 truncate">{t.item} - {t.quantity.toFixed(2)}kg</p>
                                   </div>
                                    <div className="lg:col-span-1 text-right">
                                        <p className="font-bold text-primary-400">{formatCurrency(t.total)}</p>
                                   </div>
                                    <div className="lg:col-span-1 flex justify-end">
                                        <StatusBadge status={effectiveStatus} />
                                    </div>
                                </div>
                            )})}
                        </div>
                     ) : (
                        <div className="text-center py-16 px-6">
                            <DocumentPlusIcon />
                            <h3 className="text-xl font-semibold text-slate-200 mt-4">No transactions found for this month.</h3>
                            <p className="text-slate-400 mt-2">Select a different month or add new transactions.</p>
                        </div>
                     )}
                </div>
            </div>
        </div>
    );
};

export default ReportsPage;
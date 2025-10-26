import React, { useState, useMemo } from 'react';
import type { Transaction } from '../types';
import { formatCurrency } from '../utils/currency';
import { exportMonthlyReportToTxt } from '../utils/export';
import { ExportIcon } from '../components/icons/ExportIcon';
import { RupeeIcon } from '../components/icons/RupeeIcon';
import { WeightIcon } from '../components/icons/WeightIcon';
import { ChartIcon } from '../components/icons/ChartIcon';
import { ExclamationCircleIcon } from '../components/icons/ExclamationCircleIcon';
import { DocumentPlusIcon } from '../components/icons/DocumentPlusIcon';
import { SortIcon } from '../components/icons/SortIcon';

interface ReportsPageProps {
    transactions: Transaction[];
    isEditMode: boolean;
}

const StatCard: React.FC<{ title: string; value: React.ReactNode; icon: React.ReactNode }> = ({ title, value, icon }) => (
    <div className="bg-slate-800 p-4 rounded-xl shadow-md flex items-center space-x-4 border border-slate-700">
        <div className="bg-primary-500/10 p-3 rounded-lg">
            {icon}
        </div>
        <div>
            <p className="text-sm text-slate-400 font-medium">{title}</p>
            <div className="text-xl font-bold text-slate-100">{value}</div>
        </div>
    </div>
);

const StatusBadge: React.FC<{ status: Transaction['payment_status'] }> = ({ status }) => {
    const baseClasses = "px-2 py-0.5 text-xs font-semibold rounded-full capitalize";
    const styles = {
        paid: 'bg-green-500/20 text-green-300',
        unpaid: 'bg-red-500/20 text-red-300',
        partial: 'bg-yellow-500/20 text-yellow-300',
    };
    return <span className={`${baseClasses} ${styles[status]}`}>{status}</span>;
};


type SortKey = 'date' | 'total' | 'customer_name';

const ReportsPage: React.FC<ReportsPageProps> = ({ transactions, isEditMode }) => {
    const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().substring(0, 7)); // YYYY-MM
    const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'ascending' | 'descending' }>({ key: 'date', direction: 'descending' });

    const { monthlyTransactions, stats } = useMemo(() => {
        if (!selectedDate) {
            return { monthlyTransactions: [], stats: { totalSales: 0, totalQuantity: 0, totalTransactions: 0, totalDue: 0 }};
        }
        
        const [year, month] = selectedDate.split('-').map(Number);
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59);

        const filtered = transactions.filter(t => {
            const transactionDate = new Date(t.date);
            return transactionDate >= startDate && transactionDate <= endDate;
        });

        const sortedTransactions = [...filtered];

        if (sortConfig) {
            sortedTransactions.sort((a, b) => {
                let aValue: string | number;
                let bValue: string | number;

                switch (sortConfig.key) {
                    case 'date':
                        aValue = new Date(a.date).getTime();
                        bValue = new Date(b.date).getTime();
                        break;
                    case 'total':
                        aValue = a.total;
                        bValue = b.total;
                        break;
                    case 'customer_name':
                        aValue = a.customer_name.toLowerCase();
                        bValue = b.customer_name.toLowerCase();
                        break;
                    default:
                        return 0;
                }
                
                if (aValue < bValue) {
                    return sortConfig.direction === 'ascending' ? -1 : 1;
                }
                if (aValue > bValue) {
                    return sortConfig.direction === 'ascending' ? 1 : -1;
                }
                return 0;
            });
        }

        const monthlyStats = filtered.reduce((acc, t) => {
            acc.totalSales += t.total;
            acc.totalQuantity += t.quantity;
            if (t.payment_status !== 'paid') {
                acc.totalDue += t.total - (t.paid_amount || 0);
            }
            return acc;
        }, { totalSales: 0, totalQuantity: 0, totalTransactions: filtered.length, totalDue: 0 });
        
        return { monthlyTransactions: sortedTransactions, stats: monthlyStats };
    }, [transactions, selectedDate, sortConfig]);
    
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
                        <span className="font-semibold">Export TXT</span>
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                 <StatCard 
                    title="Total Sales"
                    value={formatCurrency(stats.totalSales)}
                    icon={<RupeeIcon className="text-primary-400 h-6 w-6" />}
                />
                <StatCard 
                    title="Total Quantity"
                    value={`${stats.totalQuantity.toLocaleString()} kg`}
                    icon={<WeightIcon className="text-primary-400 h-6 w-6" />}
                />
                 <StatCard 
                    title="Total Due"
                    value={formatCurrency(stats.totalDue)}
                    icon={<ExclamationCircleIcon className="text-red-400 h-6 w-6" />}
                />
                <StatCard 
                    title="Total Transactions"
                    value={stats.totalTransactions.toString()}
                    icon={<ChartIcon className="text-primary-400 h-6 w-6" />}
                />
            </div>

            <div className="bg-slate-800 p-4 rounded-xl shadow-md border border-slate-700">
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
                        {monthlyTransactions.map(t => (
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
                                    <StatusBadge status={t.payment_status} />
                                </div>
                            </div>
                        ))}
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
    );
};

export default ReportsPage;
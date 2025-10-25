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

const DashboardCard: React.FC<{ title: string; value: React.ReactNode; icon: React.ReactNode }> = ({ title, value, icon }) => (
    <div className="bg-slate-800 p-6 rounded-xl shadow-md flex items-center space-x-4 border border-slate-700">
        <div className="bg-primary-500/10 p-3 rounded-full">
            {icon}
        </div>
        <div>
            <p className="text-sm text-slate-400 font-medium">{title}</p>
            <div className="text-2xl font-bold text-slate-100">{value}</div>
        </div>
    </div>
);

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
                 <DashboardCard 
                    title="Total Sales"
                    value={formatCurrency(stats.totalSales)}
                    icon={<RupeeIcon className="text-primary-400" />}
                />
                <DashboardCard 
                    title="Total Quantity"
                    value={`${stats.totalQuantity.toLocaleString()} kg`}
                    icon={<WeightIcon className="text-primary-400" />}
                />
                 <DashboardCard 
                    title="Total Due"
                    value={formatCurrency(stats.totalDue)}
                    icon={<ExclamationCircleIcon className="text-red-400" />}
                />
                <DashboardCard 
                    title="Total Transactions"
                    value={stats.totalTransactions.toString()}
                    icon={<ChartIcon className="text-primary-400" />}
                />
            </div>

            <div className="bg-slate-800 p-4 rounded-lg shadow-md border border-slate-700">
                 <h3 className="text-lg font-bold text-slate-100 mb-4">
                    Transactions for {new Date(selectedDate + '-02').toLocaleString('default', { month: 'long', year: 'numeric' })}
                 </h3>
                 {monthlyTransactions.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-slate-400">
                             <thead className="text-xs text-slate-300 uppercase bg-slate-900/70">
                                <tr>
                                    <th scope="col" className="px-4 py-3 font-semibold hover:bg-slate-700/80 transition-colors cursor-pointer rounded-tl-lg" onClick={() => requestSort('date')}>
                                        <div className="flex items-center">
                                            Date
                                            <SortIcon direction={getSortDirection('date')} />
                                        </div>
                                    </th>
                                    <th scope="col" className="px-4 py-3 font-semibold hover:bg-slate-700/80 transition-colors cursor-pointer" onClick={() => requestSort('customer_name')}>
                                        <div className="flex items-center">
                                            Customer
                                            <SortIcon direction={getSortDirection('customer_name')} />
                                        </div>
                                    </th>
                                    <th scope="col" className="px-4 py-3 font-semibold">Item</th>
                                    <th scope="col" className="px-4 py-3 font-semibold text-right">Quantity</th>
                                    <th scope="col" className="px-4 py-3 font-semibold text-right hover:bg-slate-700/80 transition-colors cursor-pointer" onClick={() => requestSort('total')}>
                                        <div className="flex items-center justify-end">
                                            Total
                                            <SortIcon direction={getSortDirection('total')} />
                                        </div>
                                    </th>
                                    <th scope="col" className="px-4 py-3 font-semibold text-center rounded-tr-lg">Status</th>
                                </tr>
                             </thead>
                             <tbody>
                                {monthlyTransactions.map(t => (
                                    <tr key={t.id} className="bg-slate-800 border-b border-slate-700 hover:bg-slate-700/50">
                                        <td className="px-4 py-3 whitespace-nowrap">{new Date(t.date).toLocaleDateString('en-CA')}</td>
                                        <td className="px-4 py-3 font-medium text-slate-200">{t.customer_name}</td>
                                        <td className="px-4 py-3">{t.item}</td>
                                        <td className="px-4 py-3 text-right">{t.quantity.toFixed(2)} kg</td>
                                        <td className="px-4 py-3 text-right font-semibold text-primary-400">{formatCurrency(t.total)}</td>
                                        <td className="px-4 py-3 text-center capitalize">{t.payment_status}</td>
                                    </tr>
                                ))}
                             </tbody>
                        </table>
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
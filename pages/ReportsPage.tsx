

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

interface ReportsPageProps {
    transactions: Transaction[];
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

const ReportsPage: React.FC<ReportsPageProps> = ({ transactions }) => {
    const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().substring(0, 7)); // YYYY-MM

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

        const monthlyStats = filtered.reduce((acc, t) => {
            acc.totalSales += t.total;
            acc.totalQuantity += t.quantity;
            if (t.paymentStatus !== 'paid') {
                acc.totalDue += t.total - (t.paidAmount || 0);
            }
            return acc;
        }, { totalSales: 0, totalQuantity: 0, totalTransactions: filtered.length, totalDue: 0 });
        
        return { monthlyTransactions: filtered, stats: monthlyStats };
    }, [transactions, selectedDate]);
    
    const handleExport = () => {
        const [year, month] = selectedDate.split('-').map(Number);
        const dateForReport = new Date(year, month - 1, 1);
        exportMonthlyReportToTxt(monthlyTransactions, dateForReport, stats);
    };

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
                        disabled={monthlyTransactions.length === 0}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-600 text-white rounded-lg shadow-md hover:bg-slate-500 disabled:bg-slate-500/50 disabled:cursor-not-allowed transition-colors"
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
                                    <th scope="col" className="px-4 py-3 font-semibold">Date</th>
                                    <th scope="col" className="px-4 py-3 font-semibold">Customer</th>
                                    <th scope="col" className="px-4 py-3 font-semibold">Item</th>
                                    <th scope="col" className="px-4 py-3 font-semibold text-right">Quantity</th>
                                    <th scope="col" className="px-4 py-3 font-semibold text-right">Total</th>
                                    <th scope="col" className="px-4 py-3 font-semibold text-center">Status</th>
                                </tr>
                             </thead>
                             <tbody>
                                {monthlyTransactions.map(t => (
                                    <tr key={t.id} className="bg-slate-800 border-b border-slate-700 hover:bg-slate-700/50">
                                        <td className="px-4 py-3">{new Date(t.date).toLocaleDateString('en-CA')}</td>
                                        <td className="px-4 py-3 font-medium text-slate-200">{t.customerName}</td>
                                        <td className="px-4 py-3">{t.item}</td>
                                        <td className="px-4 py-3 text-right">{t.quantity.toFixed(2)} kg</td>
                                        <td className="px-4 py-3 text-right font-semibold text-primary-400">{formatCurrency(t.total)}</td>
                                        <td className="px-4 py-3 text-center capitalize">{t.paymentStatus}</td>
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
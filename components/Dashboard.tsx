import React, { useMemo } from 'react';
import type { Transaction, Expense } from '../types';
import { ChartIcon } from './icons/ChartIcon';
import { RupeeIcon } from './icons/RupeeIcon';
import { WeightIcon } from './icons/WeightIcon';
import { formatCurrency } from '../utils/currency';
import { ExclamationCircleIcon } from './icons/ExclamationCircleIcon';
import { ReceiptIcon } from './icons/ReceiptIcon';
import { ArrowTrendingUpIcon } from './icons/ArrowTrendingUpIcon';
import { ArrowTrendingDownIcon } from './icons/ArrowTrendingDownIcon';

interface DashboardProps {
    transactions: Transaction[];
    expenses: Expense[];
}

const DashboardCard: React.FC<{ title: string; value: React.ReactNode; icon: React.ReactNode; iconBgClass?: string; }> = ({ title, value, icon, iconBgClass }) => (
    <div className="bg-gradient-to-br from-slate-800 to-slate-800/80 p-6 rounded-2xl shadow-lg shadow-black/20 border border-slate-700 flex flex-col justify-between gap-4 group transition-all duration-300 hover:shadow-primary-500/10 hover:-translate-y-1">
        <div className="flex justify-between items-start">
            <p className="text-sm text-slate-400 font-medium">{title}</p>
            <div className={`p-3 rounded-lg ${iconBgClass || 'bg-primary-500/10'} transition-transform duration-300 ease-in-out group-hover:scale-110`}>
                {icon}
            </div>
        </div>
        <div className="text-4xl font-bold text-slate-100">{value}</div>
    </div>
);

const ProfitCard: React.FC<{ value: number }> = ({ value }) => {
    const isProfit = value >= 0;
    return (
        <DashboardCard
            title="Net Profit"
            value={formatCurrency(value)}
            icon={isProfit ? <ArrowTrendingUpIcon className="text-primary-400 h-6 w-6" /> : <ArrowTrendingDownIcon className="text-red-400 h-6 w-6" />}
            iconBgClass={isProfit ? 'bg-primary-500/10' : 'bg-red-500/10'}
        />
    );
};


const Dashboard: React.FC<DashboardProps> = ({ transactions, expenses }) => {
    const stats = useMemo(() => {
        const totalSales = transactions.reduce((acc, t) => acc + t.total, 0);
        const totalQuantity = transactions.reduce((acc, t) => acc + t.quantity, 0);
        const totalTransactions = transactions.length;

        const totalDue = transactions.reduce((acc, t) => {
            if (t.payment_status !== 'paid') {
                const due = t.total - (t.paid_amount || 0);
                return acc + due;
            }
            return acc;
        }, 0);
        
        const totalExpenses = expenses.reduce((acc, e) => acc + e.amount, 0);
        const netProfit = totalSales - totalExpenses;

        return { 
            totalSales, 
            totalQuantity, 
            totalTransactions,
            totalDue,
            totalExpenses,
            netProfit,
        };
    }, [transactions, expenses]);
    
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <DashboardCard 
                title="Total Sales"
                value={formatCurrency(stats.totalSales)}
                icon={<RupeeIcon className="text-green-400 h-6 w-6" />}
                iconBgClass="bg-green-500/10"
            />
            <DashboardCard 
                title="Total Expenses"
                value={formatCurrency(stats.totalExpenses)}
                icon={<ReceiptIcon className="text-amber-400 h-6 w-6" />}
                iconBgClass="bg-amber-500/10"
            />
            <ProfitCard value={stats.netProfit} />
            <DashboardCard 
                title="Total Quantity"
                value={`${stats.totalQuantity.toLocaleString()} kg`}
                icon={<WeightIcon className="text-blue-400 h-6 w-6" />}
                iconBgClass="bg-blue-500/10"
            />
             <DashboardCard 
                title="Total Due"
                value={formatCurrency(stats.totalDue)}
                icon={<ExclamationCircleIcon className="text-red-400 h-6 w-6" />}
                iconBgClass="bg-red-500/10"
            />
            <DashboardCard 
                title="Total Transactions"
                value={stats.totalTransactions.toString()}
                icon={<ChartIcon className="text-indigo-400 h-6 w-6" />}
                iconBgClass="bg-indigo-500/10"
            />
        </div>
    );
};

export default Dashboard;
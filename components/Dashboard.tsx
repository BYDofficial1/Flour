

import React, { useMemo } from 'react';
import type { Transaction } from '../types';
import { ChartIcon } from './icons/ChartIcon';
import { RupeeIcon } from './icons/RupeeIcon';
import { WeightIcon } from './icons/WeightIcon';
import { TrendingUpIcon } from './icons/TrendingUpIcon';
import { formatCurrency } from '../utils/currency';
import { ExclamationCircleIcon } from './icons/ExclamationCircleIcon';

interface DashboardProps {
    transactions: Transaction[];
}

const DashboardCard: React.FC<{ title: string; value: React.ReactNode; icon: React.ReactNode; iconBgClass?: string; }> = ({ title, value, icon, iconBgClass }) => (
    <div className="bg-slate-800 p-6 rounded-2xl shadow-2xl shadow-black/20 hover:-translate-y-1 transition-all duration-300 ease-in-out flex items-center space-x-4 border border-slate-700">
        <div className={`p-4 rounded-lg ${iconBgClass || 'bg-primary-500/10'}`}>
            {icon}
        </div>
        <div>
            <p className="text-sm text-slate-400 font-medium">{title}</p>
            <div className="text-3xl font-bold text-slate-100">{value}</div>
        </div>
    </div>
);


const Dashboard: React.FC<DashboardProps> = ({ transactions }) => {
    const stats = useMemo(() => {
        if (transactions.length === 0) {
            return {
                totalSales: 0,
                totalQuantity: 0,
                totalTransactions: 0,
                averageDailySales: 0,
                averageDailyQuantity: 0,
                totalDue: 0,
            };
        }

        const totalSales = transactions.reduce((acc, t) => acc + t.total, 0);
        const totalQuantity = transactions.reduce((acc, t) => acc + t.quantity, 0);
        const totalTransactions = transactions.length;

        const totalDue = transactions.reduce((acc, t) => {
            if (t.paymentStatus !== 'paid') {
                const due = t.total - (t.paidAmount || 0);
                return acc + due;
            }
            return acc;
        }, 0);

        const uniqueDays = new Set(
            transactions.map(t => new Date(t.date).toLocaleDateString('en-CA'))
        ).size;

        const averageDailySales = uniqueDays > 0 ? totalSales / uniqueDays : 0;
        const averageDailyQuantity = uniqueDays > 0 ? totalQuantity / uniqueDays : 0;

        return { 
            totalSales, 
            totalQuantity, 
            totalTransactions,
            averageDailySales,
            averageDailyQuantity,
            totalDue,
        };
    }, [transactions]);
    
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <DashboardCard 
                title="Total Sales"
                value={formatCurrency(stats.totalSales)}
                icon={<RupeeIcon className="text-green-400 h-7 w-7" />}
                iconBgClass="bg-green-500/10"
            />
            <DashboardCard 
                title="Total Quantity"
                value={`${stats.totalQuantity.toLocaleString()} kg`}
                icon={<WeightIcon className="text-blue-400 h-7 w-7" />}
                iconBgClass="bg-blue-500/10"
            />
             <DashboardCard 
                title="Total Due"
                value={formatCurrency(stats.totalDue)}
                icon={<ExclamationCircleIcon className="text-red-400 h-7 w-7" />}
                iconBgClass="bg-red-500/10"
            />
            <DashboardCard 
                title="Total Transactions"
                value={stats.totalTransactions.toString()}
                icon={<ChartIcon className="text-indigo-400 h-7 w-7" />}
                iconBgClass="bg-indigo-500/10"
            />
        </div>
    );
};

export default Dashboard;
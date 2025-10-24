

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
    <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-xl hover:scale-[1.03] transition-all duration-300 ease-in-out flex items-center space-x-4 border border-primary-200/50">
        <div className={`p-3 rounded-full ${iconBgClass || 'bg-primary-100'}`}>
            {icon}
        </div>
        <div>
            <p className="text-sm text-slate-500 font-medium">{title}</p>
            <div className="text-2xl font-bold text-slate-800">{value}</div>
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
                icon={<RupeeIcon className="text-green-600" />}
                iconBgClass="bg-green-100"
            />
            <DashboardCard 
                title="Total Quantity"
                value={`${stats.totalQuantity.toLocaleString()} kg`}
                icon={<WeightIcon className="text-blue-600" />}
                iconBgClass="bg-blue-100"
            />
             <DashboardCard 
                title="Total Due"
                value={formatCurrency(stats.totalDue)}
                icon={<ExclamationCircleIcon className="text-red-600" />}
                iconBgClass="bg-red-100"
            />
            <DashboardCard 
                title="Total Transactions"
                value={stats.totalTransactions.toString()}
                icon={<ChartIcon className="text-indigo-600" />}
                iconBgClass="bg-indigo-100"
            />
        </div>
    );
};

export default Dashboard;
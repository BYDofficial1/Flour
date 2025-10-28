import React, { useMemo } from 'react';
import type { Transaction, Expense } from '../types';
import type { TimeFilter } from '../App';
import Dashboard from '../components/Dashboard';
import TimeFilterControls from '../components/TimeFilterControls';
import ItemTrendsChart from '../components/DailySales';

interface DashboardPageProps {
    transactions: Transaction[];
    expenses: Expense[];
    timeFilter: TimeFilter;
    setTimeFilter: (filter: TimeFilter) => void;
}

const DashboardPage: React.FC<DashboardPageProps> = ({ transactions, expenses, timeFilter, setTimeFilter }) => {

    const filteredExpenses = useMemo(() => {
        return expenses.filter(e => {
            const expenseDate = new Date(e.date);
            let isInDateRange = true;
            if (timeFilter.period === 'today') {
                 const startOfDay = new Date();
                 startOfDay.setHours(0, 0, 0, 0);
                 isInDateRange = expenseDate >= startOfDay;
            } else if (timeFilter.period === 'week') {
                 const startOfWeek = new Date();
                 startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
                 startOfWeek.setHours(0, 0, 0, 0);
                 isInDateRange = expenseDate >= startOfWeek;
            } else if (timeFilter.period === 'month') {
                 const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
                 isInDateRange = expenseDate >= startOfMonth;
            } else if (timeFilter.period === 'custom' && timeFilter.startDate && timeFilter.endDate) {
                 const startDate = new Date(timeFilter.startDate);
                 startDate.setHours(0,0,0,0);
                 const endDate = new Date(timeFilter.endDate);
                 endDate.setHours(23,59,59,999);
                 isInDateRange = expenseDate >= startDate && expenseDate <= endDate;
            }
            return isInDateRange;
        });
    }, [expenses, timeFilter]);

    return (
        <div className="space-y-8 mt-4">
             <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                 <h2 className="text-2xl font-bold text-slate-200">Dashboard</h2>
                 <TimeFilterControls timeFilter={timeFilter} setTimeFilter={setTimeFilter} isPrimary={true} />
            </div>

            <Dashboard transactions={transactions} expenses={filteredExpenses} />
            
            <div className="grid grid-cols-1 gap-6">
                <ItemTrendsChart transactions={transactions} />
            </div>
        </div>
    );
};

export default DashboardPage;
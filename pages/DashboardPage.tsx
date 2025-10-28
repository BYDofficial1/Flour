import React from 'react';
import type { Transaction, Expense } from '../types';
import type { TimeFilter } from '../App';
import Dashboard from '../components/Dashboard';
import TimeFilterControls from '../components/TimeFilterControls';
import ItemTrendsChart from '../components/DailySales';
import ExpenseBreakdownChart from '../components/ExpenseBreakdownChart';

interface DashboardPageProps {
    transactions: Transaction[];
    expenses: Expense[]; // Now expects pre-filtered expenses
    timeFilter: TimeFilter;
    setTimeFilter: (filter: TimeFilter) => void;
}

const DashboardPage: React.FC<DashboardPageProps> = ({ transactions, expenses, timeFilter, setTimeFilter }) => {
    return (
        <div className="space-y-8 mt-4">
             <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                 <h2 className="text-2xl font-bold text-slate-200">Dashboard</h2>
                 <TimeFilterControls timeFilter={timeFilter} setTimeFilter={setTimeFilter} isPrimary={true} />
            </div>

            <Dashboard transactions={transactions} expenses={expenses} />
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ItemTrendsChart transactions={transactions} />
                <ExpenseBreakdownChart expenses={expenses} />
            </div>
        </div>
    );
};

export default DashboardPage;

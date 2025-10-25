import React from 'react';
import type { Transaction } from '../types';
import type { TimeFilter } from '../App';
import Dashboard from '../components/Dashboard';
import ItemTrendsChart from '../components/DailySales';
import TimeFilterControls from '../components/TimeFilterControls';

interface DashboardPageProps {
    transactions: Transaction[];
    timeFilter: TimeFilter;
    setTimeFilter: (filter: TimeFilter) => void;
}

const DashboardPage: React.FC<DashboardPageProps> = ({ transactions, timeFilter, setTimeFilter }) => {
    return (
        <div className="space-y-8 mt-4">
             <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                 <h2 className="text-2xl font-bold text-slate-200">Dashboard</h2>
                 <TimeFilterControls timeFilter={timeFilter} setTimeFilter={setTimeFilter} isPrimary={true} />
            </div>

            <Dashboard transactions={transactions} />
            
            <div className="grid grid-cols-1 gap-6">
                <ItemTrendsChart transactions={transactions} />
            </div>
        </div>
    );
};

export default DashboardPage;
import React, { useMemo } from 'react';
import type { Transaction } from '../types';
import type { TimeFilter } from '../App';
import Dashboard from '../components/Dashboard';
import MainChart from '../components/SalesChart';
import TimeFilterControls from '../components/TimeFilterControls';
import { ExportIcon } from '../components/icons/ExportIcon';
import { exportTransactionsToTxt } from '../utils/export';

interface DashboardPageProps {
    transactions: Transaction[];
    allTransactions: Transaction[];
    timeFilter: TimeFilter;
    setTimeFilter: (filter: TimeFilter) => void;
    isEditMode: boolean;
}

const DashboardPage: React.FC<DashboardPageProps> = ({ transactions, allTransactions, timeFilter, setTimeFilter, isEditMode }) => {
    
    return (
        <div className="space-y-8 mt-4">
             <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                 <div className="flex items-center gap-4">
                    <h2 className="text-2xl font-bold text-slate-200">Dashboard</h2>
                    {isEditMode && (
                        <button
                            onClick={() => exportTransactionsToTxt(transactions)}
                            className="flex items-center gap-2 px-3 py-1.5 bg-slate-600 text-white text-xs font-semibold rounded-lg shadow-md hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 focus:ring-offset-slate-900 transition-transform transform hover:scale-105"
                            aria-label="Export dashboard transactions as a text file"
                        >
                            <ExportIcon />
                            <span>Export TXT</span>
                        </button>
                    )}
                 </div>
                 <TimeFilterControls timeFilter={timeFilter} setTimeFilter={setTimeFilter} />
            </div>

            <Dashboard transactions={transactions} />

            <div className="w-full">
                <MainChart transactions={transactions} />
            </div>
        </div>
    );
};

export default DashboardPage;
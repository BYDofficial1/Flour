import React from 'react';
import type { Transaction, Reminder } from '../types';
import type { TimeFilter, SortKey } from '../App';
import TransactionList from '../components/TransactionList';
import { SearchIcon } from '../components/icons/SearchIcon';
import { ExportIcon } from '../components/icons/ExportIcon';
import { exportTransactionsToTxt } from '../utils/export';
import TimeFilterControls from '../components/TimeFilterControls';
import SortControls from '../components/SortControls';
import { useNotifier } from '../context/NotificationContext';

interface StatusFilterControlsProps {
    statusFilter: Transaction['payment_status'][];
    setStatusFilter: (statuses: Transaction['payment_status'][]) => void;
}

const StatusFilterControls: React.FC<StatusFilterControlsProps> = ({ statusFilter, setStatusFilter }) => {
    const statuses: Transaction['payment_status'][] = ['paid', 'unpaid', 'partial'];

    const handleToggle = (status: Transaction['payment_status']) => {
        const newFilter = statusFilter.includes(status)
            ? statusFilter.filter(s => s !== status)
            : [...statusFilter, status];
        
        // Ensure at least one status is always selected
        if (newFilter.length === 0) {
            // If user deselects the last one, re-select all
            setStatusFilter(statuses);
        } else {
            setStatusFilter(newFilter);
        }
    };

    const statusStyles: Record<Transaction['payment_status'], { active: string, inactive: string }> = {
        paid: { active: 'bg-green-500 text-white shadow-md', inactive: 'bg-slate-700 text-green-300 hover:bg-slate-600' },
        unpaid: { active: 'bg-red-500 text-white shadow-md', inactive: 'bg-slate-700 text-red-300 hover:bg-slate-600' },
        partial: { active: 'bg-yellow-500 text-white shadow-md', inactive: 'bg-slate-700 text-yellow-300 hover:bg-slate-600' },
    };

    return (
        <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-slate-300 mr-1 flex-shrink-0">Status:</label>
            <div className="flex items-center gap-2">
                {statuses.map(status => (
                    <button
                        key={status}
                        onClick={() => handleToggle(status)}
                        className={`px-3 py-1.5 text-xs font-bold rounded-full transition-all capitalize ${statusFilter.includes(status) ? statusStyles[status].active : statusStyles[status].inactive}`}
                    >
                        {status}
                    </button>
                ))}
            </div>
        </div>
    );
};


interface TransactionsPageProps {
    transactions: Transaction[];
    onEdit: (transaction: Transaction) => void;
    onDelete: (id: string) => void;
    timeFilter: TimeFilter;
    setTimeFilter: (filter: TimeFilter) => void;
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    statusFilter: Transaction['payment_status'][];
    setStatusFilter: (statuses: Transaction['payment_status'][]) => void;
    onSetReminder: (transaction: Transaction) => void;
    reminders: Reminder[];
    sortConfig: { key: SortKey; direction: 'ascending' | 'descending' };
    setSortConfig: (config: { key: SortKey; direction: 'ascending' | 'descending' }) => void;
    isEditMode: boolean;
}

const TransactionsPage: React.FC<TransactionsPageProps> = ({ 
    transactions, 
    onEdit, 
    onDelete, 
    timeFilter, 
    setTimeFilter, 
    searchQuery, 
    setSearchQuery, 
    statusFilter, 
    setStatusFilter, 
    onSetReminder,
    reminders,
    sortConfig,
    setSortConfig,
    isEditMode
}) => {

    return (
        <>
            <div className="mt-4 space-y-6 pb-24">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                    <h2 className="text-2xl font-bold text-slate-200 self-start">All Transactions</h2>
                    <div className="w-full md:w-auto flex flex-col sm:flex-row items-center gap-4">
                        <div className="relative w-full sm:w-64">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                                <SearchIcon />
                            </span>
                            <input
                                type="search"
                                placeholder="Search by name or item..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-slate-700 text-slate-100 placeholder-slate-400 border border-slate-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-primary-500 transition-colors"
                            />
                        </div>
                        <div className="w-full sm:w-auto flex items-center gap-2">
                             <button
                                onClick={() => exportTransactionsToTxt(transactions)}
                                disabled={!isEditMode}
                                title={isEditMode ? "Export transactions as a text file" : "Unlock Edit Mode to export data"}
                                className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-slate-600 text-white rounded-lg shadow-md hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 focus:ring-offset-slate-900 transition-transform transform hover:scale-105 disabled:bg-slate-700/50 disabled:text-slate-400 disabled:cursor-not-allowed disabled:transform-none"
                                aria-label="Export transactions as a text file"
                            >
                                <ExportIcon />
                                <span className="font-semibold hidden sm:inline">Export</span>
                            </button>
                        </div>
                    </div>
                </div>
                
                <div className="bg-slate-800 p-4 rounded-lg shadow-sm border border-slate-700 space-y-4 md:space-y-0 md:flex md:flex-wrap md:items-center md:justify-between md:gap-x-8 md:gap-y-4">
                    <TimeFilterControls timeFilter={timeFilter} setTimeFilter={setTimeFilter} isPrimary={false} />
                    <StatusFilterControls statusFilter={statusFilter} setStatusFilter={setStatusFilter} />
                    <SortControls sortConfig={sortConfig} setSortConfig={setSortConfig} />
                </div>

                <TransactionList
                    transactions={transactions}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onSetReminder={onSetReminder}
                    reminders={reminders}
                    isEditMode={isEditMode}
                />
            </div>
        </>
    );
};

export default TransactionsPage;
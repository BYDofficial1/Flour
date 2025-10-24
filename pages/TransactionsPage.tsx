import React from 'react';
import type { Transaction } from '../types';
import type { TimeFilter } from '../App';
import TransactionList from '../components/TransactionList';
import { PlusIcon } from '../components/icons/PlusIcon';
import { SearchIcon } from '../components/icons/SearchIcon';
import { ExportIcon } from '../components/icons/ExportIcon';
import { exportTransactionsToTxt } from '../utils/export';
import TimeFilterControls from '../components/TimeFilterControls';

interface StatusFilterControlsProps {
    statusFilter: Transaction['paymentStatus'][];
    setStatusFilter: (statuses: Transaction['paymentStatus'][]) => void;
}

const StatusFilterControls: React.FC<StatusFilterControlsProps> = ({ statusFilter, setStatusFilter }) => {
    const statuses: Transaction['paymentStatus'][] = ['paid', 'unpaid', 'partial'];
    
    const handleToggle = (status: Transaction['paymentStatus']) => {
        const newFilter = statusFilter.includes(status)
            ? statusFilter.filter(s => s !== status)
            : [...statusFilter, status];
        setStatusFilter(newFilter);
    };

    const statusStyles: Record<Transaction['paymentStatus'], { active: string, inactive: string }> = {
        paid: { active: 'bg-green-500 text-white shadow-md', inactive: 'bg-green-100 text-green-800 hover:bg-green-200' },
        unpaid: { active: 'bg-red-500 text-white shadow-md', inactive: 'bg-red-100 text-red-800 hover:bg-red-200' },
        partial: { active: 'bg-yellow-500 text-white shadow-md', inactive: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200' },
    };

    return (
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <label className="text-sm font-medium text-slate-700 mr-2 flex-shrink-0">Filter by status:</label>
            <div className="flex items-center gap-2 p-1 rounded-lg">
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
    openModal: () => void;
    timeFilter: TimeFilter;
    setTimeFilter: (filter: TimeFilter) => void;
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    statusFilter: Transaction['paymentStatus'][];
    setStatusFilter: (statuses: Transaction['paymentStatus'][]) => void;
    unsyncedIds: Set<string>;
    isEditMode: boolean;
}

const TransactionsPage: React.FC<TransactionsPageProps> = ({ 
    transactions, 
    onEdit, 
    onDelete, 
    openModal, 
    timeFilter, 
    setTimeFilter, 
    searchQuery, 
    setSearchQuery, 
    statusFilter, 
    setStatusFilter, 
    unsyncedIds, 
    isEditMode 
}) => {

    return (
        <div className="mt-4 space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <h2 className="text-2xl font-bold text-slate-700 self-start">All Transactions</h2>
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
                            className="w-full pl-10 pr-4 py-2 bg-white text-slate-800 placeholder-slate-400 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                    </div>
                    <div className="w-full sm:w-auto flex items-center gap-2">
                        <button
                            onClick={() => exportTransactionsToTxt(transactions)}
                            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-slate-600 text-white rounded-lg shadow-md hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 transition-transform transform hover:scale-105"
                            aria-label="Export transactions as a text file"
                        >
                            <ExportIcon />
                            <span className="font-semibold">Export TXT</span>
                        </button>
                        {isEditMode && (
                             <button
                                onClick={openModal}
                                className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg shadow-md hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-transform transform hover:scale-105"
                                aria-label="Add new transaction"
                            >
                                <PlusIcon />
                                <span className="font-semibold">Add New</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>
            
            <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200/80 space-y-4 md:space-y-0 md:flex md:flex-wrap md:items-center md:justify-between md:gap-x-8 md:gap-y-4">
                <TimeFilterControls timeFilter={timeFilter} setTimeFilter={setTimeFilter} isPrimary={false} />
                <StatusFilterControls statusFilter={statusFilter} setStatusFilter={setStatusFilter} />
            </div>

            <TransactionList
                transactions={transactions}
                onEdit={onEdit}
                onDelete={onDelete}
                unsyncedIds={unsyncedIds}
                isEditMode={isEditMode}
            />
        </div>
    );
};

export default TransactionsPage;
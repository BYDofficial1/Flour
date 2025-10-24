import React from 'react';
import type { Transaction } from '../types';
import type { TimeFilter } from '../App';
import TransactionList from '../components/TransactionList';
import { PlusIcon } from '../components/icons/PlusIcon';
import { SearchIcon } from '../components/icons/SearchIcon';
import { ExportIcon } from '../components/icons/ExportIcon';
import { exportTransactionsToTxt } from '../utils/export';
import TimeFilterControls from '../components/TimeFilterControls';


interface TransactionsPageProps {
    transactions: Transaction[]; // These are now pre-filtered by date and search from App.tsx
    onEdit: (transaction: Transaction) => void;
    onDelete: (id: string) => void;
    openModal: () => void;
    timeFilter: TimeFilter;
    setTimeFilter: (filter: TimeFilter) => void;
    searchQuery: string;
    setSearchQuery: (query: string) => void;
}

const TransactionsPage: React.FC<TransactionsPageProps> = ({ transactions, onEdit, onDelete, openModal, timeFilter, setTimeFilter, searchQuery, setSearchQuery }) => {

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
                            className="w-full pl-10 pr-4 py-2 bg-white text-slate-800 placeholder-slate-400 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
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
                        <button
                            onClick={openModal}
                            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg shadow-md hover:bg-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 transition-transform transform hover:scale-105"
                            aria-label="Add new transaction"
                        >
                            <PlusIcon />
                            <span className="font-semibold">Add New</span>
                        </button>
                    </div>
                </div>
            </div>
            
            <TimeFilterControls timeFilter={timeFilter} setTimeFilter={setTimeFilter} isPrimary={false} />

            <TransactionList
                transactions={transactions}
                onEdit={onEdit}
                onDelete={onDelete}
            />
        </div>
    );
};

export default TransactionsPage;

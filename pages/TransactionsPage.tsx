import React, { useState, useCallback, useRef } from 'react';
import type { Transaction, Reminder } from '../types';
import type { TimeFilter, SortKey } from '../App';
import TransactionList from '../components/TransactionList';
import BulkActionBar from '../components/BulkActionBar';
import ChangeStatusModal from '../components/ChangeStatusModal';
import ConfirmationModal from '../components/ConfirmationModal';
import ReminderModal from '../components/ReminderModal';
import { PlusIcon } from '../components/icons/PlusIcon';
import { SearchIcon } from '../components/icons/SearchIcon';
import { ExportIcon } from '../components/icons/ExportIcon';
import { exportTransactionsToTxt } from '../utils/export';
import TimeFilterControls from '../components/TimeFilterControls';
import SortControls from '../components/SortControls';
import { useNotifier } from '../context/NotificationContext';

interface StatusFilterControlsProps {
    statusFilter: Transaction['paymentStatus'][];
    setStatusFilter: (statuses: Transaction['paymentStatus'][]) => void;
}

const StatusFilterControls: React.FC<StatusFilterControlsProps> = ({ statusFilter, setStatusFilter }) => {
    const statuses: Transaction['paymentStatus'][] = ['paid', 'unpaid', 'partial'];
    const { addNotification } = useNotifier();
    const [isMultiSelect, setIsMultiSelect] = useState(false);
    const tapState = useRef<{ status: string; count: number; timer: number | null }>({ status: '', count: 0, timer: null });

    const handleToggle = (status: Transaction['paymentStatus']) => {
        // --- Triple Tap Logic for touch devices ---
        if (tapState.current.timer) {
            clearTimeout(tapState.current.timer);
        }

        if (tapState.current.status !== status) {
            tapState.current = { status, count: 1, timer: null };
        } else {
            tapState.current.count += 1;
        }

        if (tapState.current.count === 3) {
            const newMultiSelectState = !isMultiSelect;
            setIsMultiSelect(newMultiSelectState);
            addNotification(`Multi-select for status ${newMultiSelectState ? 'enabled' : 'disabled'}.`, 'info');
            tapState.current = { status: '', count: 0, timer: null };

            if (!newMultiSelectState && statusFilter.length > 1) {
                setStatusFilter([status]);
            }
            return;
        }

        tapState.current.timer = window.setTimeout(() => {
            tapState.current = { status: '', count: 0, timer: null };
        }, 400);

        // --- Standard Filter Selection Logic ---
        if (isMultiSelect) {
            const newFilter = statusFilter.includes(status)
                ? statusFilter.filter(s => s !== status)
                : [...statusFilter, status];
            
            if (newFilter.length > 0) {
                setStatusFilter(newFilter);
            } else {
                 addNotification("At least one status must be selected in multi-select mode.", "info");
            }
        } else {
            setStatusFilter([status]);
        }
    };
    
    const handleMultiSelectToggle = () => {
        const newState = !isMultiSelect;
        setIsMultiSelect(newState);
        addNotification(`Multi-select for status ${newState ? 'enabled' : 'disabled'}.`, 'info');
        if (!newState && statusFilter.length > 1) {
            // When disabling, default to the first selected item
            setStatusFilter([statusFilter[0]]);
        }
    };

    const statusStyles: Record<Transaction['paymentStatus'], { active: string, inactive: string }> = {
        paid: { active: 'bg-green-500 text-white shadow-md', inactive: 'bg-green-900/40 text-green-300 hover:bg-green-900/70' },
        unpaid: { active: 'bg-red-500 text-white shadow-md', inactive: 'bg-red-900/40 text-red-300 hover:bg-red-900/70' },
        partial: { active: 'bg-yellow-500 text-white shadow-md', inactive: 'bg-yellow-900/40 text-yellow-300 hover:bg-yellow-900/70' },
    };

    return (
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-slate-300 mr-1 flex-shrink-0">Filter by status:</label>
                <button
                    onClick={handleMultiSelectToggle}
                    title={isMultiSelect ? "Switch to single select" : "Enable multi-select"}
                    className={`px-2 py-1 text-xs font-bold rounded-md transition-colors ${isMultiSelect ? 'bg-primary-500 text-white' : 'bg-slate-600 hover:bg-slate-500 text-slate-200'}`}
                >
                    {isMultiSelect ? 'MULTI' : 'SINGLE'}
                </button>
            </div>
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
    openModal: (transaction?: null, prefill?: Partial<Transaction>) => void;
    timeFilter: TimeFilter;
    setTimeFilter: (filter: TimeFilter) => void;
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    statusFilter: Transaction['paymentStatus'][];
    setStatusFilter: (statuses: Transaction['paymentStatus'][]) => void;
    unsyncedIds: Set<string>;
    onSetReminder: (transaction: Transaction) => void;
    reminders: Reminder[];
    onBulkDelete: (ids: string[]) => void;
    onBulkUpdate: (ids: string[], newStatus: Transaction['paymentStatus']) => void;
    onBulkSetReminder: (ids: string[], remindAt: Date) => void;
    isEditMode: boolean;
    sortConfig: { key: SortKey; direction: 'ascending' | 'descending' };
    setSortConfig: (config: { key: SortKey; direction: 'ascending' | 'descending' }) => void;
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
    onSetReminder,
    reminders,
    onBulkDelete,
    onBulkUpdate,
    onBulkSetReminder,
    isEditMode,
    sortConfig,
    setSortConfig
}) => {
    const [selectedTransactionIds, setSelectedTransactionIds] = useState<Set<string>>(new Set());
    const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);
    const [isBulkSelectMode, setIsBulkSelectMode] = useState(false);
    const { addNotification } = useNotifier();

    const handleSelectOne = useCallback((id: string) => {
        setSelectedTransactionIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });
    }, []);

    const handleSelectAll = useCallback((select: boolean) => {
        if (select) {
            setSelectedTransactionIds(new Set(transactions.map(t => t.id)));
        } else {
            setSelectedTransactionIds(new Set());
        }
    }, [transactions]);
    
    const handleClearSelection = useCallback(() => {
        setSelectedTransactionIds(new Set());
    }, []);

    const handleToggleBulkSelect = () => {
        if (isBulkSelectMode) {
            handleClearSelection();
        }
        setIsBulkSelectMode(!isBulkSelectMode);
    };

    const handleConfirmBulkDelete = () => {
        onBulkDelete(Array.from(selectedTransactionIds));
        handleClearSelection();
        setIsDeleteModalOpen(false);
        setIsBulkSelectMode(false);
    };

    const handleConfirmBulkStatusChange = (newStatus: Transaction['paymentStatus']) => {
        onBulkUpdate(Array.from(selectedTransactionIds), newStatus);
        handleClearSelection();
        setIsStatusModalOpen(false);
        setIsBulkSelectMode(false);
    };

    const handleConfirmBulkReminder = (_: string, remindAt: Date) => {
        onBulkSetReminder(Array.from(selectedTransactionIds), remindAt);
        handleClearSelection();
        setIsReminderModalOpen(false);
        setIsBulkSelectMode(false);
    };

    const handleDuplicate = (transaction: Transaction) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { id, date, updatedAt, ...prefillData } = transaction;
        openModal(null, prefillData);
        addNotification(`Duplicating transaction for ${transaction.customerName}. Adjust details and save.`, 'info');
    };

    return (
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
                    {isEditMode && (
                        <div className="w-full sm:w-auto flex items-center gap-2">
                            <button
                                onClick={handleToggleBulkSelect}
                                className={`w-1/2 sm:w-auto flex items-center justify-center gap-2 px-4 py-2 text-white rounded-lg shadow-md transition-colors font-semibold ${isBulkSelectMode ? 'bg-red-600 hover:bg-red-700' : 'bg-slate-600 hover:bg-slate-700'}`}
                                aria-label={isBulkSelectMode ? 'Cancel bulk selection' : 'Enable bulk selection'}
                            >
                                {isBulkSelectMode ? 'Cancel' : 'Bulk Edit'}
                            </button>
                            <button
                                onClick={() => exportTransactionsToTxt(transactions)}
                                className="w-1/2 sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-slate-600 text-white rounded-lg shadow-md hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 focus:ring-offset-slate-900 transition-transform transform hover:scale-105"
                                aria-label="Export transactions as a text file"
                            >
                                <ExportIcon />
                                <span className="font-semibold hidden sm:inline">Export</span>
                            </button>
                        </div>
                    )}
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
                onDuplicate={handleDuplicate}
                unsyncedIds={unsyncedIds}
                isBulkSelectMode={isBulkSelectMode}
                onSetReminder={onSetReminder}
                reminders={reminders}
                selectedIds={selectedTransactionIds}
                onSelectOne={handleSelectOne}
                onSelectAll={handleSelectAll}
                isEditMode={isEditMode}
                sortConfig={sortConfig}
                setSortConfig={setSortConfig}
            />
            
            {isEditMode && (
                <button
                    onClick={() => openModal()}
                    className={`fixed right-6 bg-primary-500 text-white rounded-full p-4 shadow-lg hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-primary-500 transition-all duration-300 transform hover:scale-110 z-30 ${
                        selectedTransactionIds.size > 0 ? 'bottom-28 lg:bottom-24' : 'bottom-6'
                    }`}
                    aria-label="Add new transaction"
                >
                    <PlusIcon />
                </button>
            )}
            
            {selectedTransactionIds.size > 0 && isBulkSelectMode && (
                <BulkActionBar
                    count={selectedTransactionIds.size}
                    onClear={handleClearSelection}
                    onDelete={() => setIsDeleteModalOpen(true)}
                    onChangeStatus={() => setIsStatusModalOpen(true)}
                    onSetReminder={() => setIsReminderModalOpen(true)}
                />
            )}
            <ChangeStatusModal
                isOpen={isStatusModalOpen}
                onClose={() => setIsStatusModalOpen(false)}
                onConfirm={handleConfirmBulkStatusChange}
            />
            <ConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleConfirmBulkDelete}
                title={`Delete ${selectedTransactionIds.size} Transactions`}
                message={`Are you sure you want to delete these ${selectedTransactionIds.size} transactions? This action cannot be undone.`}
            />
            <ReminderModal
                isOpen={isReminderModalOpen}
                onClose={() => setIsReminderModalOpen(false)}
                onSetReminder={handleConfirmBulkReminder}
                transaction={{id: 'bulk', customerName: `${selectedTransactionIds.size} customers`} as any}
            />
        </div>
    );
};

export default TransactionsPage;
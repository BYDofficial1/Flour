import React, { useState, useRef, useEffect } from 'react';
import type { Transaction, Reminder } from '../types';
import { EditIcon } from './icons/EditIcon';
import { DeleteIcon } from './icons/DeleteIcon';
import { formatCurrency } from '../utils/currency';
import { DocumentPlusIcon } from './icons/DocumentPlusIcon';
import { ClockIcon } from './icons/ClockIcon';
import { BellIcon } from './icons/BellIcon';
import { DotsVerticalIcon } from './icons/DotsVerticalIcon';
import { SortIcon } from './icons/SortIcon';

type SortKey = 'date' | 'total' | 'customerName';

const GRINDING_SERVICES = ['Wheat Grinding', 'Daliya Grinding'];

interface TransactionListProps {
    transactions: Transaction[];
    onEdit: (transaction: Transaction) => void;
    onDelete: (id: string) => void;
    unsyncedIds: Set<string>;
    isBulkSelectMode: boolean;
    onSetReminder: (transaction: Transaction) => void;
    reminders: Reminder[];
    selectedIds: Set<string>;
    onSelectOne: (id: string) => void;
    onSelectAll: (select: boolean) => void;
    isEditMode: boolean;
    sortConfig: { key: SortKey; direction: 'ascending' | 'descending' };
    setSortConfig: (config: { key: SortKey; direction: 'ascending' | 'descending' }) => void;
}

const StatusBadge: React.FC<{ status: Transaction['paymentStatus'] }> = ({ status }) => {
    const baseClasses = "px-2 py-0.5 text-xs font-semibold rounded-full capitalize";
    const styles = {
        paid: 'bg-green-500/20 text-green-300',
        unpaid: 'bg-red-500/20 text-red-300',
        partial: 'bg-yellow-500/20 text-yellow-300',
    };
    return <span className={`${baseClasses} ${styles[status]}`}>{status}</span>;
};

const TransactionCard: React.FC<{ 
    t: Transaction, 
    isUnsynced: boolean, 
    reminder?: Reminder,
    isSelected: boolean,
    isBulkSelectMode: boolean,
    onSelect: () => void,
    onEdit: () => void,
    onDelete: () => void,
    onSetReminder: () => void,
    isEditMode: boolean;
}> = ({ t, isUnsynced, reminder, isSelected, isBulkSelectMode, onSelect, onEdit, onDelete, onSetReminder, isEditMode }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [menuRef]);

    const balanceDue = t.total - (t.paidAmount || 0);
    const canSetReminder = t.paymentStatus !== 'paid';
    const isGrindingService = GRINDING_SERVICES.includes(t.item);

    const statusBorderStyles: Record<Transaction['paymentStatus'], string> = {
        paid: 'border-l-green-500',
        unpaid: 'border-l-red-500',
        partial: 'border-l-yellow-500',
    };
    const borderStyle = isSelected
        ? 'border-primary-500 ring-2 ring-primary-500/50'
        : `border-slate-700 ${statusBorderStyles[t.paymentStatus]}`;

    return (
        <div className={`bg-slate-800 rounded-xl shadow-lg hover:shadow-2xl hover:shadow-black/20 transition-all duration-300 mb-4 overflow-hidden border border-l-4 ${borderStyle}`}>
            <div className="p-5">
                 <div className="flex justify-between items-start gap-4">
                    <div className="flex items-start gap-4 flex-1">
                       {isBulkSelectMode && (
                            <input
                                type="checkbox"
                                className="mt-1.5 h-4 w-4 rounded border-slate-600 bg-slate-700 text-primary-600 focus:ring-primary-500 focus:ring-offset-slate-800"
                                checked={isSelected}
                                onChange={onSelect}
                            />
                       )}
                       <div className="flex-1">
                            <p className="font-bold text-lg text-slate-100 flex items-center gap-2">
                                {t.customerName}
                                {isUnsynced && (
                                    <span title="Pending sync">
                                        <ClockIcon className="h-4 w-4 text-primary-400" />
                                    </span>
                                )}
                            </p>
                            <p className="text-sm text-slate-300 font-medium">{t.item}</p>
                            {t.customerMobile && <p className="text-xs text-slate-400 mt-1">{t.customerMobile}</p>}
                       </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="text-right flex-shrink-0">
                            <p className="text-xl font-bold text-primary-400">{formatCurrency(t.total)}</p>
                        </div>
                        {isEditMode && (
                            <div className="relative" ref={menuRef}>
                                <button onClick={() => setIsMenuOpen(p => !p)} className="p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-700 transition-colors">
                                    <DotsVerticalIcon />
                                </button>
                                {isMenuOpen && (
                                    <div className="absolute top-full right-0 mt-1 w-48 bg-slate-900 border border-slate-700 rounded-lg shadow-xl z-10 animate-[fadeIn_0.1s_ease-out]">
                                        <style>{`@keyframes fadeIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }`}</style>
                                        <ul>
                                            <li><button onClick={() => { onEdit(); setIsMenuOpen(false); }} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-slate-200 hover:bg-slate-700/80 rounded-t-lg"><EditIcon /> Edit</button></li>
                                            {canSetReminder && <li><button onClick={() => { onSetReminder(); setIsMenuOpen(false); }} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-slate-200 hover:bg-slate-700/80"><BellIcon isActive={!!reminder} /> Reminder</button></li>}
                                            <li><button onClick={() => { onDelete(); setIsMenuOpen(false); }} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-red-400 hover:bg-slate-700/80 rounded-b-lg"><DeleteIcon /> Delete</button></li>
                                        </ul>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <div className="mt-4 pt-4 mx-5 border-t border-slate-700 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    <div className="text-slate-400">Quantity</div>
                    <div className="text-right font-medium text-slate-100">{t.quantity.toFixed(2)} kg</div>
                    
                    {!isGrindingService && (
                        <>
                            <div className="text-slate-400">Rate</div>
                            <div className="text-right font-medium text-slate-100">{formatCurrency(t.rate)} / kg</div>
                        </>
                    )}
                    
                    <>
                        <div className="text-slate-400">{isGrindingService ? 'Grinding Cost' : 'Extra Grinding'}</div>
                        <div className="text-right font-medium text-slate-100">{formatCurrency(t.grindingCost ?? 0)}</div>
                    </>
                    
                    <>
                        <div className="text-slate-400">Cleaning Cost</div>
                        <div className="text-right font-medium text-slate-100">{formatCurrency(t.cleaningCost ?? 0)}</div>
                    </>
                </div>

                <div className="mt-4 pt-4 mx-5 border-t border-slate-700 space-y-3">
                    <div className="flex justify-between items-center">
                        <StatusBadge status={t.paymentStatus} />
                         {t.paymentStatus !== 'paid' && balanceDue > 0 && (
                            <div className="text-sm">
                                <span className="text-slate-400">Balance: </span>
                                <span className="font-bold text-red-400">{formatCurrency(balanceDue)}</span>
                            </div>
                        )}
                    </div>
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-400">Date</span>
                        <span className="font-medium text-slate-100">{new Date(t.date).toLocaleString('en-IN', { day: 'numeric', month: 'short', year:'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}</span>
                    </div>
                </div>

                 {t.notes && (
                    <div className="mt-4 pt-4 mx-5 border-t border-slate-700">
                        <div className="p-3 bg-slate-700/50 rounded-md text-sm text-slate-300">
                            <p><strong className="text-slate-100">Note:</strong> <span>{t.notes}</span></p>
                        </div>
                    </div>
                 )}
            </div>
        </div>
    );
};

const TransactionList: React.FC<TransactionListProps> = ({ 
    transactions,
    onEdit,
    onDelete,
    unsyncedIds,
    isBulkSelectMode,
    onSetReminder,
    reminders,
    selectedIds,
    onSelectOne,
    onSelectAll,
    isEditMode,
    sortConfig,
    setSortConfig,
}) => {
    
    if (transactions.length === 0) {
         return (
            <div className="text-center py-16 px-6 bg-slate-800 rounded-xl shadow-lg border-2 border-dashed border-slate-700">
                <DocumentPlusIcon />
                <h3 className="text-xl font-semibold text-slate-200 mt-4">No transactions found.</h3>
                <p className="text-slate-400 mt-2">Try adjusting your filters or add a new transaction.</p>
            </div>
        );
    }
    
    const requestSort = (key: SortKey) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const getSortDirection = (key: SortKey): 'asc' | 'desc' | 'none' => {
        if (!sortConfig || sortConfig.key !== key) return 'none';
        return sortConfig.direction === 'ascending' ? 'asc' : 'desc';
    };

    const allSelected = selectedIds.size > 0 && selectedIds.size === transactions.length;

    return (
        <div>
            {/* Mobile Card View */}
            <div className="md:hidden">
                {transactions.map(t => (
                    <TransactionCard
                        key={t.id}
                        t={t}
                        isUnsynced={unsyncedIds.has(t.id)}
                        reminder={reminders.find(r => r.transactionId === t.id)}
                        isSelected={selectedIds.has(t.id)}
                        isBulkSelectMode={isBulkSelectMode}
                        onSelect={() => onSelectOne(t.id)}
                        onEdit={() => onEdit(t)}
                        onDelete={() => onDelete(t.id)}
                        onSetReminder={() => onSetReminder(t)}
                        isEditMode={isEditMode}
                    />
                ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block bg-slate-800 rounded-xl shadow-lg border border-slate-700 overflow-hidden">
                <div className="overflow-x-auto no-scrollbar">
                    <table className="w-full text-sm text-left text-slate-300">
                        <thead className="text-xs text-slate-400 uppercase bg-slate-700/50">
                            <tr>
                                {isBulkSelectMode && (
                                    <th scope="col" className="p-4">
                                        <input
                                            type="checkbox"
                                            className="h-4 w-4 rounded border-slate-500 bg-slate-600 text-primary-600 focus:ring-primary-500 focus:ring-offset-slate-800"
                                            checked={allSelected}
                                            onChange={(e) => onSelectAll(e.target.checked)}
                                        />
                                    </th>
                                )}
                                <th scope="col" className="px-6 py-3 cursor-pointer hover:bg-slate-700" onClick={() => requestSort('date')}>
                                    <div className="flex items-center">Date <SortIcon direction={getSortDirection('date')} /></div>
                                </th>
                                <th scope="col" className="px-6 py-3 cursor-pointer hover:bg-slate-700" onClick={() => requestSort('customerName')}>
                                    <div className="flex items-center">Customer <SortIcon direction={getSortDirection('customerName')} /></div>
                                </th>
                                <th scope="col" className="px-6 py-3">Item</th>
                                <th scope="col" className="px-6 py-3 text-right">Qty</th>
                                <th scope="col" className="px-6 py-3 text-right cursor-pointer hover:bg-slate-700" onClick={() => requestSort('total')}>
                                    <div className="flex items-center justify-end">Total <SortIcon direction={getSortDirection('total')} /></div>
                                </th>
                                <th scope="col" className="px-6 py-3 text-center">Status</th>
                                {isEditMode && <th scope="col" className="px-6 py-3 text-right">Actions</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {transactions.map(t => (
                                <tr key={t.id} className={`border-b border-slate-700 transition-colors ${selectedIds.has(t.id) ? 'bg-primary-900/20' : 'hover:bg-slate-700/30'}`}>
                                    {isBulkSelectMode && (
                                        <td className="p-4">
                                            <input
                                                type="checkbox"
                                                className="h-4 w-4 rounded border-slate-500 bg-slate-600 text-primary-600 focus:ring-primary-500 focus:ring-offset-slate-800"
                                                checked={selectedIds.has(t.id)}
                                                onChange={() => onSelectOne(t.id)}
                                            />
                                        </td>
                                    )}
                                    <td className="px-6 py-4 whitespace-nowrap">{new Date(t.date).toLocaleDateString('en-CA')}</td>
                                    <td className="px-6 py-4 font-medium text-slate-100">{t.customerName}</td>
                                    <td className="px-6 py-4">{t.item}</td>
                                    <td className="px-6 py-4 text-right">{t.quantity.toFixed(2)} kg</td>
                                    <td className="px-6 py-4 text-right font-bold text-primary-400">{formatCurrency(t.total)}</td>
                                    <td className="px-6 py-4 text-center">
                                        <StatusBadge status={t.paymentStatus} />
                                    </td>
                                    {isEditMode && (
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                {t.paymentStatus !== 'paid' && (
                                                    <button onClick={() => onSetReminder(t)} className="p-2 text-slate-400 hover:text-primary-400 rounded-md hover:bg-slate-700" aria-label="Set Reminder">
                                                        <BellIcon isActive={!!reminders.find(r => r.transactionId === t.id)} />
                                                    </button>
                                                )}
                                                <button onClick={() => onEdit(t)} className="p-2 text-slate-400 hover:text-blue-400 rounded-md hover:bg-slate-700" aria-label="Edit">
                                                    <EditIcon />
                                                </button>
                                                <button onClick={() => onDelete(t.id)} className="p-2 text-slate-400 hover:text-red-400 rounded-md hover:bg-slate-700" aria-label="Delete">
                                                    <DeleteIcon />
                                                </button>
                                            </div>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default TransactionList;
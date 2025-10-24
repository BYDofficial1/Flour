



import React from 'react';
import type { Transaction, Reminder } from '../types';
import { EditIcon } from './icons/EditIcon';
import { DeleteIcon } from './icons/DeleteIcon';
import { formatCurrency } from '../utils/currency';
import { DocumentPlusIcon } from './icons/DocumentPlusIcon';
import { ClockIcon } from './icons/ClockIcon';
import { ReceiptIcon } from './icons/ReceiptIcon';
import { BellIcon } from './icons/BellIcon';

interface TransactionListProps {
    transactions: Transaction[];
    onEdit: (transaction: Transaction) => void;
    onDelete: (id: string) => void;
    unsyncedIds: Set<string>;
    isEditMode: boolean;
    onSetReminder: (transaction: Transaction) => void;
    reminders: Reminder[];
    selectedIds: Set<string>;
    onSelectOne: (id: string) => void;
    onSelectAll: (select: boolean) => void;
}

type ReminderStatus = 'due' | 'soon' | 'upcoming';

const getReminderStatus = (remindAt: string): ReminderStatus => {
    const now = new Date();
    const reminderDate = new Date(remindAt);
    const diffHours = (reminderDate.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (diffHours <= 1) return 'due'; // Overdue or within the hour
    if (diffHours <= 24) return 'soon'; // Within 24 hours
    return 'upcoming'; // More than 24 hours away
};


const StatusBadge: React.FC<{ status: Transaction['paymentStatus'] }> = ({ status }) => {
    const baseClasses = "px-2 py-0.5 text-xs font-semibold rounded-full capitalize";
    const styles = {
        paid: 'bg-green-500/20 text-green-300',
        unpaid: 'bg-red-500/20 text-red-300',
        partial: 'bg-yellow-500/20 text-yellow-300',
    };
    return <span className={`${baseClasses} ${styles[status]}`}>{status}</span>;
};

const TransactionList: React.FC<TransactionListProps> = ({ 
    transactions, 
    onEdit, 
    onDelete, 
    unsyncedIds, 
    isEditMode, 
    onSetReminder, 
    reminders,
    selectedIds,
    onSelectOne,
    onSelectAll
}) => {
    if (transactions.length === 0) {
        return (
            <div className="text-center py-16 px-6 bg-slate-800 rounded-xl shadow-lg border-2 border-dashed border-slate-700">
                <DocumentPlusIcon />
                <h3 className="text-xl font-semibold text-slate-200 mt-4">No transactions here.</h3>
                <p className="text-slate-400 mt-2">Click the "Add New" button to get started!</p>
            </div>
        );
    }

    const allVisibleSelected = transactions.length > 0 && transactions.every(t => selectedIds.has(t.id));

    // A more detailed and visually appealing card for mobile view
    const TransactionCard: React.FC<{ t: Transaction }> = ({ t }) => {
        const isUnsynced = unsyncedIds.has(t.id);
        const reminder = reminders.find(r => r.transactionId === t.id);
        const reminderStatus = reminder ? getReminderStatus(reminder.remindAt) : undefined;
        const balanceDue = t.total - (t.paidAmount || 0);
        const canSetReminder = t.paymentStatus !== 'paid';
        const reminderTooltip = reminder ? `Reminder set for: ${new Date(reminder.remindAt).toLocaleString()}` : 'Set a reminder for this transaction';

        return (
            <div className={`bg-slate-800 rounded-xl shadow-lg hover:shadow-2xl hover:shadow-black/20 transition-all duration-300 mb-4 overflow-hidden border ${selectedIds.has(t.id) ? 'border-primary-500 ring-2 ring-primary-500/50' : 'border-slate-700'}`}>
                <div className="p-5 border-l-4 border-primary-500">
                     <div className="flex justify-between items-start">
                        <div className="flex items-start gap-4">
                           {isEditMode && (
                                <input
                                    type="checkbox"
                                    className="mt-1.5 h-4 w-4 rounded border-slate-600 bg-slate-700 text-primary-600 focus:ring-primary-500 focus:ring-offset-slate-800"
                                    checked={selectedIds.has(t.id)}
                                    onChange={() => onSelectOne(t.id)}
                                />
                           )}
                           <div>
                                <p className="font-bold text-lg text-slate-100 flex items-center gap-2">
                                    {t.customerName}
                                    {isUnsynced && (
                                        <span title="Pending sync">
                                            <ClockIcon className="h-4 w-4 text-primary-400" />
                                        </span>
                                    )}
                                </p>
                                <p className="text-sm text-slate-300 font-medium">{t.item}</p>
                           </div>
                        </div>
                        <div className="text-right flex-shrink-0 ml-4">
                            <p className="text-xl font-bold text-primary-400">{formatCurrency(t.total)}</p>
                            {t.customerMobile && <p className="text-xs text-slate-400 mt-1">{t.customerMobile}</p>}
                        </div>
                    </div>
                     <div className="mt-3 flex justify-between items-center">
                        <div className="flex items-center gap-1.5">
                            <StatusBadge status={t.paymentStatus} />
                            {t.paymentStatus === 'partial' && (
                                <span title="Partial payment received. Balance due.">
                                    <ReceiptIcon className="text-yellow-400" />
                                </span>
                            )}
                        </div>
                         {t.paymentStatus !== 'paid' && balanceDue > 0 && (
                            <div className="text-sm">
                                <span className="text-slate-400">Balance: </span>
                                <span className="font-bold text-red-400">{formatCurrency(balanceDue)}</span>
                            </div>
                        )}
                    </div>
                    <div className="border-t my-4 border-slate-700"></div>
                    <div className="text-sm text-slate-300 space-y-2">
                         <div className="flex justify-between">
                            <span>Quantity:</span>
                            <span className="font-medium text-slate-100">{t.quantity.toFixed(2)} kg</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Rate:</span>
                            <span className="font-medium text-slate-100">{formatCurrency(t.rate)} /kg</span>
                        </div>
                        {t.grindingCost && t.grindingCost > 0 && (
                            <div className="flex justify-between">
                                <span>Grinding Cost:</span>
                                <span className="font-medium text-slate-100">{formatCurrency(t.grindingCost)}</span>
                            </div>
                        )}
                        {t.cleaningCost && t.cleaningCost > 0 && (
                            <div className="flex justify-between">
                                <span>Cleaning Cost:</span>
                                <span className="font-medium text-slate-100">{formatCurrency(t.cleaningCost)}</span>
                            </div>
                        )}
                        <div className="flex justify-between">
                            <span>Date:</span>
                            <span className="font-medium text-slate-100">{new Date(t.date).toLocaleString('en-IN', { day: 'numeric', month: 'short', year:'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}</span>
                        </div>
                    </div>
                    {t.notes && (
                        <div className="mt-4 p-3 bg-primary-900/20 rounded-md text-sm text-slate-300 font-serif border border-primary-500/20">
                            <p><strong className="not-italic font-semibold text-slate-100">Note:</strong> <span className="italic">{t.notes}</span></p>
                        </div>
                    )}
                </div>
                 {isEditMode && (
                    <div className="bg-slate-900/50 px-4 py-2 flex justify-end items-center space-x-2">
                        {canSetReminder && (
                            <button onClick={() => onSetReminder(t)} title={reminderTooltip} className={`flex items-center gap-1.5 text-sm font-semibold py-1 px-3 rounded-md transition-colors ${!!reminder ? 'text-slate-100 hover:bg-slate-700' : 'text-slate-300 hover:bg-slate-700'}`} aria-label="Set reminder">
                                <BellIcon isActive={!!reminder} status={reminderStatus} /> {!!reminder ? 'Reminder Set' : 'Remind'}
                            </button>
                        )}
                        <button onClick={() => onEdit(t)} className="flex items-center gap-1.5 text-sm text-blue-400 font-semibold hover:text-blue-300 py-1 px-3 rounded-md hover:bg-blue-500/10 transition-colors" aria-label={`Edit transaction for ${t.customerName}`}>
                            <EditIcon /> Edit
                        </button>
                        <button onClick={() => onDelete(t.id)} className="flex items-center gap-1.5 text-sm text-red-400 font-semibold hover:text-red-300 py-1 px-3 rounded-md hover:bg-red-500/10 transition-colors" aria-label={`Delete transaction for ${t.customerName}`}>
                            <DeleteIcon /> Delete
                        </button>
                    </div>
                )}
            </div>
        )
    };

    return (
        <div>
            {/* Mobile Card View */}
            <div className="md:hidden">
                {transactions.map(t => <TransactionCard key={t.id} t={t} />)}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block bg-slate-800 rounded-xl shadow-2xl shadow-black/20 overflow-hidden border border-slate-700">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-slate-400">
                        <thead className="text-xs text-slate-300 uppercase bg-slate-900/70">
                            <tr>
                                {isEditMode && (
                                    <th scope="col" className="px-4 py-4">
                                        <input
                                            type="checkbox"
                                            className="h-4 w-4 rounded border-slate-600 bg-slate-700 text-primary-600 focus:ring-primary-500 focus:ring-offset-slate-800"
                                            checked={allVisibleSelected}
                                            onChange={(e) => onSelectAll(e.target.checked)}
                                            aria-label="Select all transactions on this page"
                                        />
                                    </th>
                                )}
                                <th scope="col" className="px-6 py-4 font-semibold">Customer</th>
                                <th scope="col" className="px-6 py-4 font-semibold">Item</th>
                                <th scope="col" className="px-6 py-4 font-semibold">Details</th>
                                <th scope="col" className="px-6 py-4 font-semibold text-right">Payment</th>
                                <th scope="col" className="px-6 py-4 font-semibold text-right">Total</th>
                                <th scope="col" className="px-6 py-4 font-semibold">Date</th>
                                <th scope="col" className="px-6 py-4 font-semibold text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {transactions.map(t => {
                                const isUnsynced = unsyncedIds.has(t.id);
                                const reminder = reminders.find(r => r.transactionId === t.id);
                                const reminderStatus = reminder ? getReminderStatus(reminder.remindAt) : undefined;
                                const balanceDue = t.total - (t.paidAmount || 0);
                                const canSetReminder = t.paymentStatus !== 'paid';
                                const reminderTooltip = reminder ? `Reminder set for: ${new Date(reminder.remindAt).toLocaleString()}` : 'Set a reminder for this transaction';

                                return (
                                <React.Fragment key={t.id}>
                                    <tr className={`border-b border-slate-700 transition-colors duration-200 ${selectedIds.has(t.id) ? 'bg-primary-500/10' : 'bg-slate-800 hover:bg-slate-700/60'}`}>
                                        {isEditMode && (
                                            <td className="px-4 py-4 align-top">
                                                 <input
                                                    type="checkbox"
                                                    className="h-4 w-4 rounded border-slate-600 bg-slate-700 text-primary-600 focus:ring-primary-500 focus:ring-offset-slate-800"
                                                    checked={selectedIds.has(t.id)}
                                                    onChange={() => onSelectOne(t.id)}
                                                />
                                            </td>
                                        )}
                                        <td className="px-6 py-4 font-medium text-slate-100 align-top">
                                            <div className="flex items-center gap-2">
                                                 <span>{t.customerName}</span>
                                                {isUnsynced && (
                                                    <span title="Pending sync">
                                                        <ClockIcon className="h-4 w-4 text-primary-400" />
                                                    </span>
                                                )}
                                            </div>
                                            {t.customerMobile && <div className="text-xs font-normal text-slate-400 mt-0.5">{t.customerMobile}</div>}
                                        </td>
                                        <td className="px-6 py-4 align-top font-medium text-slate-200">{t.item}</td>
                                        <td className="px-6 py-4 align-top text-slate-300">
                                             <div className="text-sm">{t.quantity.toFixed(2)} kg</div>
                                             <div className="text-xs">@ {formatCurrency(t.rate)}/kg</div>
                                        </td>
                                        <td className="px-6 py-4 text-right align-top font-medium text-slate-200">
                                            <div className="flex items-center justify-end gap-1.5">
                                                <StatusBadge status={t.paymentStatus} />
                                                {t.paymentStatus === 'partial' && (
                                                    <span title="Partial payment received. Balance due.">
                                                        <ReceiptIcon className="text-yellow-400" />
                                                    </span>
                                                )}
                                            </div>
                                            {t.paymentStatus !== 'paid' && balanceDue > 0 && (
                                                <div className="text-xs text-red-400 font-semibold mt-1">
                                                    Due: {formatCurrency(balanceDue)}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right font-bold text-primary-400 align-top text-base">{formatCurrency(t.total)}</td>
                                        <td className="px-6 py-4 whitespace-nowrap align-top text-slate-300">{new Date(t.date).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}</td>
                                        <td className="px-6 py-4 text-center align-top">
                                            <div className="flex justify-end items-center space-x-1">
                                                {isEditMode && (
                                                    <>
                                                        {canSetReminder && (
                                                            <button onClick={() => onSetReminder(t)} title={reminderTooltip} className={`p-2 rounded-full transition-colors text-slate-400 hover:bg-slate-700`} aria-label="Set reminder">
                                                                <BellIcon isActive={!!reminder} status={reminderStatus} />
                                                            </button>
                                                        )}
                                                        <button onClick={() => onEdit(t)} className="p-2 text-blue-400 rounded-full hover:bg-blue-500/10 transition-colors" aria-label={`Edit transaction for ${t.customerName}`}>
                                                            <EditIcon />
                                                        </button>
                                                        <button onClick={() => onDelete(t.id)} className="p-2 text-red-400 rounded-full hover:bg-red-500/10 transition-colors" aria-label={`Delete transaction for ${t.customerName}`}>
                                                            <DeleteIcon />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                    {t.notes && (
                                        <tr className={`${selectedIds.has(t.id) ? 'bg-primary-500/10' : 'bg-slate-800 hover:bg-slate-700/60'} border-b border-slate-700`}>
                                            {isEditMode && <td className="px-4"></td>}
                                            <td colSpan={7} className="px-8 py-3 text-sm text-slate-300">
                                                <div className="p-2 bg-yellow-900/30 rounded-md border border-yellow-500/20">
                                                    <strong className="font-semibold text-slate-100">Note:</strong> <span className="italic">{t.notes}</span>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            )})}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default TransactionList;
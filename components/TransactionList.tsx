

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
        paid: 'bg-green-100 text-green-800',
        unpaid: 'bg-red-100 text-red-800',
        partial: 'bg-yellow-100 text-yellow-800',
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
            <div className="text-center py-16 px-6 bg-white rounded-xl shadow-lg border-2 border-dashed border-slate-200">
                <DocumentPlusIcon />
                <h3 className="text-xl font-semibold text-slate-700 mt-4">No transactions here.</h3>
                <p className="text-slate-500 mt-2">Click the "Add New" button to get started!</p>
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
            <div className={`bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 mb-4 overflow-hidden border ${selectedIds.has(t.id) ? 'border-primary-500 ring-2 ring-primary-500/50' : 'border-slate-200/80'}`}>
                <div className="p-5 border-l-4 border-primary-500">
                     <div className="flex justify-between items-start">
                        <div className="flex items-start gap-4">
                           {isEditMode && (
                                <input
                                    type="checkbox"
                                    className="mt-1.5 h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                                    checked={selectedIds.has(t.id)}
                                    onChange={() => onSelectOne(t.id)}
                                />
                           )}
                           <div>
                                <p className="font-bold text-lg text-slate-800 flex items-center gap-2">
                                    {t.customerName}
                                    {isUnsynced && (
                                        <span title="Pending sync">
                                            <ClockIcon className="h-4 w-4 text-primary-500" />
                                        </span>
                                    )}
                                </p>
                                <p className="text-sm text-slate-600 font-medium">{t.item}</p>
                           </div>
                        </div>
                        <div className="text-right flex-shrink-0 ml-4">
                            <p className="text-xl font-bold text-primary-600">{formatCurrency(t.total)}</p>
                            {t.customerMobile && <p className="text-xs text-slate-500 mt-1">{t.customerMobile}</p>}
                        </div>
                    </div>
                     <div className="mt-3 flex justify-between items-center">
                        <div className="flex items-center gap-1.5">
                            <StatusBadge status={t.paymentStatus} />
                            {t.paymentStatus === 'partial' && (
                                <span title="Partial payment received. Balance due.">
                                    <ReceiptIcon className="text-yellow-600" />
                                </span>
                            )}
                        </div>
                         {t.paymentStatus !== 'paid' && balanceDue > 0 && (
                            <div className="text-sm">
                                <span className="text-slate-500">Balance: </span>
                                <span className="font-bold text-red-600">{formatCurrency(balanceDue)}</span>
                            </div>
                        )}
                    </div>
                    <div className="border-t my-4 border-slate-100"></div>
                    <div className="text-sm text-slate-600 space-y-2">
                         <div className="flex justify-between">
                            <span>Quantity:</span>
                            <span className="font-medium text-slate-800">{t.quantity.toFixed(2)} kg</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Rate:</span>
                            <span className="font-medium text-slate-800">{formatCurrency(t.rate)} /kg</span>
                        </div>
                        {t.grindingCost && t.grindingCost > 0 && (
                            <div className="flex justify-between">
                                <span>Grinding Cost:</span>
                                <span className="font-medium text-slate-800">{formatCurrency(t.grindingCost)}</span>
                            </div>
                        )}
                        {t.cleaningCost && t.cleaningCost > 0 && (
                            <div className="flex justify-between">
                                <span>Cleaning Cost:</span>
                                <span className="font-medium text-slate-800">{formatCurrency(t.cleaningCost)}</span>
                            </div>
                        )}
                        <div className="flex justify-between">
                            <span>Date:</span>
                            <span className="font-medium text-slate-800">{new Date(t.date).toLocaleString('en-IN', { day: 'numeric', month: 'short', year:'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}</span>
                        </div>
                    </div>
                    {t.notes && (
                        <div className="mt-4 p-3 bg-primary-500/10 rounded-md text-sm text-slate-700 font-serif border border-primary-200/80">
                            <p><strong className="not-italic font-semibold text-slate-800">Note:</strong> <span className="italic">{t.notes}</span></p>
                        </div>
                    )}
                </div>
                 {isEditMode && (
                    <div className="bg-slate-50/70 px-4 py-2 flex justify-end items-center space-x-2">
                        {canSetReminder && (
                            <button onClick={() => onSetReminder(t)} title={reminderTooltip} className={`flex items-center gap-1.5 text-sm font-semibold py-1 px-3 rounded-md transition-colors ${!!reminder ? 'text-slate-800 hover:bg-slate-200' : 'text-slate-600 hover:bg-slate-200'}`} aria-label="Set reminder">
                                <BellIcon isActive={!!reminder} status={reminderStatus} /> {!!reminder ? 'Reminder Set' : 'Remind'}
                            </button>
                        )}
                        <button onClick={() => onEdit(t)} className="flex items-center gap-1.5 text-sm text-blue-600 font-semibold hover:text-blue-800 py-1 px-3 rounded-md hover:bg-blue-100 transition-colors" aria-label={`Edit transaction for ${t.customerName}`}>
                            <EditIcon /> Edit
                        </button>
                        <button onClick={() => onDelete(t.id)} className="flex items-center gap-1.5 text-sm text-red-600 font-semibold hover:text-red-800 py-1 px-3 rounded-md hover:bg-red-100 transition-colors" aria-label={`Delete transaction for ${t.customerName}`}>
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
            <div className="hidden md:block bg-white rounded-xl shadow-lg overflow-hidden border border-slate-200/80">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-slate-500">
                        <thead className="text-xs text-slate-700 uppercase bg-slate-100">
                            <tr>
                                {isEditMode && (
                                    <th scope="col" className="px-4 py-4">
                                        <input
                                            type="checkbox"
                                            className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
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
                                    <tr className={`border-b border-slate-200/80 transition-colors duration-200 ${selectedIds.has(t.id) ? 'bg-primary-100/50' : 'bg-white hover:bg-slate-50'}`}>
                                        {isEditMode && (
                                            <td className="px-4 py-4 align-top">
                                                 <input
                                                    type="checkbox"
                                                    className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                                                    checked={selectedIds.has(t.id)}
                                                    onChange={() => onSelectOne(t.id)}
                                                />
                                            </td>
                                        )}
                                        <td className="px-6 py-4 font-medium text-slate-900 align-top">
                                            <div className="flex items-center gap-2">
                                                 <span>{t.customerName}</span>
                                                {isUnsynced && (
                                                    <span title="Pending sync">
                                                        <ClockIcon className="h-4 w-4 text-primary-500" />
                                                    </span>
                                                )}
                                            </div>
                                            {t.customerMobile && <div className="text-xs font-normal text-slate-500 mt-0.5">{t.customerMobile}</div>}
                                        </td>
                                        <td className="px-6 py-4 align-top font-medium text-slate-800">{t.item}</td>
                                        <td className="px-6 py-4 align-top text-slate-600">
                                             <div className="text-sm">{t.quantity.toFixed(2)} kg</div>
                                             <div className="text-xs">@ {formatCurrency(t.rate)}/kg</div>
                                        </td>
                                        <td className="px-6 py-4 text-right align-top font-medium text-slate-700">
                                            <div className="flex items-center justify-end gap-1.5">
                                                <StatusBadge status={t.paymentStatus} />
                                                {t.paymentStatus === 'partial' && (
                                                    <span title="Partial payment received. Balance due.">
                                                        <ReceiptIcon className="text-yellow-600" />
                                                    </span>
                                                )}
                                            </div>
                                            {t.paymentStatus !== 'paid' && balanceDue > 0 && (
                                                <div className="text-xs text-red-600 font-semibold mt-1">
                                                    Due: {formatCurrency(balanceDue)}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right font-bold text-primary-600 align-top text-base">{formatCurrency(t.total)}</td>
                                        <td className="px-6 py-4 whitespace-nowrap align-top text-slate-600">{new Date(t.date).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}</td>
                                        <td className="px-6 py-4 text-center align-top">
                                            <div className="flex justify-center items-center space-x-1">
                                                {isEditMode && (
                                                    <>
                                                        {canSetReminder && (
                                                            <button onClick={() => onSetReminder(t)} title={reminderTooltip} className={`p-2 rounded-full transition-colors text-slate-500 hover:bg-slate-100`} aria-label="Set reminder">
                                                                <BellIcon isActive={!!reminder} status={reminderStatus} />
                                                            </button>
                                                        )}
                                                        <button onClick={() => onEdit(t)} className="p-2 text-blue-600 rounded-full hover:bg-blue-100 transition-colors" aria-label={`Edit transaction for ${t.customerName}`}>
                                                            <EditIcon />
                                                        </button>
                                                        <button onClick={() => onDelete(t.id)} className="p-2 text-red-600 rounded-full hover:bg-red-100 transition-colors" aria-label={`Delete transaction for ${t.customerName}`}>
                                                            <DeleteIcon />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                    {t.notes && (
                                        <tr className={`${selectedIds.has(t.id) ? 'bg-primary-100/50' : 'bg-white hover:bg-slate-50'} border-b border-slate-200/80`}>
                                            {isEditMode && <td className="px-4"></td>}
                                            <td colSpan={7} className="px-8 py-3 text-sm text-slate-700">
                                                <div className="p-2 bg-yellow-50 rounded-md border border-yellow-200/80">
                                                    <strong className="font-semibold text-slate-800">Note:</strong> <span className="italic">{t.notes}</span>
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
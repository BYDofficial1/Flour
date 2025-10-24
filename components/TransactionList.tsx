import React from 'react';
import type { Transaction } from '../types';
import { EditIcon } from './icons/EditIcon';
import { DeleteIcon } from './icons/DeleteIcon';
import { formatCurrency } from '../utils/currency';
import { DocumentPlusIcon } from './icons/DocumentPlusIcon';
import { ClockIcon } from './icons/ClockIcon';
import { ReceiptIcon } from './icons/ReceiptIcon';

interface TransactionListProps {
    transactions: Transaction[];
    onEdit: (transaction: Transaction) => void;
    onDelete: (id: string) => void;
    unsyncedIds: Set<string>;
    isEditMode: boolean;
}

const StatusBadge: React.FC<{ status: Transaction['paymentStatus'] }> = ({ status }) => {
    const baseClasses = "px-2 py-0.5 text-xs font-semibold rounded-full capitalize";
    const styles = {
        paid: 'bg-green-100 text-green-800',
        unpaid: 'bg-red-100 text-red-800',
        partial: 'bg-yellow-100 text-yellow-800',
    };
    return <span className={`${baseClasses} ${styles[status]}`}>{status}</span>;
};

const TransactionList: React.FC<TransactionListProps> = ({ transactions, onEdit, onDelete, unsyncedIds, isEditMode }) => {
    if (transactions.length === 0) {
        return (
            <div className="text-center py-16 px-6 bg-white rounded-lg shadow-md border-2 border-dashed border-slate-200">
                <DocumentPlusIcon />
                <h3 className="text-xl font-semibold text-slate-700 mt-4">No transactions here.</h3>
                <p className="text-slate-500 mt-2">Click the "Add New" button to get started!</p>
            </div>
        );
    }

    // A more detailed and visually appealing card for mobile view
    const TransactionCard: React.FC<{ t: Transaction }> = ({ t }) => {
        const isUnsynced = unsyncedIds.has(t.id);
        const balanceDue = t.total - (t.paidAmount || 0);

        return (
            <div className="bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300 mb-4 overflow-hidden border border-slate-200/80">
                <div className="p-4 border-l-4 border-primary-500">
                    <div className="flex justify-between items-start">
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
                    <div className="border-t my-3 border-slate-100"></div>
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
                        <div className="mt-4 p-3 bg-primary-50 rounded-md text-sm text-slate-700 font-serif border border-primary-200/80">
                            <p><strong className="not-italic font-semibold text-slate-800">Note:</strong> <span className="italic">{t.notes}</span></p>
                        </div>
                    )}
                </div>
                 {isEditMode && (
                    <div className="bg-slate-50/70 px-4 py-2 flex justify-end items-center space-x-2">
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

            {/* Desktop Table View - cleaner and more organized */}
            <div className="hidden md:block bg-white rounded-lg shadow-md overflow-hidden border border-slate-200/80">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-slate-500">
                        <thead className="text-xs text-slate-700 uppercase bg-slate-100/80">
                            <tr>
                                <th scope="col" className="px-4 py-4 font-semibold">Customer</th>
                                <th scope="col" className="px-4 py-4 font-semibold">Item</th>
                                <th scope="col" className="px-4 py-4 font-semibold">Details</th>
                                <th scope="col" className="px-4 py-4 font-semibold text-right">Payment</th>
                                <th scope="col" className="px-4 py-4 font-semibold text-right">Total</th>
                                <th scope="col" className="px-4 py-4 font-semibold">Date</th>
                                {isEditMode && <th scope="col" className="px-4 py-4 font-semibold text-center">Actions</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {transactions.map(t => {
                                const isUnsynced = unsyncedIds.has(t.id);
                                const balanceDue = t.total - (t.paidAmount || 0);
                                return (
                                <React.Fragment key={t.id}>
                                    <tr className="bg-white border-b hover:bg-primary-50/50 transition-colors duration-200">
                                        <td className="px-4 py-4 font-medium text-slate-900 align-top">
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
                                        <td className="px-4 py-4 align-top font-medium text-slate-800">{t.item}</td>
                                        <td className="px-4 py-4 align-top text-slate-600">
                                             <div className="text-sm">{t.quantity.toFixed(2)} kg</div>
                                             <div className="text-xs">@ {formatCurrency(t.rate)}/kg</div>
                                        </td>
                                        <td className="px-4 py-4 text-right align-top font-medium text-slate-700">
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
                                        <td className="px-4 py-4 text-right font-bold text-primary-600 align-top text-base">{formatCurrency(t.total)}</td>
                                        <td className="px-4 py-4 whitespace-nowrap align-top text-slate-600">{new Date(t.date).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}</td>
                                        {isEditMode && (
                                            <td className="px-4 py-4 text-center align-top">
                                                <div className="flex justify-center items-center space-x-1">
                                                    <button onClick={() => onEdit(t)} className="p-2 text-blue-600 rounded-full hover:bg-blue-100 transition-colors" aria-label={`Edit transaction for ${t.customerName}`}>
                                                        <EditIcon />
                                                    </button>
                                                    <button onClick={() => onDelete(t.id)} className="p-2 text-red-600 rounded-full hover:bg-red-100 transition-colors" aria-label={`Delete transaction for ${t.customerName}`}>
                                                        <DeleteIcon />
                                                    </button>
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                    {t.notes && (
                                        <tr className="bg-white border-b hover:bg-primary-50/50">
                                            <td colSpan={isEditMode ? 7 : 6} className="px-6 py-3 text-sm text-slate-700">
                                                <div className="p-2 bg-yellow-50 rounded-md border border-yellow-200">
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
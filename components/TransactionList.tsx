

import React from 'react';
import type { Transaction } from '../types';
import { EditIcon } from './icons/EditIcon';
import { DeleteIcon } from './icons/DeleteIcon';
import { formatCurrency } from '../utils/currency';
import { DocumentPlusIcon } from './icons/DocumentPlusIcon';

interface TransactionListProps {
    transactions: Transaction[];
    onEdit: (transaction: Transaction) => void;
    onDelete: (id: string) => void;
}

const TransactionList: React.FC<TransactionListProps> = ({ transactions, onEdit, onDelete }) => {
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
    const TransactionCard: React.FC<{ t: Transaction }> = ({ t }) => (
        <div className="bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300 mb-4 overflow-hidden border border-slate-200/80">
            <div className="p-4 border-l-4 border-amber-500">
                <div className="flex justify-between items-start">
                    <div>
                        <p className="font-bold text-lg text-slate-800">{t.customerName}</p>
                        <p className="text-sm text-slate-600 font-medium">{t.item}</p>
                    </div>
                    <div className="text-right flex-shrink-0 ml-4">
                        <p className="text-xl font-bold text-amber-600">{formatCurrency(t.total)}</p>
                        {t.customerMobile && <p className="text-xs text-slate-500 mt-1">{t.customerMobile}</p>}
                    </div>
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
                    <div className="flex justify-between">
                        <span>Date:</span>
                        <span className="font-medium text-slate-800">{new Date(t.date).toLocaleString('en-IN', { day: 'numeric', month: 'short', year:'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}</span>
                    </div>
                </div>
                {t.notes && (
                    <div className="mt-4 p-3 bg-amber-50 rounded-md text-sm text-slate-700 font-serif border border-amber-200/80">
                        <p><strong className="not-italic font-semibold text-slate-800">Note:</strong> <span className="italic">{t.notes}</span></p>
                    </div>
                )}
            </div>
             <div className="bg-slate-50/70 px-4 py-2 flex justify-end items-center space-x-2">
                <button onClick={() => onEdit(t)} className="flex items-center gap-1.5 text-sm text-blue-600 font-semibold hover:text-blue-800 py-1 px-3 rounded-md hover:bg-blue-100 transition-colors" aria-label={`Edit transaction for ${t.customerName}`}>
                    <EditIcon /> Edit
                </button>
                <button onClick={() => onDelete(t.id)} className="flex items-center gap-1.5 text-sm text-red-600 font-semibold hover:text-red-800 py-1 px-3 rounded-md hover:bg-red-100 transition-colors" aria-label={`Delete transaction for ${t.customerName}`}>
                    <DeleteIcon /> Delete
                </button>
            </div>
        </div>
    );

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
                                <th scope="col" className="px-6 py-4 font-semibold">Customer</th>
                                <th scope="col" className="px-6 py-4 font-semibold">Item & Details</th>
                                <th scope="col" className="px-6 py-4 font-semibold text-right">Total</th>
                                <th scope="col" className="px-6 py-4 font-semibold">Date & Time</th>
                                <th scope="col" className="px-6 py-4 font-semibold text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {transactions.map(t => (
                                <React.Fragment key={t.id}>
                                    <tr className="bg-white border-b hover:bg-amber-50/50 transition-colors duration-200">
                                        <td className="px-6 py-4 font-medium text-slate-900 align-top">
                                            <div>
                                                {t.customerName}
                                                {t.customerMobile && <div className="text-xs font-normal text-slate-500 mt-0.5">{t.customerMobile}</div>}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 align-top">
                                             <div>
                                                <span className="font-medium text-slate-800">{t.item}</span>
                                                <div className="text-xs text-slate-500 mt-0.5">
                                                   {t.quantity.toFixed(2)} kg @ {formatCurrency(t.rate)}/kg
                                                </div>
                                                {t.grindingCost && t.grindingCost > 0 && (
                                                    <div className="text-xs text-slate-500 mt-0.5">
                                                        + Grinding: <span className="font-medium">{formatCurrency(t.grindingCost)}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right font-bold text-amber-600 align-top text-base">{formatCurrency(t.total)}</td>
                                        <td className="px-6 py-4 whitespace-nowrap align-top text-slate-600">{new Date(t.date).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}</td>
                                        <td className="px-6 py-4 text-center align-top">
                                            <div className="flex justify-center items-center space-x-1">
                                                <button onClick={() => onEdit(t)} className="p-2 text-blue-600 rounded-full hover:bg-blue-100 transition-colors" aria-label={`Edit transaction for ${t.customerName}`}>
                                                    <EditIcon />
                                                </button>
                                                <button onClick={() => onDelete(t.id)} className="p-2 text-red-600 rounded-full hover:bg-red-100 transition-colors" aria-label={`Delete transaction for ${t.customerName}`}>
                                                    <DeleteIcon />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                    {t.notes && (
                                        <tr className="bg-white border-b hover:bg-amber-50/50">
                                            <td colSpan={5} className="px-8 py-3 text-sm text-slate-700">
                                                <div className="p-2 bg-yellow-50 rounded-md border border-yellow-200">
                                                    <strong className="font-semibold text-slate-800">Note:</strong> <span className="italic">{t.notes}</span>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default TransactionList;
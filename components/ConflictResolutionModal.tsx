import React, { useState, useEffect, useMemo, Fragment } from 'react';
import type { Transaction } from '../types';
import { formatCurrency } from '../utils/currency';
import { ArrowRightLeftIcon } from './icons/ArrowRightLeftIcon';
import { CloseIcon } from './icons/CloseIcon';

interface ConflictResolutionModalProps {
    isOpen: boolean;
    conflicts: { local: Transaction; server: Transaction }[];
    onResolve: (chosenVersion: Transaction, choice: 'local' | 'server') => void;
}

const getDiffFields = (local: Transaction, server: Transaction): Set<keyof Transaction> => {
    const diff = new Set<keyof Transaction>();
    if (!local || !server) return diff;

    const keys: (keyof Transaction)[] = [
        'customerName', 'customerMobile', 'item', 'quantity', 'rate', 
        'grindingCost', 'cleaningCost', 'total', 'paymentStatus', 'paidAmount', 'notes'
    ];

    for (const key of keys) {
        const localValue = local[key] ?? '';
        const serverValue = server[key] ?? '';
        
        // Handle potential floating point inaccuracies for numeric fields
        if (typeof localValue === 'number' && typeof serverValue === 'number') {
            if (Math.abs(localValue - serverValue) > 0.001) {
                diff.add(key);
            }
        } else if (localValue !== serverValue) {
            diff.add(key);
        }
    }
    return diff;
};

const DetailRow: React.FC<{ label: string; value: React.ReactNode; isDiff: boolean }> = ({ label, value, isDiff }) => (
    <div className={`p-2 rounded-md transition-colors duration-300 ${isDiff ? 'bg-yellow-500/20' : 'bg-slate-600/50'}`}>
        <div className="text-xs font-semibold text-slate-400">{label}</div>
        <div className="text-sm font-medium text-slate-100 break-words">{value || <span className="italic text-slate-500">Not set</span>}</div>
    </div>
);

const TransactionDetailView: React.FC<{ transaction: Transaction; diffFields: Set<keyof Transaction> }> = ({ transaction, diffFields }) => {
    const balanceDue = transaction.total - (transaction.paidAmount || 0);

    return (
        <div className="space-y-2">
            <DetailRow label="Customer Name" value={transaction.customerName} isDiff={diffFields.has('customerName')} />
            <DetailRow label="Customer Mobile" value={transaction.customerMobile} isDiff={diffFields.has('customerMobile')} />
            <DetailRow label="Item" value={transaction.item} isDiff={diffFields.has('item')} />
            <div className="grid grid-cols-2 gap-2">
                <DetailRow label="Quantity (kg)" value={transaction.quantity?.toFixed(2)} isDiff={diffFields.has('quantity')} />
                <DetailRow label="Rate (Rs/kg)" value={formatCurrency(transaction.rate || 0)} isDiff={diffFields.has('rate')} />
            </div>
             <div className="grid grid-cols-2 gap-2">
                <DetailRow label="Grinding Cost" value={formatCurrency(transaction.grindingCost || 0)} isDiff={diffFields.has('grindingCost')} />
                <DetailRow label="Cleaning Cost" value={formatCurrency(transaction.cleaningCost || 0)} isDiff={diffFields.has('cleaningCost')} />
            </div>
            <div className="border-t my-2 border-slate-600"></div>
             <div className="grid grid-cols-2 gap-2">
                <DetailRow label="Status" value={<span className="capitalize">{transaction.paymentStatus}</span>} isDiff={diffFields.has('paymentStatus')} />
                <DetailRow label="Paid Amount" value={formatCurrency(transaction.paidAmount || 0)} isDiff={diffFields.has('paidAmount')} />
            </div>
            <DetailRow label="Balance Due" value={formatCurrency(balanceDue)} isDiff={diffFields.has('total')} />
            <DetailRow label="Total" value={<span className="font-bold text-lg text-primary-400">{formatCurrency(transaction.total)}</span>} isDiff={diffFields.has('total')} />
            <DetailRow label="Notes" value={<span className="italic">"{transaction.notes}"</span>} isDiff={diffFields.has('notes')} />
            <div className="text-right text-xs text-slate-500 pt-1">
                Last updated: {transaction.updatedAt ? new Date(transaction.updatedAt).toLocaleString() : 'N/A'}
            </div>
        </div>
    );
};

const ConflictResolutionModal: React.FC<ConflictResolutionModalProps> = ({ isOpen, conflicts, onResolve }) => {
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        if (isOpen) {
            setCurrentIndex(0);
        }
    }, [isOpen]);

    const currentConflict = conflicts[currentIndex];
    const diffFields = useMemo(() => {
        return currentConflict ? getDiffFields(currentConflict.local, currentConflict.server) : new Set();
    }, [currentConflict]);
    
    if (!isOpen || !currentConflict) return null;

    const { local, server } = currentConflict;
    
    const handleResolve = (chosenVersion: Transaction, choice: 'local' | 'server') => {
        onResolve(chosenVersion, choice);
        // The parent component will handle removing the resolved conflict from the list.
        // If it was the last one, the modal will close.
        // If not, the list will re-render, and the next conflict will be at index 0.
        // We reset currentIndex to ensure we always show the first of the remaining conflicts.
        setCurrentIndex(0);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center p-4" aria-modal="true" role="dialog">
            <div className="bg-slate-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col transform transition-all animate-[fadeIn_0.2s_ease-out_forwards] scale-95"
                 style={{ animation: 'fadeIn 0.2s ease-out forwards, scaleUp 0.2s ease-out forwards' }}>
                <style>{`
                    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                    @keyframes scaleUp { from { transform: scale(0.95); } to { transform: scale(1); } }
                `}</style>
                <header className="p-4 border-b border-slate-700">
                    <h2 className="text-xl font-bold text-slate-100 text-center">
                        Resolve Sync Conflict ({currentIndex + 1} of {conflicts.length})
                    </h2>
                    <p className="text-center text-sm text-slate-300 mt-1">
                        The record for <strong className="text-primary-400">{local.customerName}</strong> was updated on another device. Choose which version to keep.
                    </p>
                </header>
                
                <main className="flex-1 p-4 overflow-y-auto no-scrollbar grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Local Version */}
                    <div className="border-2 border-blue-500 rounded-lg bg-slate-700/50">
                        <h3 className="text-lg font-semibold text-white bg-blue-600 p-3 rounded-t-md">Your Version <span className="font-normal text-sm">(Offline)</span></h3>
                        <div className="p-3">
                            <TransactionDetailView transaction={local} diffFields={diffFields} />
                        </div>
                        <div className="p-3">
                            <button
                                onClick={() => handleResolve(local, 'local')}
                                className="w-full py-3 bg-blue-600 text-white font-bold rounded-lg shadow-md hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-800"
                            >
                                Keep This Version
                            </button>
                        </div>
                    </div>

                    {/* Server Version */}
                    <div className="border-2 border-green-500 rounded-lg bg-slate-700/50">
                         <h3 className="text-lg font-semibold text-white bg-green-600 p-3 rounded-t-md">Server Version <span className="font-normal text-sm">(Latest)</span></h3>
                         <div className="p-3">
                            <TransactionDetailView transaction={server} diffFields={diffFields} />
                         </div>
                         <div className="p-3">
                             <button
                                onClick={() => handleResolve(server, 'server')}
                                className="w-full py-3 bg-green-600 text-white font-bold rounded-lg shadow-md hover:bg-green-700 transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-slate-800"
                            >
                                Use Server Version
                            </button>
                         </div>
                    </div>
                </main>
            </div>
        </div>
    );
};

export default ConflictResolutionModal;
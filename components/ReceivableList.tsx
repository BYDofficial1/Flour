import React from 'react';
import type { Receivable } from '../types';
import { formatCurrency } from '../utils/currency';
import { EditIcon } from './icons/EditIcon';
import { DeleteIcon } from './icons/DeleteIcon';
import { DocumentPlusIcon } from './icons/DocumentPlusIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';

interface ReceivableListProps {
    receivables: Receivable[];
    onEdit: (receivable: Receivable) => void;
    onDelete: (id: string) => void;
    onUpdate: (receivable: Receivable) => void;
    isEditMode: boolean;
}

const StatusBadge: React.FC<{ status: Receivable['status'] }> = ({ status }) => {
    const baseClasses = "px-2.5 py-1 text-xs font-bold rounded-full capitalize";
    const styles = {
        pending: 'bg-red-500/20 text-red-300',
        received: 'bg-green-500/20 text-green-300',
    };
    return <span className={`${baseClasses} ${styles[status]}`}>{status}</span>;
};


const ReceivableCard: React.FC<{ receivable: Receivable; onEdit: () => void; onDelete: () => void; onMarkAsReceived: () => void; isEditMode: boolean }> = ({ receivable, onEdit, onDelete, onMarkAsReceived, isEditMode }) => {
    const statusStyles: Record<Receivable['status'], { border: string, bg: string }> = {
        pending: { border: 'border-l-red-500/80', bg: 'bg-gradient-to-r from-red-500/10' },
        received: { border: 'border-l-green-500/80', bg: 'bg-gradient-to-r from-green-500/10' },
    };
    
    const cardStatus = receivable.status;
    const baseClasses = `bg-slate-800 rounded-xl shadow-lg hover:shadow-primary-500/10 transition-all duration-300 overflow-hidden border-l-4`;

    return (
        <div className={`${baseClasses} ${statusStyles[cardStatus].border} via-slate-800 to-slate-800`}>
            <div className="p-4 flex flex-col sm:flex-row justify-between sm:items-start gap-4">
                <div className="flex-1 min-w-0">
                    <p className="font-bold text-lg text-slate-100 truncate">{receivable.person_name}</p>
                     {receivable.due_date && (
                        <p className="text-sm text-slate-400 mt-1">
                            Due: {new Date(receivable.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                     )}
                     {receivable.notes && <p className="text-sm italic text-slate-300 mt-3 pt-2 border-t border-slate-600/50">"{receivable.notes}"</p>}
                </div>
                 <div className="flex-shrink-0 text-left sm:text-right">
                    <p className="text-3xl font-bold text-primary-400">{formatCurrency(receivable.amount)}</p>
                     <div className="mt-1">
                        <StatusBadge status={cardStatus} />
                    </div>
                </div>
            </div>
            
             {isEditMode && (
                <div className="p-3 bg-slate-900/40 border-t border-slate-700/50 flex justify-end items-center gap-2">
                    {receivable.status === 'pending' && (
                        <button onClick={onMarkAsReceived} className="flex items-center gap-2 px-3 py-1.5 text-sm font-semibold bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors">
                            <CheckCircleIcon className="h-4 w-4" />
                            Mark as Received
                        </button>
                    )}
                    <button onClick={onEdit} className="p-2 text-blue-400 rounded-full hover:bg-blue-500/10" aria-label="Edit record"><EditIcon /></button>
                    <button onClick={onDelete} className="p-2 text-red-400 rounded-full hover:bg-red-500/10" aria-label="Delete record"><DeleteIcon /></button>
                </div>
            )}
        </div>
    );
};

const ReceivableList: React.FC<ReceivableListProps> = ({ receivables, onEdit, onDelete, onUpdate, isEditMode }) => {
    
    const handleMarkAsReceived = (receivable: Receivable) => {
        onUpdate({ ...receivable, status: 'received' });
    };

    if (receivables.length === 0) {
        return (
            <div className="text-center py-16 px-6 bg-slate-800 rounded-xl shadow-lg border-2 border-dashed border-slate-700">
                <DocumentPlusIcon />
                <h3 className="text-xl font-semibold text-slate-200 mt-4">No pending collections.</h3>
                <p className="text-slate-400 mt-2">Click "Add Collection" to log a payment you need to receive.</p>
            </div>
        );
    }
    
    const pending = receivables.filter(r => r.status === 'pending');
    const received = receivables.filter(r => r.status === 'received');

    return (
        <div className="space-y-8">
            {pending.length > 0 && (
                <div>
                    <h3 className="text-lg font-bold text-red-300 mb-3">Pending ({pending.length})</h3>
                    <div className="space-y-4">
                        {pending.map(r => (
                             <ReceivableCard
                                key={r.id}
                                receivable={r}
                                onEdit={() => onEdit(r)}
                                onDelete={() => onDelete(r.id)}
                                onMarkAsReceived={() => handleMarkAsReceived(r)}
                                isEditMode={isEditMode}
                            />
                        ))}
                    </div>
                </div>
            )}
            
            {received.length > 0 && (
                 <div>
                    <h3 className="text-lg font-bold text-green-300 mb-3">Received ({received.length})</h3>
                     <div className="space-y-4">
                        {received.map(r => (
                             <ReceivableCard
                                key={r.id}
                                receivable={r}
                                onEdit={() => onEdit(r)}
                                onDelete={() => onDelete(r.id)}
                                onMarkAsReceived={() => handleMarkAsReceived(r)}
                                isEditMode={isEditMode}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ReceivableList;
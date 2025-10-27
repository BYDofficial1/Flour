import React, { useState, useEffect } from 'react';
import type { Receivable } from '../types';
import { CloseIcon } from './icons/CloseIcon';
import { formatCurrency } from '../utils/currency';

interface ReceivableFormProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: any) => void;
    initialData: Receivable | null;
}

const ReceivableForm: React.FC<ReceivableFormProps> = ({ isOpen, onClose, onSubmit, initialData }) => {
    const [personName, setPersonName] = useState('');
    const [amount, setAmount] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [notes, setNotes] = useState('');
    const [status, setStatus] = useState<'pending' | 'received'>('pending');

    const isEditing = !!initialData;

    useEffect(() => {
        if (isOpen) {
            setPersonName(initialData?.person_name || '');
            setAmount(initialData?.amount?.toString() || '');
            setDueDate(initialData?.due_date ? new Date(initialData.due_date).toISOString().split('T')[0] : '');
            setNotes(initialData?.notes || '');
            setStatus(initialData?.status || 'pending');
        }
    }, [initialData, isOpen]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const receivableData = {
            person_name: personName,
            amount: parseFloat(amount) || 0,
            due_date: dueDate || null,
            notes,
            status
        };
        onSubmit(receivableData);
    };

    if (!isOpen) return null;
    
    const formInputClasses = "mt-1 block w-full px-3 py-2 bg-slate-700 text-slate-100 border border-slate-600 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-primary-500 focus:border-primary-500";
    
    const StatusButton: React.FC<{ value: 'pending' | 'received'; label: string }> = ({ value, label }) => (
        <button
            type="button"
            onClick={() => setStatus(value)}
            className={`w-full py-2 text-sm font-semibold rounded-md transition-all ${status === value ? 'bg-primary-500 text-white shadow-md' : 'bg-transparent hover:bg-slate-600/50 text-slate-300'}`}
        >
            {label}
        </button>
    );

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4">
            <div 
                className="bg-slate-800 rounded-lg shadow-xl w-full max-w-md transform transition-all"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex justify-between items-center p-4 border-b border-slate-700">
                    <h2 className="text-xl font-bold text-slate-100">{isEditing ? 'Edit Collection' : 'New Collection'}</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-200"><CloseIcon /></button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label htmlFor="personName" className="block text-sm font-medium text-slate-300">Person's Name</label>
                        <input type="text" id="personName" value={personName} onChange={e => setPersonName(e.target.value)} required autoFocus className={formInputClasses} />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                         <div>
                            <label htmlFor="amount" className="block text-sm font-medium text-slate-300">Amount (Rs)</label>
                            <input type="number" id="amount" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} required className={formInputClasses} />
                        </div>
                        <div>
                            <label htmlFor="dueDate" className="block text-sm font-medium text-slate-300">Due Date (Optional)</label>
                            <input type="date" id="dueDate" value={dueDate} onChange={e => setDueDate(e.target.value)} className={formInputClasses} />
                        </div>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Status</label>
                        <div className="flex items-center space-x-1 p-1 bg-slate-900 rounded-lg">
                            <StatusButton value="pending" label="Pending" />
                            <StatusButton value="received" label="Received" />
                        </div>
                    </div>
                    <div>
                        <label htmlFor="notes" className="block text-sm font-medium text-slate-300">Notes (Optional)</label>
                        <textarea id="notes" value={notes} onChange={e => setNotes(e.target.value)} rows={3} className={formInputClasses}></textarea>
                    </div>
                    <div className="flex justify-end pt-4">
                        <button 
                            type="submit"
                            className="w-full sm:w-auto px-6 py-2 bg-primary-500 text-white font-semibold rounded-lg shadow-md hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-slate-800"
                        >
                            {isEditing ? 'Update Record' : 'Save Record'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ReceivableForm;
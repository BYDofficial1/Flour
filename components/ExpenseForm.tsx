import React, { useState, useEffect } from 'react';
import type { Expense, ExpenseCategory } from '../types';
import { CloseIcon } from './icons/CloseIcon';

interface ExpenseFormProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: any) => void;
    initialData: Expense | null;
    categories: ExpenseCategory[];
}

const ExpenseForm: React.FC<ExpenseFormProps> = ({ isOpen, onClose, onSubmit, initialData, categories }) => {
    const [name, setName] = useState('');
    const [amount, setAmount] = useState('');
    const [category, setCategory] = useState<string>('');
    const [date, setDate] = useState('');
    const [notes, setNotes] = useState('');

    const isEditing = !!initialData;

    useEffect(() => {
        if (isOpen) {
            const initialDate = initialData ? new Date(initialData.date) : new Date();
            setDate(initialDate.toISOString().split('T')[0]);
            
            setName(initialData?.expense_name || '');
            setAmount(initialData?.amount?.toString() || '');
            setCategory(initialData?.category || (categories.length > 0 ? categories[0].name : ''));
            setNotes(initialData?.notes || '');
        }
    }, [initialData, isOpen, categories]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const expenseData = {
            expense_name: name,
            amount: parseFloat(amount) || 0,
            category,
            date: new Date(date).toISOString(),
            notes
        };
        onSubmit(expenseData);
    };

    if (!isOpen) return null;
    
    const formInputClasses = "mt-1 block w-full px-3 py-2 bg-slate-700 text-slate-100 border border-slate-600 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-primary-500 focus:border-primary-500";

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4">
            <div 
                className="bg-slate-800 rounded-lg shadow-xl w-full max-w-md transform transition-all"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex justify-between items-center p-4 border-b border-slate-700">
                    <h2 className="text-xl font-bold text-slate-100">{isEditing ? 'Edit Expense' : 'New Expense'}</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-200"><CloseIcon /></button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label htmlFor="expenseName" className="block text-sm font-medium text-slate-300">Expense Name</label>
                        <input type="text" id="expenseName" value={name} onChange={e => setName(e.target.value)} required className={formInputClasses} />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="amount" className="block text-sm font-medium text-slate-300">Amount (Rs)</label>
                            <input type="number" id="amount" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} required className={formInputClasses} />
                        </div>
                        <div>
                            <label htmlFor="category" className="block text-sm font-medium text-slate-300">Category</label>
                            <select id="category" value={category} onChange={e => setCategory(e.target.value)} className={formInputClasses}>
                                {categories.map(cat => <option key={cat.id} value={cat.name}>{cat.name}</option>)}
                            </select>
                        </div>
                    </div>
                    <div>
                        <label htmlFor="date" className="block text-sm font-medium text-slate-300">Date</label>
                        <input type="date" id="date" value={date} onChange={e => setDate(e.target.value)} required className={formInputClasses} />
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
                            {isEditing ? 'Update Expense' : 'Save Expense'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ExpenseForm;
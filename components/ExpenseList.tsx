import React from 'react';
import type { Expense } from '../types';
import { formatCurrency } from '../utils/currency';
import { EditIcon } from './icons/EditIcon';
import { DeleteIcon } from './icons/DeleteIcon';
import { DocumentPlusIcon } from './icons/DocumentPlusIcon';

interface ExpenseListProps {
    expenses: Expense[];
    onEdit: (expense: Expense) => void;
    onDelete: (id: string) => void;
    isEditMode: boolean;
}

const ExpenseCard: React.FC<{ expense: Expense; onEdit: () => void; onDelete: () => void; isEditMode: boolean }> = ({ expense, onEdit, onDelete, isEditMode }) => (
    <div className="bg-slate-800 p-4 rounded-xl shadow-lg border border-slate-700 hover:bg-slate-700/50 transition-colors">
        <div className="flex justify-between items-start gap-4">
            <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                    <span className={`px-2.5 py-1 text-xs font-bold rounded-full capitalize bg-slate-500/20 text-slate-300`}>{expense.category}</span>
                    <p className="text-sm text-slate-400">
                        {new Date(expense.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                </div>
                <p className="font-bold text-lg text-slate-100">{expense.expense_name}</p>
                {expense.notes && <p className="text-sm italic text-slate-300 mt-2">"{expense.notes}"</p>}
            </div>
            <div className="text-right flex-shrink-0">
                <p className="text-2xl font-bold text-red-400">{formatCurrency(expense.amount)}</p>
                 {isEditMode && (
                    <div className="flex items-center justify-end gap-1 mt-2">
                        <button onClick={onEdit} className="p-2 text-blue-400 rounded-full hover:bg-blue-500/10" aria-label="Edit expense">
                            <EditIcon />
                        </button>
                        <button onClick={onDelete} className="p-2 text-red-400 rounded-full hover:bg-red-500/10" aria-label="Delete expense">
                            <DeleteIcon />
                        </button>
                    </div>
                )}
            </div>
        </div>
    </div>
);

const ExpenseList: React.FC<ExpenseListProps> = ({ expenses, onEdit, onDelete, isEditMode }) => {
    if (expenses.length === 0) {
        return (
            <div className="text-center py-16 px-6 bg-slate-800 rounded-xl shadow-lg border-2 border-dashed border-slate-700">
                <DocumentPlusIcon />
                <h3 className="text-xl font-semibold text-slate-200 mt-4">No expenses logged yet.</h3>
                <p className="text-slate-400 mt-2">Click "Add Expense" to start tracking your costs.</p>
            </div>
        );
    }
    
    return (
        <div className="space-y-4">
            {expenses.map(e => (
                <ExpenseCard
                    key={e.id}
                    expense={e}
                    onEdit={() => onEdit(e)}
                    onDelete={() => onDelete(e.id)}
                    isEditMode={isEditMode}
                />
            ))}
        </div>
    );
};

export default ExpenseList;
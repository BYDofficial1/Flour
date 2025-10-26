import React, { useState } from 'react';
import type { Expense, ExpenseCategory } from '../types';
import { PlusIcon } from '../components/icons/PlusIcon';
import ConfirmationModal from '../components/ConfirmationModal';
import ExpenseForm from '../components/ExpenseForm';
import ExpenseList from '../components/ExpenseList';

interface ExpensesPageProps {
    expenses: Expense[];
    onAddExpense: (expense: Omit<Expense, 'id' | 'created_at' | 'user_id'>) => void;
    onUpdateExpense: (expense: Expense) => void;
    onDeleteExpense: (id: string) => void;
    isEditMode: boolean;
    expenseCategories: ExpenseCategory[];
}

const ExpensesPage: React.FC<ExpensesPageProps> = ({ expenses, onAddExpense, onUpdateExpense, onDeleteExpense, isEditMode, expenseCategories }) => {
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
    const [expenseToDelete, setExpenseToDelete] = useState<string | null>(null);

    const openForm = (expenseToEdit: Expense | null = null) => {
        setEditingExpense(expenseToEdit);
        setIsFormOpen(true);
    };

    const closeForm = () => {
        setIsFormOpen(false);
        setEditingExpense(null);
    };

    const handleSubmit = (data: any) => {
        if (editingExpense) {
            onUpdateExpense({ ...editingExpense, ...data });
        } else {
            onAddExpense(data);
        }
        closeForm();
    };

    const handleDelete = (id: string) => {
        onDeleteExpense(id);
        setExpenseToDelete(null);
    };

    return (
        <div className="mt-4 space-y-6 pb-16">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <h2 className="text-2xl font-bold text-slate-200 self-start">All Expenses</h2>
                {isEditMode && (
                    <button
                        onClick={() => openForm()}
                        className="w-full md:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg shadow-md hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-slate-900 transition-transform transform hover:scale-105"
                    >
                        <PlusIcon />
                        <span className="font-semibold">Add Expense</span>
                    </button>
                )}
            </div>

            <ExpenseList
                expenses={expenses}
                onEdit={openForm}
                onDelete={(id) => setExpenseToDelete(id)}
                isEditMode={isEditMode}
            />

            {isFormOpen && (
                <ExpenseForm
                    isOpen={isFormOpen}
                    onClose={closeForm}
                    onSubmit={handleSubmit}
                    initialData={editingExpense}
                    categories={expenseCategories}
                />
            )}

            {expenseToDelete && (
                <ConfirmationModal
                    isOpen={!!expenseToDelete}
                    onClose={() => setExpenseToDelete(null)}
                    onConfirm={() => handleDelete(expenseToDelete)}
                    title="Delete Expense"
                    message="Are you sure you want to delete this expense? This action cannot be undone."
                />
            )}
        </div>
    );
};

export default ExpensesPage;
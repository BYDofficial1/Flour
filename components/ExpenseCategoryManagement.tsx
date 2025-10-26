import React, { useState, useEffect } from 'react';
import type { ExpenseCategory } from '../types';
import { CloseIcon } from './icons/CloseIcon';
import { EditIcon } from './icons/EditIcon';
import { DeleteIcon } from './icons/DeleteIcon';
import { PlusIcon } from './icons/PlusIcon';
import ConfirmationModal from './ConfirmationModal';

interface ManagementProps {
    isOpen: boolean;
    onClose: () => void;
    categories: ExpenseCategory[];
    onAddCategory: (category: { name: string }) => void;
    onUpdateCategory: (category: ExpenseCategory) => void;
    onDeleteCategory: (id: string) => void;
    isEditMode: boolean;
}

const CategoryFormModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: any) => void;
    initialData: ExpenseCategory | null;
}> = ({ isOpen, onClose, onSubmit, initialData }) => {
    const [name, setName] = useState('');
    const isEditing = !!initialData;

    useEffect(() => {
        if (isOpen) {
            setName(initialData?.name || '');
        }
    }, [initialData, isOpen]);
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isEditing && initialData) {
            onSubmit({ ...initialData, name });
        } else {
            onSubmit({ name });
        }
    };

    if (!isOpen) return null;
    
    const formInputClasses = "mt-1 block w-full px-3 py-2 bg-slate-800 text-slate-100 border border-slate-600 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500";

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-[60] flex justify-center items-center p-4">
            <div className="bg-slate-800 rounded-lg shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center p-4 border-b border-slate-700">
                    <h2 className="text-xl font-bold text-slate-100">{isEditing ? 'Edit Category' : 'New Category'}</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-200"><CloseIcon /></button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label htmlFor="categoryName" className="block text-sm font-medium text-slate-300">Category Name</label>
                        <input type="text" id="categoryName" value={name} onChange={e => setName(e.target.value)} required className={formInputClasses} autoFocus />
                    </div>
                    <div className="flex justify-end pt-4">
                        <button type="submit" className="px-6 py-2 bg-primary-500 text-white font-semibold rounded-lg shadow-md hover:bg-primary-600">{isEditing ? 'Update' : 'Save'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const ExpenseCategoryManagement: React.FC<ManagementProps> = ({ isOpen, onClose, categories, onAddCategory, onUpdateCategory, onDeleteCategory, isEditMode }) => {
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<ExpenseCategory | null>(null);
    const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);

    const openFormModal = (category: ExpenseCategory | null = null) => {
        setEditingCategory(category);
        setIsFormModalOpen(true);
    };

    const closeFormModal = () => {
        setIsFormModalOpen(false);
        setEditingCategory(null);
    };

    const handleSubmit = (categoryData: any) => {
        if (editingCategory) {
            onUpdateCategory(categoryData);
        } else {
            onAddCategory(categoryData);
        }
        closeFormModal();
    };
    
    if (!isOpen) return null;

    return (
        <>
            <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4" onClick={onClose}>
                <div 
                    className="bg-slate-800 rounded-lg shadow-xl w-full max-w-2xl flex flex-col transform transition-all" 
                    onClick={e => e.stopPropagation()}
                >
                    <div className="flex justify-between items-center p-4 border-b border-slate-700">
                        <h2 className="text-xl font-bold text-slate-100">Manage Expense Categories</h2>
                        <button onClick={onClose} className="text-slate-400 hover:text-slate-200"><CloseIcon /></button>
                    </div>

                    <div className="p-4 sm:p-6 overflow-y-auto max-h-[70vh] no-scrollbar">
                        <div className="flex justify-end mb-4">
                            <button 
                                onClick={() => openFormModal()}
                                disabled={!isEditMode}
                                className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white font-semibold rounded-lg shadow-md hover:bg-primary-600 disabled:bg-slate-500/50 disabled:cursor-not-allowed transition-colors"
                            >
                                <PlusIcon />
                                Add New Category
                            </button>
                        </div>

                        <div className="bg-slate-900/50 p-2 sm:p-4 rounded-xl shadow-inner border border-slate-700/50">
                            <div className="space-y-3">
                                {categories.map(category => (
                                    <div key={category.id} className="bg-slate-800/50 hover:bg-slate-700/50 p-4 rounded-lg flex justify-between items-center">
                                        <span className="font-semibold text-slate-100">{category.name}</span>
                                        <div className="flex items-center gap-2">
                                            <button disabled={!isEditMode} onClick={() => openFormModal(category)} className="p-2 text-blue-400 rounded-full hover:bg-blue-500/10 disabled:text-slate-500 disabled:cursor-not-allowed"><EditIcon /></button>
                                            <button disabled={!isEditMode} onClick={() => setCategoryToDelete(category.id)} className="p-2 text-red-400 rounded-full hover:bg-red-500/10 disabled:text-slate-500 disabled:cursor-not-allowed"><DeleteIcon /></button>
                                        </div>
                                    </div>
                                ))}
                                {categories.length === 0 && <p className="text-center text-slate-400 py-4">No categories found. Add one to get started.</p>}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <CategoryFormModal 
                isOpen={isFormModalOpen}
                onClose={closeFormModal}
                onSubmit={handleSubmit}
                initialData={editingCategory}
            />
            
            <ConfirmationModal 
                isOpen={!!categoryToDelete}
                onClose={() => setCategoryToDelete(null)}
                onConfirm={() => { if (categoryToDelete) onDeleteCategory(categoryToDelete); }}
                title="Delete Category"
                message="Are you sure you want to delete this category? This may affect past expenses that used it."
            />
        </>
    );
};

export default ExpenseCategoryManagement;
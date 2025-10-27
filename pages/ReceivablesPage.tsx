import React, { useState } from 'react';
import type { Receivable } from '../types';
import { PlusIcon } from '../components/icons/PlusIcon';
import ConfirmationModal from '../components/ConfirmationModal';
import ReceivableForm from '../components/ReceivableForm';
import ReceivableList from '../components/ReceivableList';

interface ReceivablesPageProps {
    receivables: Receivable[];
    onAddReceivable: (receivable: Omit<Receivable, 'id' | 'created_at' | 'updated_at' | 'user_id'>) => void;
    onUpdateReceivable: (receivable: Receivable) => void;
    onDeleteReceivable: (id: string) => void;
    isEditMode: boolean;
}

const ReceivablesPage: React.FC<ReceivablesPageProps> = ({ receivables, onAddReceivable, onUpdateReceivable, onDeleteReceivable, isEditMode }) => {
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingReceivable, setEditingReceivable] = useState<Receivable | null>(null);
    const [receivableToDelete, setReceivableToDelete] = useState<string | null>(null);

    const openForm = (receivableToEdit: Receivable | null = null) => {
        setEditingReceivable(receivableToEdit);
        setIsFormOpen(true);
    };

    const closeForm = () => {
        setIsFormOpen(false);
        setEditingReceivable(null);
    };

    const handleSubmit = (data: any) => {
        if (editingReceivable) {
            onUpdateReceivable({ ...editingReceivable, ...data });
        } else {
            onAddReceivable(data);
        }
        closeForm();
    };

    const handleDelete = (id: string) => {
        onDeleteReceivable(id);
        setReceivableToDelete(null);
    };

    return (
        <div className="mt-4 space-y-6 pb-16">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <h2 className="text-2xl font-bold text-slate-200 self-start">Payment Collections</h2>
                {isEditMode && (
                    <button
                        onClick={() => openForm()}
                        className="w-full md:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg shadow-md hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-slate-900 transition-transform transform hover:scale-105"
                    >
                        <PlusIcon />
                        <span className="font-semibold">Add Collection</span>
                    </button>
                )}
            </div>

            <ReceivableList
                receivables={receivables}
                onEdit={openForm}
                onDelete={(id) => setReceivableToDelete(id)}
                onUpdate={onUpdateReceivable}
                isEditMode={isEditMode}
            />

            {isFormOpen && (
                <ReceivableForm
                    isOpen={isFormOpen}
                    onClose={closeForm}
                    onSubmit={handleSubmit}
                    initialData={editingReceivable}
                />
            )}

            {receivableToDelete && (
                <ConfirmationModal
                    isOpen={!!receivableToDelete}
                    onClose={() => setReceivableToDelete(null)}
                    onConfirm={() => handleDelete(receivableToDelete)}
                    title="Delete Collection Record"
                    message="Are you sure you want to delete this record? This action cannot be undone."
                />
            )}
        </div>
    );
};

export default ReceivablesPage;
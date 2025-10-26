import React, { useState, useEffect } from 'react';
import type { Service } from '../types';
import { useNotifier } from '../context/NotificationContext';
import { CloseIcon } from '../components/icons/CloseIcon';
import { EditIcon } from '../components/icons/EditIcon';
import { DeleteIcon } from '../components/icons/DeleteIcon';
import { PlusIcon } from '../components/icons/PlusIcon';
import ConfirmationModal from '../components/ConfirmationModal';

interface ManagementPageProps {
    isOpen: boolean;
    onClose: () => void;
    services: Service[];
    onAddService: (service: Omit<Service, 'id' | 'created_at' | 'user_id'>) => void;
    onUpdateService: (service: Service) => void;
    onDeleteService: (id: string) => void;
    isEditMode: boolean;
}

const ServiceFormModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (service: any) => void;
    initialData: Service | null;
}> = ({ isOpen, onClose, onSubmit, initialData }) => {
    const [name, setName] = useState('');
    const [category, setCategory] = useState('grinding');
    const [defaultRate, setDefaultRate] = useState('');

    const isEditing = !!initialData;

    useEffect(() => {
        if (isOpen) {
            setName(initialData?.name || '');
            setCategory(initialData?.category || 'grinding');
            setDefaultRate(initialData?.default_rate?.toString() || '');
        }
    }, [initialData, isOpen]);
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const serviceData = {
            name,
            category,
            default_rate: parseFloat(defaultRate) || 0,
        };
        if (isEditing && initialData) {
            onSubmit({ ...initialData, ...serviceData });
        } else {
            onSubmit(serviceData);
        }
    };

    if (!isOpen) return null;
    
    const formInputClasses = "mt-1 block w-full px-3 py-2 bg-slate-800 text-slate-100 border border-slate-600 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500";

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-[60] flex justify-center items-center p-4">
            <div className="bg-slate-800 rounded-lg shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center p-4 border-b border-slate-700">
                    <h2 className="text-xl font-bold text-slate-100">{isEditing ? 'Edit Service' : 'New Service'}</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-200"><CloseIcon /></button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label htmlFor="serviceName" className="block text-sm font-medium text-slate-300">Service Name</label>
                        <input type="text" id="serviceName" value={name} onChange={e => setName(e.target.value)} required className={formInputClasses} />
                    </div>
                    <div>
                        <label htmlFor="serviceCategory" className="block text-sm font-medium text-slate-300">Category</label>
                        <select id="serviceCategory" value={category} onChange={e => setCategory(e.target.value)} className={formInputClasses}>
                            <option value="grinding">Grinding</option>
                            <option value="sale">Sale</option>
                            <option value="other">Other</option>
                        </select>
                    </div>
                    <div>
                        <label htmlFor="defaultRate" className="block text-sm font-medium text-slate-300">Default Rate (Optional)</label>
                        <input type="number" step="0.01" id="defaultRate" value={defaultRate} onChange={e => setDefaultRate(e.target.value)} className={formInputClasses} />
                    </div>
                    <div className="flex justify-end pt-4">
                        <button type="submit" className="px-6 py-2 bg-primary-500 text-white font-semibold rounded-lg shadow-md hover:bg-primary-600">{isEditing ? 'Update' : 'Save'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const ManagementPage: React.FC<ManagementPageProps> = ({ isOpen, onClose, services, onAddService, onUpdateService, onDeleteService, isEditMode }) => {
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [editingService, setEditingService] = useState<Service | null>(null);
    const [serviceToDelete, setServiceToDelete] = useState<string | null>(null);

    const openFormModal = (service: Service | null = null) => {
        setEditingService(service);
        setIsFormModalOpen(true);
    };

    const closeFormModal = () => {
        setIsFormModalOpen(false);
        setEditingService(null);
    };

    const handleSubmit = (serviceData: any) => {
        if (editingService) {
            onUpdateService(serviceData);
        } else {
            onAddService(serviceData);
        }
        closeFormModal();
    };
    
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4" onClick={onClose}>
            <div 
                className="bg-slate-800 rounded-lg shadow-xl w-full max-w-2xl flex flex-col transform transition-all" 
                onClick={e => e.stopPropagation()}
            >
                <div className="flex justify-between items-center p-4 border-b border-slate-700">
                    <h2 className="text-xl font-bold text-slate-100">Manage Services</h2>
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
                            Add New Service
                        </button>
                    </div>

                    <div className="bg-slate-900/50 p-2 sm:p-4 rounded-xl shadow-inner border border-slate-700/50">
                        <div className="space-y-3">
                            <div className="hidden lg:grid grid-cols-4 gap-4 px-4 py-2 text-xs text-slate-400 font-bold uppercase">
                                <span>Name</span>
                                <span>Category</span>
                                <span className="text-right">Default Rate</span>
                                <span className="text-right">Actions</span>
                            </div>
                            {services.map(service => (
                                <div key={service.id} className="bg-slate-800/50 hover:bg-slate-700/50 p-4 rounded-lg grid grid-cols-2 lg:grid-cols-4 gap-4 items-center">
                                    <div className="font-semibold text-slate-100">{service.name}</div>
                                    <div className="capitalize text-slate-300">{service.category}</div>
                                    <div className="text-left lg:text-right text-slate-300">{service.default_rate ? `Rs ${service.default_rate}` : 'N/A'}</div>
                                    <div className="col-span-2 lg:col-span-1 flex justify-start lg:justify-end gap-2">
                                        <button disabled={!isEditMode} onClick={() => openFormModal(service)} className="p-2 text-blue-400 rounded-full hover:bg-blue-500/10 disabled:text-slate-500 disabled:cursor-not-allowed"><EditIcon /></button>
                                        <button disabled={!isEditMode} onClick={() => setServiceToDelete(service.id)} className="p-2 text-red-400 rounded-full hover:bg-red-500/10 disabled:text-slate-500 disabled:cursor-not-allowed"><DeleteIcon /></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <ServiceFormModal 
                isOpen={isFormModalOpen}
                onClose={closeFormModal}
                onSubmit={handleSubmit}
                initialData={editingService}
            />
            
            <ConfirmationModal 
                isOpen={!!serviceToDelete}
                onClose={() => setServiceToDelete(null)}
                onConfirm={() => { if (serviceToDelete) onDeleteService(serviceToDelete); }}
                title="Delete Service"
                message="Are you sure you want to delete this service? This may affect past transactions that used it."
            />
        </div>
    );
};

export default ManagementPage;
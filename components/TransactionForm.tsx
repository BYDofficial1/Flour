import React, { useState, useEffect, useCallback } from 'react';
import type { Transaction } from '../types';
import { CloseIcon } from './icons/CloseIcon';
import { formatCurrency } from '../utils/currency';

interface TransactionFormProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: any) => void;
    initialData: Transaction | null;
    prefilledData?: Partial<Transaction> | null;
}

const TransactionForm: React.FC<TransactionFormProps> = ({ isOpen, onClose, onSubmit, initialData, prefilledData }) => {
    const [customerName, setCustomerName] = useState('');
    const [customerMobile, setCustomerMobile] = useState('');
    const [item, setItem] = useState('Wheat Grinding');
    const [quantity, setQuantity] = useState('');
    const [rate, setRate] = useState('');
    const [grindingCost, setGrindingCost] = useState('');
    const [notes, setNotes] = useState('');
    const [errors, setErrors] = useState<{ quantity?: string; rate?: string; grindingCost?: string }>({});

    const isEditing = !!initialData;
    const total = (parseFloat(quantity) || 0) * (parseFloat(rate) || 0) + (parseFloat(grindingCost) || 0);
    const hasErrors = Object.values(errors).some(Boolean);
    const showGrindingCost = ['Wheat Grinding', 'Flour Sale', 'Daliya Grinding'].includes(item);
    
    const resetForm = useCallback(() => {
        setCustomerName(initialData?.customerName || prefilledData?.customerName || '');
        setCustomerMobile(initialData?.customerMobile || '');
        setItem(initialData?.item || prefilledData?.item || 'Wheat Grinding');
        setQuantity(initialData?.quantity?.toString() || prefilledData?.quantity?.toString() || '');
        setRate(initialData?.rate?.toString() || prefilledData?.rate?.toString() || '');
        setGrindingCost(initialData?.grindingCost?.toString() || '');
        setNotes(initialData?.notes || '');
        setErrors({});
    }, [initialData, prefilledData]);

    useEffect(() => {
        if (isOpen) {
            resetForm();
        }
    }, [initialData, prefilledData, isOpen, resetForm]);
    
    const handleNumberChange = (value: string, field: 'quantity' | 'rate' | 'grindingCost') => {
        if (field === 'quantity') setQuantity(value);
        if (field === 'rate') setRate(value);
        if (field === 'grindingCost') setGrindingCost(value);

        if (parseFloat(value) < 0) {
            setErrors(prev => ({ ...prev, [field]: 'Value must not be negative.' }));
        } else {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[field];
                return newErrors;
            });
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (hasErrors) return;

        const transactionData = {
            customerName,
            item,
            quantity: parseFloat(quantity) || 0,
            rate: parseFloat(rate) || 0,
            total,
            customerMobile,
            grindingCost: parseFloat(grindingCost) || 0,
            notes,
        };
        
        if(isEditing && initialData) {
            onSubmit({ ...initialData, ...transactionData });
        } else {
            onSubmit(transactionData);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4 transition-opacity duration-300 animate-[fadeIn_0.2s_ease-out_forwards]">
            <div className="bg-amber-50 text-slate-800 rounded-lg shadow-xl w-full max-w-md transform transition-all duration-300 animate-[fadeIn_0.3s_ease-out_forwards] scale-95" 
                 style={{ animation: 'fadeIn 0.2s ease-out forwards, scaleUp 0.2s ease-out forwards' }} 
                 onClick={e => e.stopPropagation()}>
                <style>{`
                    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                    @keyframes scaleUp { from { transform: scale(0.95); } to { transform: scale(1); } }
                `}</style>
                <div className="flex justify-between items-center p-4 border-b border-amber-200/80">
                    <h2 className="text-xl font-bold text-slate-800">{isEditing ? 'Edit Transaction' : 'Add New Transaction'}</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <CloseIcon />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[85vh] overflow-y-auto">
                    <div>
                        <label htmlFor="customerName" className="block text-sm font-medium text-slate-700">Customer Name</label>
                        <input type="text" id="customerName" value={customerName} onChange={e => setCustomerName(e.target.value)} required className="mt-1 block w-full px-3 py-2 bg-white text-slate-800 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm placeholder-slate-400" />
                    </div>
                     <div>
                        <label htmlFor="customerMobile" className="block text-sm font-medium text-slate-700">Customer Mobile (Optional)</label>
                        <input type="tel" id="customerMobile" value={customerMobile} onChange={e => setCustomerMobile(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white text-slate-800 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm placeholder-slate-400" />
                    </div>
                    <div>
                        <label htmlFor="item" className="block text-sm font-medium text-slate-700">Item / Service</label>
                        <select id="item" value={item} onChange={e => setItem(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white text-slate-800 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm">
                            <option>Wheat Grinding</option>
                            <option>Flour Sale</option>
                            <option>Daliya Grinding</option>
                            <option>Other</option>
                        </select>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="quantity" className="block text-sm font-medium text-slate-700">Quantity (kg)</label>
                            <input type="number" id="quantity" step="0.01" value={quantity} onChange={e => handleNumberChange(e.target.value, 'quantity')} required className="mt-1 block w-full px-3 py-2 bg-white text-slate-800 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm" />
                            {errors.quantity && <p className="text-red-500 text-xs mt-1">{errors.quantity}</p>}
                        </div>
                        <div>
                            <label htmlFor="rate" className="block text-sm font-medium text-slate-700">Rate (Rs / kg)</label>
                            <input type="number" id="rate" step="0.01" value={rate} onChange={e => handleNumberChange(e.target.value, 'rate')} required className="mt-1 block w-full px-3 py-2 bg-white text-slate-800 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm" />
                            {errors.rate && <p className="text-red-500 text-xs mt-1">{errors.rate}</p>}
                        </div>
                    </div>
                    {showGrindingCost && (
                         <div>
                            <label htmlFor="grindingCost" className="block text-sm font-medium text-slate-700">Grinding/Cleaning Cost (Optional)</label>
                            <input type="number" id="grindingCost" step="0.01" value={grindingCost} onChange={e => handleNumberChange(e.target.value, 'grindingCost')} className="mt-1 block w-full px-3 py-2 bg-white text-slate-800 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm" />
                            {errors.grindingCost && <p className="text-red-500 text-xs mt-1">{errors.grindingCost}</p>}
                        </div>
                    )}
                    <div>
                        <label htmlFor="notes" className="block text-sm font-medium text-slate-700">Notes (Optional)</label>
                        <textarea id="notes" value={notes} onChange={e => setNotes(e.target.value)} rows={3} className="mt-1 block w-full px-3 py-2 bg-white text-slate-800 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm placeholder-slate-400" placeholder="Any extra details..."></textarea>
                    </div>

                     <div className="bg-white p-4 rounded-lg text-center border border-amber-200 shadow-inner">
                        <p className="text-sm font-medium text-slate-600">Total Amount</p>
                        <p className="text-3xl font-bold text-amber-600">{formatCurrency(total)}</p>
                    </div>
                    <div className="flex justify-end pt-2">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-slate-200 text-slate-800 rounded-md mr-2 hover:bg-slate-300">Cancel</button>
                        <button 
                            type="submit" 
                            className="px-4 py-2 bg-amber-500 text-white rounded-md hover:bg-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 disabled:bg-amber-300 disabled:cursor-not-allowed"
                            disabled={hasErrors}
                        >
                            {isEditing ? 'Save Changes' : 'Add Transaction'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default TransactionForm;

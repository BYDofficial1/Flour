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
    const [cleaningCost, setCleaningCost] = useState('');
    const [notes, setNotes] = useState('');
    const [errors, setErrors] = useState<{ quantity?: string; rate?: string; grindingCost?: string, cleaningCost?: string, paidAmount?: string }>({});
    const [date, setDate] = useState('');
    const [time, setTime] = useState('');
    const [paymentStatus, setPaymentStatus] = useState<'paid' | 'unpaid' | 'partial'>('paid');
    const [paidAmount, setPaidAmount] = useState('');

    const isEditing = !!initialData;
    const totalRaw = (parseFloat(quantity) || 0) * (parseFloat(rate) || 0) + (parseFloat(grindingCost) || 0) + (parseFloat(cleaningCost) || 0);
    const total = Math.round((totalRaw + Number.EPSILON) * 100) / 100;
    const hasErrors = Object.values(errors).some(Boolean);
    
    const resetForm = useCallback(() => {
        const initialDate = initialData ? new Date(initialData.date) : new Date();
        
        setDate(initialDate.toISOString().split('T')[0]);
        setTime(initialDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false }));

        setCustomerName(initialData?.customerName || prefilledData?.customerName || '');
        setCustomerMobile(initialData?.customerMobile || '');
        setItem(initialData?.item || prefilledData?.item || 'Wheat Grinding');
        setQuantity(initialData?.quantity?.toString() || prefilledData?.quantity?.toString() || '');
        setRate(initialData?.rate?.toString() || prefilledData?.rate?.toString() || '');
        setGrindingCost(initialData?.grindingCost?.toString() || '');
        setCleaningCost(initialData?.cleaningCost?.toString() || '');
        setNotes(initialData?.notes || '');
        
        setPaymentStatus(initialData?.paymentStatus || 'paid');
        setPaidAmount(initialData?.paidAmount?.toString() || '');

        setErrors({});
    }, [initialData, prefilledData]);

    useEffect(() => {
        if (isOpen) {
            resetForm();
        }
    }, [initialData, prefilledData, isOpen, resetForm]);

    useEffect(() => {
        if (paymentStatus === 'paid') {
            setPaidAmount(total.toString());
        } else if (paymentStatus === 'unpaid') {
            setPaidAmount('0');
        }
    }, [total, paymentStatus]);
    
    const handleNumberChange = (value: string, field: 'quantity' | 'rate' | 'grindingCost' | 'cleaningCost' | 'paidAmount') => {
        // Prevent negative signs from being part of the value.
        if (value.startsWith('-')) {
            return; // Simply don't update the state if a negative is typed.
        }
        
        if (field === 'quantity') setQuantity(value);
        if (field === 'rate') setRate(value);
        if (field === 'grindingCost') setGrindingCost(value);
        if (field === 'cleaningCost') setCleaningCost(value);
        if (field === 'paidAmount') setPaidAmount(value);

        // Clear any potential error for this field as we've blocked negative values.
        setErrors(prev => {
            const newErrors = { ...prev };
            delete newErrors[field];
            return newErrors;
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (hasErrors) return;

        const combinedDateTime = new Date(`${date}T${time || '00:00'}`).toISOString();
        
        const transactionData = {
            customerName,
            item,
            quantity: parseFloat(quantity) || 0,
            rate: parseFloat(rate) || 0,
            total,
            date: combinedDateTime,
            customerMobile,
            grindingCost: parseFloat(grindingCost) || 0,
            cleaningCost: parseFloat(cleaningCost) || 0,
            notes,
            paymentStatus,
            paidAmount: paymentStatus === 'partial' ? parseFloat(paidAmount) || 0 : (paymentStatus === 'paid' ? total : 0),
        };
        
        if(isEditing && initialData) {
            onSubmit({ ...initialData, ...transactionData });
        } else {
            onSubmit(transactionData);
        }
    };

    if (!isOpen) return null;

    const StatusButton: React.FC<{ value: 'paid' | 'unpaid' | 'partial'; label: string }> = ({ value, label }) => (
        <button
            type="button"
            onClick={() => setPaymentStatus(value)}
            className={`w-full py-2 text-sm font-semibold rounded-md transition-all ${paymentStatus === value ? 'bg-primary-500 text-white shadow' : 'bg-white hover:bg-slate-100 text-slate-600'}`}
        >
            {label}
        </button>
    );
    
    const formInputClasses = "mt-1 block w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-md shadow-sm placeholder-slate-600 transition-colors duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 focus:border-primary-500";


    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4 transition-opacity duration-300 animate-[fadeIn_0.2s_ease-out_forwards]">
            <div className="bg-amber-50 text-slate-800 rounded-lg shadow-xl w-full max-w-md transform transition-all duration-300 animate-[fadeIn_0.3s_ease-out_forwards] scale-95" 
                 style={{ animation: 'fadeIn 0.2s ease-out forwards, scaleUp 0.2s ease-out forwards' }} 
                 onClick={e => e.stopPropagation()}>
                <style>{`
                    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                    @keyframes scaleUp { from { transform: scale(0.95); } to { transform: scale(1); } }
                `}</style>
                <div className="flex justify-between items-center p-4 border-b border-primary-200/80">
                    <h2 className="text-xl font-bold text-slate-800">{isEditing ? 'Edit Transaction' : 'Add New Transaction'}</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <CloseIcon />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[85vh] overflow-y-auto">
                    <div>
                        <label htmlFor="customerName" className="block text-sm font-medium text-slate-700">Customer Name</label>
                        <input type="text" id="customerName" value={customerName} onChange={e => setCustomerName(e.target.value)} required className={formInputClasses} />
                    </div>
                     <div>
                        <label htmlFor="customerMobile" className="block text-sm font-medium text-slate-700">Customer Mobile (Optional)</label>
                        <input type="tel" id="customerMobile" value={customerMobile} onChange={e => setCustomerMobile(e.target.value)} className={formInputClasses} />
                    </div>
                    <div>
                        <label htmlFor="item" className="block text-sm font-medium text-slate-700">Item / Service</label>
                        <select id="item" value={item} onChange={e => setItem(e.target.value)} className={formInputClasses}>
                            <option>Wheat Grinding</option>
                            <option>Flour Sale</option>
                            <option>Daliya Grinding</option>
                            <option>Daliya Sale</option>
                            <option>Other</option>
                        </select>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="quantity" className="block text-sm font-medium text-slate-700">Quantity (kg)</label>
                            <input type="number" id="quantity" step="0.01" value={quantity} onChange={e => handleNumberChange(e.target.value, 'quantity')} required className={formInputClasses} />
                            {errors.quantity && <p className="text-red-500 text-xs mt-1">{errors.quantity}</p>}
                        </div>
                        <div>
                            <label htmlFor="rate" className="block text-sm font-medium text-slate-700">Rate (Rs / kg)</label>
                            <input type="number" id="rate" step="0.01" value={rate} onChange={e => handleNumberChange(e.target.value, 'rate')} required className={formInputClasses} />
                            {errors.rate && <p className="text-red-500 text-xs mt-1">{errors.rate}</p>}
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="grindingCost" className="block text-sm font-medium text-slate-700">Grinding Cost (Optional)</label>
                            <input type="number" id="grindingCost" step="0.01" value={grindingCost} onChange={e => handleNumberChange(e.target.value, 'grindingCost')} className={formInputClasses} />
                            {errors.grindingCost && <p className="text-red-500 text-xs mt-1">{errors.grindingCost}</p>}
                        </div>
                         <div>
                            <label htmlFor="cleaningCost" className="block text-sm font-medium text-slate-700">Cleaning Cost (Optional)</label>
                            <input type="number" id="cleaningCost" step="0.01" value={cleaningCost} onChange={e => handleNumberChange(e.target.value, 'cleaningCost')} className={formInputClasses} />
                            {errors.cleaningCost && <p className="text-red-500 text-xs mt-1">{errors.cleaningCost}</p>}
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="date" className="block text-sm font-medium text-slate-700">Date</label>
                            <input type="date" id="date" value={date} onChange={e => setDate(e.target.value)} required className={formInputClasses} />
                        </div>
                        <div>
                            <label htmlFor="time" className="block text-sm font-medium text-slate-700">Time</label>
                            <input type="time" id="time" value={time} onChange={e => setTime(e.target.value)} required className={formInputClasses} />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Payment Status</label>
                        <div className="flex items-center space-x-1 p-1 bg-slate-200/80 rounded-lg">
                           <StatusButton value="paid" label="Paid" />
                           <StatusButton value="unpaid" label="Unpaid" />
                           <StatusButton value="partial" label="Partial" />
                        </div>
                    </div>
                    {paymentStatus === 'partial' && (
                        <div>
                            <label htmlFor="paidAmount" className="block text-sm font-medium text-slate-700">Amount Paid</label>
                            <input type="number" id="paidAmount" step="0.01" value={paidAmount} onChange={e => handleNumberChange(e.target.value, 'paidAmount')} required className={formInputClasses} />
                            {errors.paidAmount && <p className="text-red-500 text-xs mt-1">{errors.paidAmount}</p>}
                        </div>
                    )}
                    <div>
                        <label htmlFor="notes" className="block text-sm font-medium text-slate-700">Notes (Optional)</label>
                        <textarea id="notes" value={notes} onChange={e => setNotes(e.target.value)} rows={3} className={formInputClasses} placeholder="Any extra details..."></textarea>
                    </div>

                     <div className="bg-primary-100 p-4 rounded-lg text-center border border-primary-200 shadow-inner">
                        <p className="text-sm font-medium text-slate-600">Total Amount</p>
                        <p className="text-4xl font-bold text-primary-600">{formatCurrency(total)}</p>
                    </div>
                    <div className="flex justify-end pt-2">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-slate-200 text-slate-800 rounded-md mr-2 hover:bg-slate-300">Cancel</button>
                        <button 
                            type="submit" 
                            className="px-4 py-2 bg-primary-500 text-white rounded-md hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:bg-primary-400/50 disabled:cursor-not-allowed transition-transform transform hover:scale-105"
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
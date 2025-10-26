import React, { useState, useEffect } from 'react';
import type { Transaction, Service } from '../types';
import { CloseIcon } from './icons/CloseIcon';
import { formatCurrency } from '../utils/currency';

interface TransactionFormProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: any) => void;
    initialData: Transaction | null;
    services: Service[];
    prefilledData?: Partial<Transaction> | null;
}

const FormSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <fieldset>
        <legend className="text-sm font-semibold text-primary-400 mb-2">{title}</legend>
        <div className="space-y-4 bg-slate-700/50 p-4 rounded-lg border border-slate-600/80">
            {children}
        </div>
    </fieldset>
);

const CheckboxInput: React.FC<{ id: string, label: string, checked: boolean, onChange: (checked: boolean) => void }> = ({ id, label, checked, onChange }) => (
     <div className="flex items-center">
        <input
            type="checkbox"
            id={id}
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
            className="h-4 w-4 rounded bg-slate-800 border-slate-500 text-primary-500 focus:ring-primary-500"
        />
        <label htmlFor={id} className="ml-2 text-sm font-medium text-slate-300">{label}</label>
    </div>
);

const TransactionForm: React.FC<TransactionFormProps> = ({ isOpen, onClose, onSubmit, initialData, services, prefilledData }) => {
    const [customerName, setCustomerName] = useState('');
    const [customerMobile, setCustomerMobile] = useState('');
    const [item, setItem] = useState('');
    const [quantity, setQuantity] = useState('');
    const [rate, setRate] = useState('');
    const [grindingCost, setGrindingCost] = useState('');
    const [cleaningCost, setCleaningCost] = useState('');
    const [notes, setNotes] = useState('');
    const [errors, setErrors] = useState<{ [key: string]: string }>({});
    const [date, setDate] = useState('');
    const [time, setTime] = useState('');
    const [paymentStatus, setPaymentStatus] = useState<'paid' | 'unpaid' | 'partial'>('paid');
    const [paidAmount, setPaidAmount] = useState('');
    
    // New state for advanced features
    const [flourTakenKg, setFlourTakenKg] = useState('');
    const [isSettled, setIsSettled] = useState(false);
    const [paidCleaningWithFlour, setPaidCleaningWithFlour] = useState(false);
    const [paidGrindingWithFlour, setPaidGrindingWithFlour] = useState(false);
    const [grindingCostFlourKg, setGrindingCostFlourKg] = useState('');
    const [cleaningCostFlourKg, setCleaningCostFlourKg] = useState('');


    const isEditing = !!initialData;
    const selectedService = services.find(s => s.name === item);
    const isGrindingService = selectedService?.category === 'grinding';

    // Recalculate total based on new logic
    const total = React.useMemo(() => {
        const saleAmount = isGrindingService ? 0 : (parseFloat(quantity) || 0) * (parseFloat(rate) || 0);
        const grindingAmount = parseFloat(grindingCost) || 0;
        const cleaningAmount = parseFloat(cleaningCost) || 0;

        const totalRaw = saleAmount + grindingAmount + cleaningAmount;
        return Math.round((totalRaw + Number.EPSILON) * 100) / 100;
    }, [quantity, rate, grindingCost, cleaningCost, isGrindingService]);
    
    const flourRemaining = React.useMemo(() => {
        const totalQuantity = parseFloat(quantity) || 0;
        const takenByCustomer = parseFloat(flourTakenKg) || 0;
        const usedForGrinding = paidGrindingWithFlour ? (parseFloat(grindingCostFlourKg) || 0) : 0;
        const usedForCleaning = paidCleaningWithFlour ? (parseFloat(cleaningCostFlourKg) || 0) : 0;
        return totalQuantity - takenByCustomer - usedForGrinding - usedForCleaning;
    }, [quantity, flourTakenKg, paidGrindingWithFlour, grindingCostFlourKg, paidCleaningWithFlour, cleaningCostFlourKg]);

    const hasErrors = Object.values(errors).some(Boolean);
    
    useEffect(() => {
        if (isOpen) {
            const initialDate = initialData ? new Date(initialData.date) : new Date();
            const year = initialDate.getFullYear();
            const month = String(initialDate.getMonth() + 1).padStart(2, '0');
            const day = String(initialDate.getDate()).padStart(2, '0');
            setDate(`${year}-${month}-${day}`);
            const hours = String(initialDate.getHours()).padStart(2, '0');
            const minutes = String(initialDate.getMinutes()).padStart(2, '0');
            setTime(`${hours}:${minutes}`);

            setCustomerName(initialData?.customer_name || prefilledData?.customer_name || '');
            setCustomerMobile(initialData?.customer_mobile || '');
            setItem(initialData?.item || prefilledData?.item || (services.length > 0 ? services[0].name : ''));
            setQuantity(initialData?.quantity?.toString() || prefilledData?.quantity?.toString() || '');
            setRate(initialData?.rate?.toString() || prefilledData?.rate?.toString() || '');
            setGrindingCost(initialData?.grinding_cost?.toString() || '');
            setCleaningCost(initialData?.cleaning_cost?.toString() || '');
            setNotes(initialData?.notes || '');
            setPaymentStatus(initialData?.payment_status || 'paid');
            setPaidAmount(initialData?.paid_amount?.toString() || '');
            
            setFlourTakenKg(initialData?.flour_taken_kg?.toString() || '0');
            setIsSettled(initialData?.is_settled || false);
            setPaidCleaningWithFlour(initialData?.paid_cleaning_with_flour || false);
            setPaidGrindingWithFlour(initialData?.paid_grinding_with_flour || false);
            setGrindingCostFlourKg(initialData?.grinding_cost_flour_kg?.toString() || '');
            setCleaningCostFlourKg(initialData?.cleaning_cost_flour_kg?.toString() || '');

            setErrors({});
        }
    }, [initialData, prefilledData, isOpen, services]);

    useEffect(() => {
        if (paymentStatus === 'paid') {
            setPaidAmount(total.toString());
        } else if (paymentStatus === 'unpaid') {
            setPaidAmount('0');
        }
    }, [total, paymentStatus]);
    
    // Fix: Moved setters object outside of handleNumberChange so it is in scope for the function signature.
    const setters = {
        quantity: setQuantity,
        rate: setRate,
        grindingCost: setGrindingCost,
        cleaningCost: setCleaningCost,
        paidAmount: setPaidAmount,
        flourTakenKg: setFlourTakenKg,
        grindingCostFlourKg: setGrindingCostFlourKg,
        cleaningCostFlourKg: setCleaningCostFlourKg,
    };
    
    const handleNumberChange = (value: string, field: keyof typeof setters) => {
        if (value.startsWith('-')) return;
        
        setters[field](value);

        setErrors(prev => {
            const newErrors = { ...prev };
            delete newErrors[field];
            return newErrors;
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (hasErrors) return;

        const [year, month, day] = date.split('-').map(Number);
        const [hours, minutes] = (time || '00:00').split(':').map(Number);
        const localDate = new Date(year, month - 1, day, hours, minutes);
        
        const transactionData = {
            customer_name: customerName,
            item,
            quantity: parseFloat(quantity) || 0,
            rate: isGrindingService ? 0 : (parseFloat(rate) || 0),
            total,
            date: localDate.toISOString(),
            customer_mobile: customerMobile,
            grinding_cost: parseFloat(grindingCost) || 0,
            cleaning_cost: parseFloat(cleaningCost) || 0,
            notes,
            payment_status: paymentStatus,
            paid_amount: paymentStatus === 'partial' ? parseFloat(paidAmount) || 0 : (paymentStatus === 'paid' ? total : 0),
            
            flour_taken_kg: parseFloat(flourTakenKg) || 0,
            is_settled: isSettled,
            paid_cleaning_with_flour: paidCleaningWithFlour,
            paid_grinding_with_flour: paidGrindingWithFlour,
            grinding_cost_flour_kg: parseFloat(grindingCostFlourKg) || 0,
            cleaning_cost_flour_kg: parseFloat(cleaningCostFlourKg) || 0,
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
            className={`w-full py-2 text-sm font-semibold rounded-md transition-all ${paymentStatus === value ? 'bg-primary-500 text-white shadow-md' : 'bg-transparent hover:bg-slate-600/50 text-slate-300'}`}
        >
            {label}
        </button>
    );
    
    const formInputClasses = "mt-1 block w-full px-3 py-2 bg-slate-800 text-slate-100 border border-slate-600 rounded-md shadow-sm placeholder-slate-400 transition-colors duration-150 ease-in-out focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-700 focus:ring-primary-500 focus:border-primary-500";


    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4 transition-opacity duration-300 animate-[fadeIn_0.2s_ease-out_forwards]">
            <div className="bg-slate-800 text-slate-200 rounded-lg shadow-xl w-full max-w-md lg:max-w-5xl transform transition-all duration-300 animate-[fadeIn_0.3s_ease-out_forwards] scale-95" 
                 style={{ animation: 'fadeIn 0.2s ease-out forwards, scaleUp 0.2s ease-out forwards' }} 
                 onClick={e => e.stopPropagation()}>
                <style>{`
                    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                    @keyframes scaleUp { from { transform: scale(0.95); } to { transform: scale(1); } }
                `}</style>
                <div className="flex justify-between items-center p-4 border-b border-slate-700">
                    <h2 className="text-xl font-bold text-slate-100">{isEditing ? 'Edit Transaction' : 'New Transaction'}</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
                        <CloseIcon />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 max-h-[85vh] overflow-y-auto no-scrollbar">
                    <div className="grid lg:grid-cols-2 lg:gap-x-8">
                        <div className="space-y-6">
                            <FormSection title="Customer Details">
                                <div>
                                    <label htmlFor="customerName" className="block text-sm font-medium text-slate-300">Customer Name</label>
                                    <input type="text" id="customerName" value={customerName} onChange={e => setCustomerName(e.target.value)} required className={formInputClasses} />
                                </div>
                                <div>
                                    <label htmlFor="customerMobile" className="block text-sm font-medium text-slate-300">Customer Mobile (Optional)</label>
                                    <input type="tel" id="customerMobile" value={customerMobile} onChange={e => setCustomerMobile(e.target.value)} className={formInputClasses} />
                                </div>
                            </FormSection>

                            <FormSection title="Service & Costs">
                                <div>
                                    <label htmlFor="item" className="block text-sm font-medium text-slate-300">Item / Service</label>
                                    <select id="item" value={item} onChange={e => setItem(e.target.value)} className={formInputClasses}>
                                        {services.map(s => <option key={s.id}>{s.name}</option>)}
                                    </select>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className={isGrindingService ? 'sm:col-span-2' : ''}>
                                        <label htmlFor="quantity" className="block text-sm font-medium text-slate-300">Quantity (kg)</label>
                                        <input type="number" id="quantity" step="0.01" value={quantity} onChange={e => handleNumberChange(e.target.value, 'quantity')} required className={formInputClasses} />
                                        {errors.quantity && <p className="text-red-500 text-xs mt-1">{errors.quantity}</p>}
                                    </div>
                                    {!isGrindingService && (
                                        <div>
                                            <label htmlFor="rate" className="block text-sm font-medium text-slate-300">Rate (Rs / kg)</label>
                                            <input type="number" id="rate" step="0.01" value={rate} onChange={e => handleNumberChange(e.target.value, 'rate')} required className={formInputClasses} />
                                            {errors.rate && <p className="text-red-500 text-xs mt-1">{errors.rate}</p>}
                                        </div>
                                    )}
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label htmlFor="grindingCost" className="block text-sm font-medium text-slate-300">{isGrindingService ? 'Total Grinding Cost' : 'Grinding Cost (Optional)'}</label>
                                        <input type="number" id="grindingCost" step="0.01" value={grindingCost} onChange={e => handleNumberChange(e.target.value, 'grindingCost')} required={isGrindingService} className={formInputClasses} />
                                        {errors.grindingCost && <p className="text-red-500 text-xs mt-1">{errors.grindingCost}</p>}
                                        <CheckboxInput id="paidGrindingWithFlour" label="Paid with Flour" checked={paidGrindingWithFlour} onChange={setPaidGrindingWithFlour} />
                                        {paidGrindingWithFlour && <div className="mt-2 pl-4"><label htmlFor="grindingCostFlourKg" className="text-xs text-slate-300">Flour (kg)</label><input type="number" id="grindingCostFlourKg" step="0.01" value={grindingCostFlourKg} onChange={e => handleNumberChange(e.target.value, 'grindingCostFlourKg')} className={formInputClasses} /></div>}
                                    </div>
                                    <div>
                                        <label htmlFor="cleaningCost" className="block text-sm font-medium text-slate-300">Cleaning Cost (Optional)</label>
                                        <input type="number" id="cleaningCost" step="0.01" value={cleaningCost} onChange={e => handleNumberChange(e.target.value, 'cleaningCost')} className={formInputClasses} />
                                        {errors.cleaningCost && <p className="text-red-500 text-xs mt-1">{errors.cleaningCost}</p>}
                                        <CheckboxInput id="paidCleaningWithFlour" label="Paid with Flour" checked={paidCleaningWithFlour} onChange={setPaidCleaningWithFlour} />
                                        {paidCleaningWithFlour && <div className="mt-2 pl-4"><label htmlFor="cleaningCostFlourKg" className="text-xs text-slate-300">Flour (kg)</label><input type="number" id="cleaningCostFlourKg" step="0.01" value={cleaningCostFlourKg} onChange={e => handleNumberChange(e.target.value, 'cleaningCostFlourKg')} className={formInputClasses} /></div>}
                                    </div>
                                </div>
                                {isGrindingService && (
                                    <div>
                                        <label htmlFor="flourTakenKg" className="block text-sm font-medium text-slate-300">Flour Taken by Customer (kg)</label>
                                        <input type="number" id="flourTakenKg" step="0.01" value={flourTakenKg} onChange={e => handleNumberChange(e.target.value, 'flourTakenKg')} className={formInputClasses} />
                                        {errors.flourTakenKg && <p className="text-red-500 text-xs mt-1">{errors.flourTakenKg}</p>}
                                        <p className="text-xs text-slate-400 mt-1">
                                            Remaining Flour: <span className="font-bold text-amber-400">{flourRemaining.toFixed(2)} kg</span>
                                        </p>
                                    </div>
                                )}
                            </FormSection>
                        </div>
                        <div className="space-y-6 mt-6 lg:mt-0">
                             <FormSection title="Date & Payment">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label htmlFor="date" className="block text-sm font-medium text-slate-300">Date</label>
                                        <input type="date" id="date" value={date} onChange={e => setDate(e.target.value)} required className={formInputClasses} />
                                    </div>
                                    <div>
                                        <label htmlFor="time" className="block text-sm font-medium text-slate-300">Time</label>
                                        <input type="time" id="time" value={time} onChange={e => setTime(e.target.value)} required className={formInputClasses} />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">Payment Status</label>
                                    <div className="flex items-center space-x-1 p-1 bg-slate-800 rounded-lg">
                                    <StatusButton value="paid" label="Paid" />
                                    <StatusButton value="unpaid" label="Unpaid" />
                                    <StatusButton value="partial" label="Partial" />
                                    </div>
                                </div>
                                {paymentStatus === 'partial' && (
                                    <div>
                                        <label htmlFor="paidAmount" className="block text-sm font-medium text-slate-300">Amount Paid</label>
                                        <input type="number" id="paidAmount" step="0.01" value={paidAmount} onChange={e => handleNumberChange(e.target.value, 'paidAmount')} required className={formInputClasses} />
                                        {errors.paidAmount && <p className="text-red-500 text-xs mt-1">{errors.paidAmount}</p>}
                                    </div>
                                )}
                                <div className="!mt-6">
                                    <CheckboxInput
                                        id="isSettled"
                                        label="Settle & Close Account (No further action needed)"
                                        checked={isSettled}
                                        onChange={setIsSettled}
                                    />
                                </div>
                            </FormSection>
                            
                            <FormSection title="Additional Info">
                                <div>
                                    <label htmlFor="notes" className="block text-sm font-medium text-slate-300">Notes (Optional)</label>
                                    <textarea id="notes" value={notes} onChange={e => setNotes(e.target.value)} rows={3} className={`${formInputClasses} min-h-[50px]`}></textarea>
                                </div>
                            </FormSection>
                        </div>
                   </div>
                    <div className="bg-slate-900/50 p-4 rounded-lg my-6 border border-slate-700">
                        <div className="flex justify-between items-center">
                            <span className="font-semibold text-slate-300">Cash Total Amount:</span>
                            <span className="text-2xl font-bold text-primary-400">{formatCurrency(total)}</span>
                        </div>
                    </div>
                    <div className="flex justify-end pt-2">
                        <button 
                            type="submit" 
                            disabled={hasErrors}
                            className="w-full sm:w-auto px-6 py-3 bg-primary-500 text-white font-semibold rounded-lg shadow-md hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-slate-800 disabled:bg-slate-500/50 disabled:cursor-not-allowed transition-colors"
                        >
                            {isEditing ? 'Update Transaction' : 'Save Transaction'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default TransactionForm;


import React, { useState, useMemo, useCallback, useEffect } from 'react';
import type { Calculation } from '../types';
import { formatCurrency } from '../utils/currency';
import { supabase } from '../utils/supabase';
import { useNotifier } from '../context/NotificationContext';
import { DeleteIcon } from '../components/icons/DeleteIcon';
import { EditIcon } from '../components/icons/EditIcon';
import { CalendarIcon } from '../components/icons/CalendarIcon';
import { CloseIcon } from '../components/icons/CloseIcon';


type CalculatorType = 'maund' | 'rate';
const CALC_CACHE_KEY = 'saved_calculations';
const formInputClasses = "mt-1 block w-full px-4 py-3 bg-white border border-slate-300 rounded-md shadow-sm text-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 focus:border-primary-500 transition-colors text-slate-800 placeholder-slate-500";
const smallFormInputClasses = formInputClasses.replace('text-lg', 'text-base').replace('py-3', 'py-2');
const smallTextAreaClasses = smallFormInputClasses + " leading-relaxed";


const InputField = ({ id, label, value, onChange, placeholder, error, type = 'number' }: { id: string, label: string, value: string, onChange: (val: string) => void, placeholder: string, error?: string, type?: string }) => (
    <div>
        <label htmlFor={id} className="block text-sm font-medium text-slate-700">{label}</label>
        <input
            type={type}
            id={id}
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder={placeholder}
            className={formInputClasses}
            style={{ MozAppearance: 'textfield' }}
        />
        {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
);

const SaveCalculationForm: React.FC<{ onSave: (customerName: string, notes: string) => void, onCancel: () => void }> = ({ onSave, onCancel }) => {
    const [customerName, setCustomerName] = useState('');
    const [notes, setNotes] = useState('');

    const handleSave = () => {
        onSave(customerName.trim(), notes.trim());
    };

    return (
        <div className="mt-6 p-4 bg-primary-50 border-t-2 border-primary-200 rounded-b-xl">
            <h4 className="font-semibold text-slate-700 mb-4">Save Calculation</h4>
            <div className="space-y-4">
                 <div>
                    <label htmlFor="saveCustomerName" className="block text-sm font-medium text-slate-700">Customer Name (Optional)</label>
                    <input
                        type="text"
                        id="saveCustomerName"
                        value={customerName}
                        onChange={e => setCustomerName(e.target.value)}
                        placeholder="Enter customer name"
                        className={smallFormInputClasses}
                    />
                </div>
                 <div>
                    <label htmlFor="saveNotes" className="block text-sm font-medium text-slate-700">Notes (Optional)</label>
                    <textarea 
                        id="saveNotes" 
                        value={notes} 
                        onChange={e => setNotes(e.target.value)} 
                        rows={3} 
                        className={smallTextAreaClasses}
                        placeholder="Add any details..."
                    />
                </div>
            </div>
            <div className="mt-4 flex gap-2">
                <button
                    onClick={handleSave}
                    className="w-full px-4 py-2 bg-primary-500 text-white font-semibold rounded-lg shadow-md hover:bg-primary-600 disabled:bg-primary-400/50 transition-colors"
                >
                    Save
                </button>
                <button
                    onClick={onCancel}
                    className="w-full px-4 py-2 bg-slate-200 text-slate-800 font-semibold rounded-lg hover:bg-slate-300 transition-colors"
                >
                    Cancel
                </button>
            </div>
        </div>
    );
};


const RateCalculator: React.FC = () => {
    const [weight, setWeight] = useState('');
    const [amount, setAmount] = useState('');
    const [errors, setErrors] = useState<{ weight?: string; amount?: string }>({});
    
    const handleNumberChange = (value: string, field: 'weight' | 'amount') => {
        if (value.startsWith('-')) {
            return;
        }

        if (field === 'weight') setWeight(value);
        if (field === 'amount') setAmount(value);
        
        setErrors(prev => {
            const newErrors = { ...prev };
            delete newErrors[field];
            return newErrors;
        });
    };

    const calculation = useMemo(() => {
        const numWeight = parseFloat(weight);
        const numAmount = parseFloat(amount);

        if (numWeight > 0 && !isNaN(numAmount) && numAmount >= 0) {
            const rawRate = numAmount / numWeight;
            const rate = Math.round((rawRate + Number.EPSILON) * 100) / 100;
            return { rate };
        }
        return { rate: 0 };
    }, [weight, amount]);

    const handleReset = useCallback(() => {
        setWeight('');
        setAmount('');
        setErrors({});
    }, []);
    
     return (
        <div className="bg-white p-6 md:p-8 rounded-xl shadow-lg w-full border border-primary-200/50">
            <div className="space-y-6">
                <InputField
                    id="weight"
                    label="Total Weight (kg)"
                    value={weight}
                    onChange={(val) => handleNumberChange(val, 'weight')}
                    placeholder="e.g., 20"
                    error={errors.weight}
                />
                
                <InputField
                    id="amount"
                    label="Total Amount (Rs)"
                    value={amount}
                    onChange={(val) => handleNumberChange(val, 'amount')}
                    placeholder="e.g., 100"
                    error={errors.amount}
                />
                
                <div className="bg-primary-50 p-6 rounded-lg text-center border border-primary-200 transition-all duration-300">
                    <p className="text-base font-medium text-slate-600">Calculated Rate</p>
                    <p className="text-4xl font-bold text-primary-600 mt-1">
                       {formatCurrency(calculation.rate)}
                       <span className="text-xl font-semibold text-slate-500"> / kg</span>
                    </p>
                </div>
            </div>
             <div className="mt-8 pt-6 border-t border-slate-200">
                <button
                    onClick={handleReset}
                    className="w-full px-4 py-3 bg-slate-600 text-white font-semibold rounded-lg shadow-md hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 transition-colors"
                >
                    Reset
                </button>
            </div>
        </div>
    );
};

const MaundCalculator: React.FC<{ addCalculation: (calc: Omit<Calculation, 'id' | 'created_at'>) => Promise<void>, isEditMode: boolean }> = ({ addCalculation, isEditMode }) => {
    const MAUND_IN_KG = 40;
    const [bags, setBags] = useState<{ weight: number }[]>([]);
    const [currentWeight, setCurrentWeight] = useState('');
    const [pricePerMaund, setPricePerMaund] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const { addNotification } = useNotifier();

    const handleAddBag = () => {
        const weightValue = parseFloat(currentWeight);

        if (isNaN(weightValue) || weightValue <= 0) {
            setError('Please enter a valid positive weight.');
            return;
        }

        const newBag: { weight: number } = { weight: weightValue };

        setBags([...bags, newBag]);
        setCurrentWeight('');
        setError(null);
        document.getElementById('bagWeight')?.focus();
    };
    
    const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAddBag();
        }
    };

    const handleRemoveBag = (indexToRemove: number) => {
        setBags(bags.filter((_, index) => index !== indexToRemove));
    };

    const handleReset = () => {
        setBags([]);
        setCurrentWeight('');
        setPricePerMaund('');
        setError(null);
        setIsSaving(false);
    };

    const calculation = useMemo(() => {
        const totalKg = bags.reduce((acc, curr) => acc + curr.weight, 0);
        const maundPrice = parseFloat(pricePerMaund);

        const rawTotalPrice = (maundPrice > 0 && totalKg > 0)
            ? (totalKg / MAUND_IN_KG) * maundPrice
            : 0;
        const totalPrice = Math.round((rawTotalPrice + Number.EPSILON) * 100) / 100;

        if (totalKg === 0) {
            return { totalKg: 0, totalPrice: 0, maans: 0, kilos: 0, ratePerKg: 0, isValid: false };
        }

        const maans = Math.floor(totalKg / MAUND_IN_KG);
        const kilos = totalKg % MAUND_IN_KG;
        
        const rawRatePerKg = maundPrice > 0 ? maundPrice / MAUND_IN_KG : 0;
        const ratePerKg = Math.round((rawRatePerKg + Number.EPSILON) * 100) / 100;
        
        return { totalKg, totalPrice, maans, kilos, ratePerKg, isValid: true };
    }, [bags, pricePerMaund]);
    
    const handleSave = async (customerName: string, notes: string) => {
        if (!calculation.isValid) return;

        const nameToSave = customerName || 'Unnamed Calculation';
        const newCalc: Omit<Calculation, 'id' | 'created_at'> = {
            customer_name: nameToSave,
            total_kg: calculation.totalKg,
            total_price: calculation.totalPrice,
            bags: bags,
            notes: notes,
            price_per_maund: parseFloat(pricePerMaund) || 0,
        };

        try {
            await addCalculation(newCalc);
            addNotification(`Calculation for ${nameToSave} saved!`, 'success');
            handleReset();
        } catch (e: any) {
            const errorMessage = e.message || 'An unknown error occurred.';
            console.error('Failed to save calculation:', errorMessage);
            addNotification(`Failed to save calculation: ${errorMessage}`, 'error');
        }
    };

    return (
        <div className="bg-white p-6 md:p-8 rounded-xl shadow-lg w-full border border-primary-200/50">
            <div className="space-y-6">
                <InputField
                    id="pricePerMaund"
                    label="Price per Maan (40 kg) (Optional)"
                    value={pricePerMaund}
                    onChange={(val) => { if (!val.startsWith('-')) setPricePerMaund(val); }}
                    placeholder="e.g., 2200"
                />
                 <div>
                    <label htmlFor="bagWeight" className="block text-sm font-medium text-slate-700">Add Bag Weight</label>
                    <div className="mt-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                            type="number"
                            id="bagWeight"
                            value={currentWeight}
                            onChange={(e) => {
                                if (!e.target.value.startsWith('-')) setCurrentWeight(e.target.value);
                                if (error) setError(null);
                            }}
                            onKeyPress={handleKeyPress}
                            placeholder="Weight (kg)"
                            className={`sm:col-span-1 block w-full ${formInputClasses}`}
                        />
                         <button
                            onClick={handleAddBag}
                            className="sm:col-span-1 flex-shrink-0 px-4 py-3 bg-primary-500 text-white font-semibold rounded-lg shadow-md hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors"
                        >
                            Add Bag
                        </button>
                    </div>
                    {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
                </div>

                {bags.length > 0 && (
                    <div>
                        <h4 className="text-sm font-medium text-slate-700 mb-2">Added Bags ({bags.length}):</h4>
                        <div className="flex flex-wrap gap-2 p-3 bg-slate-50 rounded-md border max-h-32 overflow-y-auto">
                            {bags.map((bag, index) => (
                                <span key={index} className="flex items-center gap-1.5 bg-primary-200 text-primary-800 text-sm font-semibold pl-2.5 pr-1 py-1 rounded-full">
                                    {bag.weight.toFixed(2)} kg
                                    <button onClick={() => handleRemoveBag(index)} className="text-primary-800/80 hover:text-primary-800 rounded-full hover:bg-black/10 p-0.5 focus:outline-none">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                                    </button>
                                </span>
                            ))}
                        </div>
                    </div>
                )}
                
                <div className="bg-primary-50 p-6 rounded-lg border border-primary-200 space-y-4 text-center">
                    <div>
                         <p className="text-base font-medium text-slate-600">Total Weight (Maans)</p>
                         <p className="text-4xl font-bold text-primary-600 mt-1">
                            {calculation.maans}<span className="text-xl font-semibold text-slate-500"> Maan</span>
                             <span className="text-2xl font-bold text-primary-600/90 ml-2">
                                 {calculation.kilos.toFixed(2)}<span className="text-lg font-semibold text-slate-500"> kg</span>
                             </span>
                         </p>
                    </div>
                     <div className="border-t border-primary-200/80 pt-4">
                         <p className="text-base font-medium text-slate-600">Total (in KG)</p>
                         <p className="text-3xl font-bold text-primary-600 mt-1">
                            {calculation.totalKg.toFixed(2)}
                           <span className="text-xl font-semibold text-slate-500"> kg</span>
                        </p>
                    </div>
                    {calculation.totalPrice > 0 && (
                        <div className="border-t border-primary-200/80 pt-4">
                            <p className="text-base font-medium text-slate-600">Total Price</p>
                            <p className="text-3xl font-bold text-primary-600 mt-1">
                                {formatCurrency(calculation.totalPrice)}
                            </p>
                            {(parseFloat(pricePerMaund) > 0 || calculation.ratePerKg > 0) && (
                                <div className="text-sm text-slate-500 font-medium mt-2 space-y-1 text-center">
                                    {parseFloat(pricePerMaund) > 0 && (
                                        <p>
                                            <span className="font-semibold">{formatCurrency(parseFloat(pricePerMaund))}</span> / Maan
                                        </p>
                                    )}
                                    {calculation.ratePerKg > 0 && (
                                         <p>
                                           <span className="font-semibold">{formatCurrency(calculation.ratePerKg)}</span> / kg
                                        </p>
                                    )}
                                </div>
                            )}
                       </div>
                    )}
                </div>
            </div>
             <div className="mt-8 pt-6 border-t border-slate-200 flex flex-col sm:flex-row gap-4">
                <button
                    onClick={handleReset}
                    className="w-full px-4 py-3 bg-slate-600 text-white font-semibold rounded-lg shadow-md hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 transition-colors"
                >
                    Reset
                </button>
                <button
                    onClick={() => setIsSaving(true)}
                    disabled={!calculation.isValid || isSaving}
                    className="w-full px-4 py-3 bg-primary-500 text-white font-semibold rounded-lg shadow-md hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:bg-primary-400/50 transition-colors"
                >
                    Save Calculation
                </button>
            </div>
            {isSaving && <SaveCalculationForm onSave={handleSave} onCancel={() => setIsSaving(false)} />}
        </div>
    );
};

const EditCalculationModal: React.FC<{
    calculation: Calculation | null;
    onClose: () => void;
    onSave: (id: string, updatedData: Partial<Calculation>) => void;
}> = ({ calculation, onClose, onSave }) => {
    const MAUND_IN_KG = 40;
    const [customerName, setCustomerName] = useState('');
    const [notes, setNotes] = useState('');
    const [bags, setBags] = useState<{ weight: number }[]>([]);
    const [pricePerMaund, setPricePerMaund] = useState('');
    const [currentWeight, setCurrentWeight] = useState('');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (calculation) {
            setCustomerName(calculation.customer_name);
            setNotes(calculation.notes || '');
            setBags(calculation.bags || []);
            setPricePerMaund(calculation.price_per_maund?.toString() || '');
            setCurrentWeight('');
            setError(null);
        }
    }, [calculation]);
    
    const liveCalculation = useMemo(() => {
        const totalKg = bags.reduce((acc, curr) => acc + curr.weight, 0);
        const maundPrice = parseFloat(pricePerMaund);
        const totalPrice = (maundPrice > 0 && totalKg > 0) ? (totalKg / MAUND_IN_KG) * maundPrice : 0;
        const maans = Math.floor(totalKg / MAUND_IN_KG);
        const kilos = totalKg % MAUND_IN_KG;
        const ratePerKg = maundPrice > 0 ? maundPrice / MAUND_IN_KG : 0;
        return { totalKg, totalPrice, maans, kilos, ratePerKg };
    }, [bags, pricePerMaund]);


    const handleAddBag = () => {
        const weightValue = parseFloat(currentWeight);
        if (isNaN(weightValue) || weightValue <= 0) {
            setError('Please enter a valid positive weight.');
            return;
        }
        setBags([...bags, { weight: weightValue }]);
        setCurrentWeight('');
        setError(null);
    };

    const handleRemoveBag = (indexToRemove: number) => {
        setBags(bags.filter((_, index) => index !== indexToRemove));
    };

    if (!calculation) return null;

    const handleSave = () => {
        const nameToSave = customerName.trim() || 'Unnamed Calculation';
        const updatedData: Partial<Calculation> = {
            customer_name: nameToSave,
            notes: notes.trim(),
            bags: bags,
            price_per_maund: parseFloat(pricePerMaund) || 0,
            total_kg: liveCalculation.totalKg,
            total_price: liveCalculation.totalPrice,
        };
        onSave(calculation.id, updatedData);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4">
            <div className="bg-amber-50 rounded-lg shadow-xl w-full max-w-md">
                <div className="flex justify-between items-center p-4 border-b border-primary-200/80">
                    <h2 className="text-xl font-bold text-slate-800">Edit Calculation</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><CloseIcon /></button>
                </div>
                <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                    <div>
                        <label htmlFor="editCustomerName" className="block text-sm font-medium text-slate-700">Customer Name</label>
                        <input type="text" id="editCustomerName" value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Enter customer name" className={smallFormInputClasses} />
                    </div>
                     <div>
                        <label htmlFor="editPricePerMaund" className="block text-sm font-medium text-slate-700">Price per Maan (40 kg)</label>
                        <input type="number" id="editPricePerMaund" value={pricePerMaund} onChange={e => setPricePerMaund(e.target.value)} placeholder="e.g., 2200" className={smallFormInputClasses} />
                    </div>
                    
                    <div>
                        <label htmlFor="editBagWeight" className="block text-sm font-medium text-slate-700">Add Bag Weight</label>
                        <div className="mt-1 flex gap-2">
                            <input type="number" id="editBagWeight" value={currentWeight} onChange={(e) => { setCurrentWeight(e.target.value); if (error) setError(null); }} placeholder="Weight (kg)" className={smallFormInputClasses} />
                            <button onClick={handleAddBag} className="px-4 py-2 bg-primary-500 text-white font-semibold rounded-lg shadow-md hover:bg-primary-600">Add</button>
                        </div>
                        {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
                    </div>

                    {bags.length > 0 && (
                        <div>
                            <h4 className="text-sm font-medium text-slate-700 mb-2">Added Bags ({bags.length}):</h4>
                            <div className="flex flex-wrap gap-2 p-3 bg-slate-100 rounded-md border max-h-32 overflow-y-auto">
                                {bags.map((bag, index) => (
                                    <span key={index} className="flex items-center gap-1.5 bg-primary-200 text-primary-800 text-sm font-semibold pl-2.5 pr-1 py-1 rounded-full">
                                        {bag.weight.toFixed(2)} kg
                                        <button onClick={() => handleRemoveBag(index)} className="text-primary-800/80 hover:text-primary-800 rounded-full hover:bg-black/10 p-0.5"><CloseIcon /></button>
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                    
                    <div className="bg-white p-4 rounded-lg border border-primary-200 space-y-3 text-center">
                        <div>
                            <p className="text-sm font-medium text-slate-600">Total Weight</p>
                            <p className="text-2xl font-bold text-primary-600">
                                {liveCalculation.maans} <span className="text-base font-semibold text-slate-500">Maan</span>, {liveCalculation.kilos.toFixed(2)} <span className="text-base font-semibold text-slate-500">kg</span>
                            </p>
                        </div>
                        <div className="border-t border-primary-100 pt-3">
                            <p className="text-sm font-medium text-slate-600">New Total Price</p>
                            <p className="text-3xl font-bold text-primary-600">{formatCurrency(liveCalculation.totalPrice)}</p>
                             {(parseFloat(pricePerMaund) > 0 || liveCalculation.ratePerKg > 0) && (
                                <div className="text-xs text-slate-500 font-medium mt-1">
                                    {parseFloat(pricePerMaund) > 0 && (
                                        <span>{formatCurrency(parseFloat(pricePerMaund))} / Maan</span>
                                    )}
                                    {liveCalculation.ratePerKg > 0 && (
                                         <span className="ml-2 pl-2 border-l border-slate-300">{formatCurrency(liveCalculation.ratePerKg)} / kg</span>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    <div>
                        <label htmlFor="editNotes" className="block text-sm font-medium text-slate-700">Notes</label>
                        <textarea id="editNotes" value={notes} onChange={e => setNotes(e.target.value)} rows={3} className={smallTextAreaClasses} placeholder="Add any details..." />
                    </div>
                </div>
                <div className="flex justify-end p-4 bg-slate-50 rounded-b-lg gap-2">
                    <button onClick={onClose} className="px-4 py-2 bg-slate-200 text-slate-800 rounded-md hover:bg-slate-300">Cancel</button>
                    <button onClick={handleSave} className="px-4 py-2 bg-primary-500 text-white rounded-md hover:bg-primary-600">Save Changes</button>
                </div>
            </div>
        </div>
    );
};

const SavedCalculationsList: React.FC<{ calculations: Calculation[], onDelete: (id: string) => void, onEdit: (calc: Calculation) => void, isEditMode: boolean }> = ({ calculations, onDelete, onEdit, isEditMode }) => {
    if (calculations.length === 0) {
        return (
            <div className="text-center py-16 px-6 bg-white rounded-lg shadow-md border-2 border-dashed border-slate-200 h-full flex flex-col justify-center">
                <CalendarIcon />
                <h3 className="text-xl font-semibold text-slate-700 mt-4">No Saved Calculations</h3>
                <p className="text-slate-500 mt-2">Your saved calculations will appear here.</p>
            </div>
        );
    }

    return (
        <div className="bg-white p-6 md:p-8 rounded-xl shadow-lg w-full border border-primary-200/50">
            <h3 className="text-xl font-bold text-slate-700 mb-4">Saved Calculations</h3>
            <ul className="space-y-4">
                {calculations.map(calc => {
                    const ratePerKg = (calc.price_per_maund || 0) / 40;
                    return (
                    <li key={calc.id} className="bg-slate-50 p-4 rounded-lg border border-slate-200/80">
                        <div className="flex justify-between items-start gap-3">
                            <div className="flex-1">
                                <p className="font-bold text-slate-800">{calc.customer_name}</p>
                                <p className="text-sm text-slate-500">
                                    {new Date(calc.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
                                </p>
                                <div className="mt-2 text-sm text-left">
                                     <p className="font-semibold text-slate-700">{calc.total_kg.toFixed(2)} kg</p>
                                     <p className="font-bold text-primary-600 mt-1">{formatCurrency(calc.total_price)}</p>
                                     {calc.price_per_maund && calc.price_per_maund > 0 && (
                                         <p className="text-xs text-slate-500 mt-1">
                                             {formatCurrency(ratePerKg)} / kg
                                             <span className="mx-1 text-slate-300">|</span>
                                             {formatCurrency(calc.price_per_maund)} / Maan
                                         </p>
                                     )}
                                </div>
                            </div>
                            {isEditMode && (
                                <div className="flex flex-col sm:flex-row items-center gap-1 flex-shrink-0">
                                    <button onClick={() => onEdit(calc)} className="p-2 text-blue-600 rounded-full hover:bg-blue-100 transition-colors" aria-label={`Edit calculation for ${calc.customer_name}`}>
                                        <EditIcon />
                                    </button>
                                    <button onClick={() => onDelete(calc.id)} className="p-2 text-red-600 rounded-full hover:bg-red-100 transition-colors" aria-label={`Delete calculation for ${calc.customer_name}`}>
                                        <DeleteIcon />
                                    </button>
                                </div>
                            )}
                        </div>
                        {calc.notes && (
                             <div className="mt-3 pt-3 border-t border-slate-200">
                                <p className="text-sm text-slate-600 italic">
                                    <strong className="font-semibold not-italic text-slate-700">Note:</strong> {calc.notes}
                                </p>
                            </div>
                        )}
                    </li>
                )})}
            </ul>
        </div>
    )
};


const CalculatorPage: React.FC<{isEditMode: boolean}> = ({ isEditMode }) => {
    const [activeCalculator, setActiveCalculator] = useState<CalculatorType>('maund');
    const [calculations, setCalculations] = useState<Calculation[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { addNotification } = useNotifier();
    const [editingCalculation, setEditingCalculation] = useState<Calculation | null>(null);

    const setCalculationsWithCache = useCallback((updater: React.SetStateAction<Calculation[]>) => {
        setCalculations(prev => {
            const newState = typeof updater === 'function' ? updater(prev) : updater;
            localStorage.setItem(CALC_CACHE_KEY, JSON.stringify(newState));
            return newState;
        });
    }, []);

    const fetchCalculations = useCallback(async () => {
        setIsLoading(true);
        const loadFromCache = () => {
            const saved = localStorage.getItem(CALC_CACHE_KEY);
            if (saved) {
                try {
                    const parsed = JSON.parse(saved);
                    if (Array.isArray(parsed)) {
                        setCalculations(parsed);
                    } else {
                        setCalculations([]);
                        localStorage.removeItem(CALC_CACHE_KEY);
                    }
                } catch (error) {
                    console.error("Failed to parse calculations from cache:", error);
                    setCalculations([]);
                    localStorage.removeItem(CALC_CACHE_KEY);
                }
            } else {
                setCalculations([]);
            }
        };

        if (!supabase || !navigator.onLine) {
            if (!navigator.onLine) {
                addNotification('You are offline. Loading saved calculations from cache.', 'info');
            }
            loadFromCache();
            setIsLoading(false);
            return;
        }

        try {
            const { data, error } = await supabase.from('calculations').select('*').order('created_at', { ascending: false });
            if (error) throw error;
            setCalculationsWithCache(data || []);
        } catch (e: any) {
            const errorMessage = e.message || 'An unknown error occurred.';
            console.error('Could not fetch saved calculations, loading from cache:', errorMessage);
            addNotification(`Could not fetch data. Loading from cache.`, 'error');
            loadFromCache();
        }
        setIsLoading(false);
    }, [addNotification, setCalculationsWithCache]);
    
    useEffect(() => {
        fetchCalculations();
    }, [fetchCalculations]);

    const addCalculation = async (calc: Omit<Calculation, 'id' | 'created_at'>) => {
        if (!supabase) {
            throw new Error('Supabase not configured. Cannot save.');
        }
        const { data, error } = await supabase.from('calculations').insert([calc]).select();
        if (error) {
            console.error("Supabase insert error:", error.message);
            throw new Error(error.message);
        };
        if (!data || data.length === 0) {
            throw new Error("Insert succeeded but no data was returned. Check RLS policies.");
        }
        setCalculationsWithCache(prev => [data[0], ...prev]);
    };

    const deleteCalculation = async (id: string) => {
        if (!supabase) {
            addNotification('Supabase not configured. Cannot delete.', 'error');
            return;
        }
        try {
            const { error } = await supabase.from('calculations').delete().eq('id', id);
            if (error) throw new Error(error.message);
            setCalculationsWithCache(prev => prev.filter(c => c.id !== id));
            addNotification('Calculation deleted.', 'success');
        } catch (error: any) {
            console.error('Error deleting calculation:', error.message);
            addNotification(`Failed to delete calculation: ${error.message}`, 'error');
        }
    };

    const handleUpdateCalculation = async (id: string, updatedData: Partial<Calculation>) => {
         if (!supabase) {
            addNotification('Supabase not configured. Cannot update.', 'error');
            return;
        }
        try {
            const { data, error } = await supabase
                .from('calculations')
                .update(updatedData)
                .eq('id', id)
                .select()
                .single();
            if (error) throw new Error(error.message);
            
            setCalculationsWithCache(prev => prev.map(c => c.id === id ? data : c));
            addNotification('Calculation updated.', 'success');
            setEditingCalculation(null);
        } catch (error: any) {
            console.error('Error updating calculation:', error.message);
            addNotification(`Failed to update calculation: ${error.message}`, 'error');
        }
    };

    return (
        <div className="mt-4">
            <h2 className="text-2xl font-bold text-slate-700 mb-6">Calculators</h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">
                {/* Left Column: Calculators */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-slate-200/60 p-1 rounded-lg flex justify-center w-full">
                        {(['maund', 'rate'] as CalculatorType[]).map(type => (
                            <button
                                key={type}
                                onClick={() => setActiveCalculator(type)}
                                className={`w-1/2 px-4 py-2 text-sm font-semibold rounded-md transition-all duration-200 ${activeCalculator === type ? 'bg-primary-500 text-white shadow' : 'text-slate-600'}`}
                            >
                                {type === 'maund' ? 'Maan Calculator' : 'Rate Calculator'}
                            </button>
                        ))}
                    </div>

                    {activeCalculator === 'maund' && <MaundCalculator addCalculation={addCalculation} isEditMode={isEditMode} />}
                    {activeCalculator === 'rate' && <RateCalculator />}
                </div>

                {/* Right Column: Saved Calculations */}
                <div className="lg:col-span-3">
                    {isLoading ? (
                        <div className="flex justify-center items-center h-full">
                            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
                        </div>
                    ) : (
                        <SavedCalculationsList 
                            calculations={calculations} 
                            onDelete={deleteCalculation}
                            onEdit={(calc) => setEditingCalculation(calc)}
                            isEditMode={isEditMode}
                        />
                    )}
                </div>
            </div>

            <EditCalculationModal 
                calculation={editingCalculation}
                onClose={() => setEditingCalculation(null)}
                onSave={handleUpdateCalculation}
            />
        </div>
    );
};

export default CalculatorPage;
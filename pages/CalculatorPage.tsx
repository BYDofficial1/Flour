import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { formatCurrency } from '../utils/currency';
import type { Calculation } from '../types';
import { EditIcon } from '../components/icons/EditIcon';
import { DeleteIcon } from '../components/icons/DeleteIcon';

type CalculatorType = 'list' | 'rate';
const formInputClasses = "mt-1 block w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-md shadow-sm text-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-primary-500 focus:border-primary-500 transition-colors text-slate-100 placeholder-slate-400";

const InputField: React.FC<{ id: string, label: string, value: string, onChange: (val: string) => void, placeholder: string, error?: string, type?: string, children?: React.ReactNode }> = ({ id, label, value, onChange, placeholder, error, type = 'text', children }) => (
    <div>
        <label htmlFor={id} className="block text-sm font-medium text-slate-300">{label}</label>
        <div className="flex items-center gap-2">
            <input
                type={type}
                id={id}
                value={value}
                onChange={e => onChange(e.target.value)}
                placeholder={placeholder}
                className={formInputClasses}
                style={type === 'number' ? { MozAppearance: 'textfield' } : {}}
            />
            {children}
        </div>
        {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
);

const RateCalculator: React.FC = () => {
    const [weight, setWeight] = useState('');
    const [amount, setAmount] = useState('');
    
    const handleNumberChange = (value: string, field: 'weight' | 'amount') => {
        if (value.startsWith('-')) return;
        if (field === 'weight') setWeight(value);
        if (field === 'amount') setAmount(value);
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
    }, []);
    
     return (
        <div className="bg-slate-800 p-6 md:p-8 rounded-xl shadow-2xl shadow-black/20 w-full border border-slate-700">
            <div className="space-y-6">
                <InputField
                    id="weight"
                    label="Total Weight (kg)"
                    type="number"
                    value={weight}
                    onChange={v => handleNumberChange(v, 'weight')}
                    placeholder="e.g., 25"
                />
                <InputField
                    id="amount"
                    label="Total Amount (Rs)"
                    type="number"
                    value={amount}
                    onChange={v => handleNumberChange(v, 'amount')}
                    placeholder="e.g., 125"
                />
            </div>
             <div className="mt-8 pt-6 border-t border-slate-700">
                <div className="text-center">
                    <p className="text-sm font-medium text-slate-300">Calculated Rate per kg</p>
                    <p className="text-5xl font-bold text-primary-400 my-2 drop-shadow-glow">
                        {formatCurrency(calculation.rate)}
                    </p>
                </div>
            </div>
            <div className="mt-8">
                <button
                    onClick={handleReset}
                    className="w-full px-6 py-3 bg-slate-600 text-slate-100 font-semibold rounded-lg shadow-md hover:bg-slate-700 transition-colors"
                >
                    Reset
                </button>
            </div>
        </div>
    );
};

interface MultiWeightCalculatorProps {
    calculations: Calculation[];
    onAddCalculation: (calc: Omit<Calculation, 'id' | 'created_at' | 'updated_at' | 'user_id'>) => void;
    onUpdateCalculation: (calc: Calculation) => void;
    onDeleteCalculation: (id: string) => void;
    isEditMode: boolean;
}

const MultiWeightCalculator: React.FC<MultiWeightCalculatorProps> = ({ calculations, onAddCalculation, onUpdateCalculation, onDeleteCalculation, isEditMode }) => {
    const [pricePerMaund, setPricePerMaund] = useState('');
    const [currentWeight, setCurrentWeight] = useState('');
    const [weights, setWeights] = useState<number[]>([]);
    const [customerName, setCustomerName] = useState('');
    const [notes, setNotes] = useState('');
    const [editingCalculation, setEditingCalculation] = useState<Calculation | null>(null);
    const formRef = useRef<HTMLDivElement>(null);


    const handleNumberChange = (value: string, setter: React.Dispatch<React.SetStateAction<string>>) => {
        if (value.startsWith('-')) return;
        setter(value);
    };

    const handleAddWeight = () => {
        const numWeight = parseFloat(currentWeight);
        if (!isNaN(numWeight) && numWeight > 0) {
            setWeights(prev => [...prev, numWeight]);
            setCurrentWeight('');
        }
    };

    const handleRemoveWeight = (indexToRemove: number) => {
        setWeights(prev => prev.filter((_, index) => index !== indexToRemove));
    };

    const calculation = useMemo(() => {
        const numPricePerMaund = parseFloat(pricePerMaund) || 0;
        const totalKg = weights.reduce((acc, w) => acc + w, 0);

        if (totalKg === 0) {
            return { totalKg: 0, totalPrice: 0, totalMaunds: 0, remainingKg: 0 };
        }
        
        const pricePerKg = numPricePerMaund > 0 ? numPricePerMaund / 40 : 0;
        const totalPrice = totalKg * pricePerKg;
        const totalMaunds = Math.floor(totalKg / 40);
        const remainingKg = totalKg % 40;

        return {
            totalKg,
            totalPrice: Math.round((totalPrice + Number.EPSILON) * 100) / 100,
            totalMaunds,
            remainingKg: Math.round((remainingKg + Number.EPSILON) * 100) / 100
        };
    }, [pricePerMaund, weights]);
    
    const resetForm = useCallback(() => {
        setPricePerMaund('');
        setCurrentWeight('');
        setWeights([]);
        setCustomerName('');
        setNotes('');
        setEditingCalculation(null);
    }, []);

    const handleSaveOrUpdate = () => {
        if (weights.length === 0) {
            alert('Please add at least one weight to save a calculation.');
            return;
        }

        if (editingCalculation) {
            // Update
            const updatedCalc: Calculation = {
                ...editingCalculation,
                customer_name: customerName,
                total_kg: calculation.totalKg,
                total_price: calculation.totalPrice,
                bags: weights.map(w => ({ weight: w })),
                notes: notes,
                price_per_maund: parseFloat(pricePerMaund) || 0,
            };
            onUpdateCalculation(updatedCalc);
        } else {
            // Create
            const newCalc = {
                customer_name: customerName.trim() ? customerName.trim() : undefined,
                total_kg: calculation.totalKg,
                total_price: calculation.totalPrice,
                bags: weights.map(w => ({ weight: w })),
                notes: notes,
                price_per_maund: parseFloat(pricePerMaund) || 0,
            };
            onAddCalculation(newCalc);
        }
        resetForm();
    };
    
    const handleEditClick = (calc: Calculation) => {
        setEditingCalculation(calc);
        setCustomerName(calc.customer_name || '');
        setNotes(calc.notes || '');
        setPricePerMaund(calc.price_per_maund?.toString() || '');
        setWeights(calc.bags.map(b => b.weight));
        formRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    return (
        <>
            <div ref={formRef} className="bg-slate-800 p-6 md:p-8 rounded-xl shadow-2xl shadow-black/20 w-full border border-slate-700">
                <div className="space-y-6">
                    <InputField
                        id="pricePerMaund"
                        label="Price per Maund (40kg)"
                        type="number"
                        value={pricePerMaund}
                        onChange={(v) => handleNumberChange(v, setPricePerMaund)}
                        placeholder="e.g., 3200"
                    />
                    <div>
                        <label htmlFor="currentWeight" className="block text-sm font-medium text-slate-300">Enter Weight (kg)</label>
                        <div className="mt-1 flex gap-2">
                            <input
                                type="number"
                                id="currentWeight"
                                value={currentWeight}
                                onChange={e => handleNumberChange(e.target.value, setCurrentWeight)}
                                onKeyDown={e => { if(e.key === 'Enter') { e.preventDefault(); handleAddWeight(); }}}
                                placeholder="e.g., 120"
                                className={formInputClasses}
                            />
                            <button
                                onClick={handleAddWeight}
                                className="px-6 py-3 bg-primary-500 text-white font-semibold rounded-lg shadow-md hover:bg-primary-600 transition-colors disabled:bg-slate-500"
                                disabled={!currentWeight}
                                aria-label="Add weight to list"
                            >
                                Add
                            </button>
                        </div>
                    </div>

                    {weights.length > 0 && (
                        <div>
                            <h3 className="text-md font-semibold text-slate-200 mb-2">Weight Entries ({weights.length})</h3>
                            <div className="max-h-48 overflow-y-auto space-y-2 p-3 bg-slate-700/50 rounded-lg border border-slate-600 no-scrollbar">
                                {weights.map((w, i) => (
                                    <div key={i} className="flex justify-between items-center bg-slate-600 p-2 rounded-md animate-[fadeIn_0.2s_ease-out]">
                                        <span className="text-slate-100">{i + 1}. <span className="font-mono">{w.toFixed(2)} kg</span></span>
                                        <button onClick={() => handleRemoveWeight(i)} className="text-red-400 hover:text-red-300 p-1 rounded-full" aria-label={`Remove weight ${w} kg`}>
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="mt-8 pt-6 border-t border-slate-700">
                    <div className="flex justify-around items-center text-center">
                        <div className="w-1/2">
                            <p className="text-sm font-medium text-slate-300">Total Weight</p>
                            <p className="text-4xl font-bold text-slate-100">
                                {calculation.totalKg.toFixed(2)}
                                <span className="text-xl font-medium text-slate-400"> kg</span>
                            </p>
                            <p className="text-base text-slate-400 mt-1">
                                ({calculation.totalMaunds} Maunds, {calculation.remainingKg.toFixed(2)} kg)
                            </p>
                        </div>
                        <div className="h-16 w-px bg-slate-700"></div> {/* Vertical divider */}
                        <div className="w-1/2">
                            <p className="text-sm font-medium text-slate-300">Total Price</p>
                            <p className="text-5xl font-bold text-primary-400 drop-shadow-glow">
                                {formatCurrency(calculation.totalPrice)}
                            </p>
                        </div>
                    </div>
                </div>

                 <div className="mt-8 pt-6 border-t border-slate-700 space-y-6">
                    <InputField
                        id="customerName"
                        label={`Customer Name ${editingCalculation ? '(Editing)' : '(Optional)'}`}
                        value={customerName}
                        onChange={setCustomerName}
                        placeholder="Enter name..."
                    />
                    <InputField
                        id="notes"
                        label="Notes (Optional)"
                        value={notes}
                        onChange={setNotes}
                        placeholder="Any extra details..."
                    />
                </div>
                <div className="mt-8 grid grid-cols-2 gap-4">
                     <button
                        onClick={resetForm}
                        className="w-full px-6 py-3 bg-slate-600 text-slate-100 font-semibold rounded-lg shadow-md hover:bg-slate-700 transition-colors"
                    >
                        {editingCalculation ? 'Cancel Edit' : 'Clear All'}
                    </button>
                    <button
                        onClick={handleSaveOrUpdate}
                        disabled={weights.length === 0 || !isEditMode}
                        className="w-full px-6 py-3 bg-primary-500 text-white font-semibold rounded-lg shadow-md hover:bg-primary-600 transition-colors disabled:bg-slate-500/50 disabled:cursor-not-allowed"
                    >
                        {editingCalculation ? 'Update Calculation' : 'Save Calculation'}
                    </button>
                </div>
            </div>

            {calculations.length > 0 && (
                <div className="mt-10">
                    <h3 className="text-xl font-bold text-slate-200 mb-4">Saved Calculations</h3>
                    <div className="space-y-3">
                        {calculations.map(calc => {
                             const totalMaunds = Math.floor(calc.total_kg / 40);
                             const remainingKg = calc.total_kg % 40;
                            return (
                                <div key={calc.id} className="bg-slate-800 p-4 rounded-xl border border-slate-700 animate-[fadeIn_0.3s_ease-out]">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="font-bold text-slate-100 text-lg">{calc.customer_name || 'Unnamed Calculation'}</p>
                                            <p className="text-xs text-slate-400 mt-1">{new Date(calc.created_at).toLocaleString()}</p>
                                        </div>
                                         <div className="flex items-center gap-1">
                                            <button disabled={!isEditMode} onClick={() => handleEditClick(calc)} className="p-2 text-blue-400 rounded-full hover:bg-blue-500/10 transition-colors disabled:text-slate-500 disabled:cursor-not-allowed disabled:hover:bg-transparent" aria-label={`Edit calculation for ${calc.customer_name || 'Unnamed'}`}>
                                                <EditIcon />
                                            </button>
                                            <button disabled={!isEditMode} onClick={() => onDeleteCalculation(calc.id)} className="p-2 text-red-400 rounded-full hover:bg-red-500/10 transition-colors disabled:text-slate-500 disabled:cursor-not-allowed disabled:hover:bg-transparent" aria-label={`Delete calculation for ${calc.customer_name || 'Unnamed'}`}>
                                                <DeleteIcon />
                                            </button>
                                        </div>
                                    </div>
                                    {calc.notes && <p className="text-sm italic text-slate-300 my-2 p-2 bg-slate-700/50 rounded-md">"{calc.notes}"</p>}
                                    <div className="flex flex-wrap gap-1 my-2">
                                        {calc.bags.map((bag, index) => (
                                            <span key={index} className="bg-slate-600 text-xs font-mono px-2 py-1 rounded">
                                                {bag.weight.toFixed(2)}kg
                                            </span>
                                        ))}
                                    </div>
                                    <div className="mt-3 pt-3 border-t border-slate-700 grid grid-cols-3 gap-2 text-center items-center">
                                        <div>
                                            <p className="text-xs text-slate-400 font-medium">Total KG</p>
                                            <p className="font-bold text-slate-100 text-lg">
                                                {calc.total_kg.toFixed(2)} <span className="text-sm font-normal text-slate-300">kg</span>
                                            </p>
                                        </div>
                                        <div className="border-x border-slate-700 px-2">
                                            <p className="text-xs text-slate-400 font-medium">Breakdown</p>
                                            <p className="font-semibold text-slate-200 text-base leading-tight">
                                                {totalMaunds} <span className="text-xs text-slate-300">Maunds</span>
                                                , {remainingKg.toFixed(2)} <span className="text-xs text-slate-300">kg</span>
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-400 font-medium">Total Price</p>
                                            <p className="font-bold text-primary-400 text-lg">
                                                {formatCurrency(calc.total_price)}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}
        </>
    );
};

interface CalculatorPageProps {
    calculations: Calculation[];
    onAddCalculation: (calc: Omit<Calculation, 'id' | 'created_at' | 'updated_at' | 'user_id'>) => void;
    onUpdateCalculation: (calc: Calculation) => void;
    onDeleteCalculation: (id: string) => void;
    isEditMode: boolean;
}

const CalculatorPage: React.FC<CalculatorPageProps> = ({ isEditMode, ...rest }) => {
    const [calculatorType, setCalculatorType] = useState<CalculatorType>('list');

    const ToggleButton: React.FC<{ label: string; type: CalculatorType; }> = ({ label, type }) => (
        <button
            onClick={() => setCalculatorType(type)}
            className={`w-full py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 ${
                calculatorType === type
                    ? 'bg-primary-600 text-white shadow-md'
                    : 'text-slate-300 hover:bg-slate-700'
            }`}
        >
            {label}
        </button>
    );

    return (
        <div className="mt-4 max-w-2xl mx-auto pb-10 px-4">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8">
                <h2 className="text-2xl font-bold text-slate-200">Calculators</h2>
                 <div className="w-full md:w-auto grid grid-cols-2 gap-1 p-1 bg-slate-800 rounded-xl border border-slate-700">
                    <ToggleButton label="Weight List" type="list" />
                    <ToggleButton label="Rate Finder" type="rate" />
                </div>
            </div>

            <div className="animate-[fadeIn_0.3s_ease-out]">
                <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }`}</style>
                {calculatorType === 'list' ? (
                    <MultiWeightCalculator {...rest} isEditMode={isEditMode} />
                ) : (
                    <RateCalculator />
                )}
            </div>
        </div>
    );
};

export default CalculatorPage;
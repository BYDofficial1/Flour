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
const formInputClasses = "mt-1 block w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-md shadow-sm text-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-primary-500 focus:border-primary-500 transition-colors text-slate-100 placeholder-slate-400";
const smallFormInputClasses = formInputClasses.replace('text-lg', 'text-base').replace('py-3', 'py-2');
const smallTextAreaClasses = smallFormInputClasses + " leading-relaxed";


const InputField = ({ id, label, value, onChange, placeholder, error, type = 'number' }: { id: string, label: string, value: string, onChange: (val: string) => void, placeholder: string, error?: string, type?: string }) => (
    <div>
        <label htmlFor={id} className="block text-sm font-medium text-slate-300">{label}</label>
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
        <div className="mt-6 p-4 bg-slate-700 border-t-2 border-slate-600 rounded-b-xl">
            <h4 className="font-semibold text-slate-200 mb-4">Save Calculation</h4>
            <div className="space-y-4">
                 <div>
                    <label htmlFor="saveCustomerName" className="block text-sm font-medium text-slate-300">Customer Name (Optional)</label>
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
                    <label htmlFor="saveNotes" className="block text-sm font-medium text-slate-300">Notes (Optional)</label>
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
                    className="w-full px-4 py-2 bg-slate-500 text-slate-100 font-semibold rounded-lg hover:bg-slate-600 transition-colors"
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
        <div className="bg-slate-800 p-6 md:p-8 rounded-xl shadow-2xl shadow-black/20 w-full border border-slate-700">
            <div className="space-y-6">
                <InputField
                    id="weight"
                    label="Total Weight (kg)"
                    value={weight}
                    onChange={v => handleNumberChange(v, 'weight')}
                    placeholder="e.g., 25"
                    error={errors.weight}
                />
                <InputField
                    id="amount"
                    label="Total Amount (Rs)"
                    value={amount}
                    onChange={v => handleNumberChange(v, 'amount')}
                    placeholder="e.g., 125"
                    error={errors.amount}
                />
            </div>
             <div className="mt-8 pt-6 border-t-2 border-slate-700/80">
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


const MaundCalculator: React.FC<{
    onSave: (calculation: Omit<Calculation, 'id' | 'created_at'>) => void;
    isEditMode: boolean;
}> = ({ onSave, isEditMode }) => {
    const [bags, setBags] = useState<{ id: number, weight: string }[]>([{ id: 1, weight: '' }]);
    const [pricePerMaund, setPricePerMaund] = useState('');
    const [errors, setErrors] = useState<{ [key: string]: string }>({});
    const [isSaving, setIsSaving] = useState(false);
    
    const handleBagWeightChange = (id: number, weight: string) => {
        if (weight.startsWith('-')) return;
        setBags(bags.map(bag => bag.id === id ? { ...bag, weight } : bag));
        setErrors(prev => {
            const newErrors = { ...prev };
            delete newErrors[`bag-${id}`];
            return newErrors;
        });
    };
    
    const handlePriceChange = (price: string) => {
        if (price.startsWith('-')) return;
        setPricePerMaund(price);
        setErrors(prev => {
            const newErrors = { ...prev };
            delete newErrors.price;
            return newErrors;
        });
    }

    const addBag = () => {
        setBags([...bags, { id: Date.now(), weight: '' }]);
    };
    
    const removeBag = (id: number) => {
        setBags(bags.filter(bag => bag.id !== id));
    };

    const calculation = useMemo(() => {
        const totalKg = bags.reduce((sum, bag) => sum + (parseFloat(bag.weight) || 0), 0);
        const totalMaunds = totalKg / 40;
        const numPricePerMaund = parseFloat(pricePerMaund);

        if (totalKg > 0 && numPricePerMaund > 0) {
            const rawPrice = totalMaunds * numPricePerMaund;
            const totalPrice = Math.round((rawPrice + Number.EPSILON) * 100) / 100;
            return { totalKg, totalMaunds, totalPrice };
        }
        return { totalKg, totalMaunds, totalPrice: 0 };
    }, [bags, pricePerMaund]);
    
    const handleReset = useCallback(() => {
        setBags([{ id: 1, weight: '' }]);
        setPricePerMaund('');
        setErrors({});
        setIsSaving(false);
    }, []);

    const handleSave = (customerName: string, notes: string) => {
        onSave({
            customer_name: customerName,
            total_kg: calculation.totalKg,
            total_price: calculation.totalPrice,
            bags: bags.map(b => ({ weight: parseFloat(b.weight) || 0 })),
            notes: notes,
            price_per_maund: parseFloat(pricePerMaund)
        });
        handleReset();
    }

    return (
        <div className="bg-slate-800 p-6 md:p-8 rounded-xl shadow-2xl shadow-black/20 w-full border border-slate-700">
            <div className="space-y-6">
                <div>
                    <label className="block text-sm font-medium text-slate-300">Bag Weights (kg)</label>
                    <div className="space-y-3 mt-1">
                        {bags.map((bag, index) => (
                            <div key={bag.id} className="flex items-center gap-2">
                                <input
                                    type="number"
                                    value={bag.weight}
                                    onChange={e => handleBagWeightChange(bag.id, e.target.value)}
                                    placeholder={`Bag ${index + 1} weight`}
                                    className={formInputClasses}
                                />
                                {bags.length > 1 && (
                                    <button onClick={() => removeBag(bag.id)} className="p-3 bg-red-500/20 text-red-400 rounded-md hover:bg-red-500/30 transition-colors">
                                        <DeleteIcon />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                     <button onClick={addBag} className="mt-3 text-sm font-semibold text-primary-400 hover:text-primary-300">
                        + Add another bag
                    </button>
                </div>
                 <InputField
                    id="pricePerMaund"
                    label="Price per Maund (40kg)"
                    value={pricePerMaund}
                    onChange={handlePriceChange}
                    placeholder="e.g., 3200"
                    error={errors.price}
                />
            </div>
            <div className="mt-8 pt-6 border-t-2 border-slate-700/80">
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-center">
                    <div>
                         <p className="text-sm font-medium text-slate-300">Total Weight</p>
                         <p className="text-3xl font-bold text-slate-100 my-1">{calculation.totalKg.toFixed(2)} kg</p>
                         <p className="text-sm text-slate-400">({calculation.totalMaunds.toFixed(3)} Maunds)</p>
                    </div>
                     <div className="sm:border-l sm:border-slate-700">
                         <p className="text-sm font-medium text-slate-300">Total Price</p>
                         <p className="text-5xl font-bold text-primary-400 my-1 drop-shadow-glow">
                            {formatCurrency(calculation.totalPrice)}
                        </p>
                    </div>
                 </div>
            </div>
            
             <div className="mt-8 flex gap-2">
                <button
                    onClick={handleReset}
                    className="w-full px-6 py-3 bg-slate-600 text-slate-100 font-semibold rounded-lg shadow-md hover:bg-slate-700 transition-colors"
                >
                    Reset
                </button>
                {isEditMode && (
                    <button
                        onClick={() => setIsSaving(true)}
                        disabled={calculation.totalPrice <= 0 || isSaving}
                        className="w-full px-6 py-3 bg-primary-500 text-white font-semibold rounded-lg shadow-md hover:bg-primary-600 disabled:bg-primary-400/50 transition-colors"
                    >
                        Save
                    </button>
                )}
            </div>
            
            {isSaving && <SaveCalculationForm onSave={handleSave} onCancel={() => setIsSaving(false)} />}
        </div>
    );
};


const SavedCalculations: React.FC<{
    calculations: Calculation[];
    onDelete: (id: string) => void;
    onEdit: (calculation: Calculation) => void;
    isEditMode: boolean;
}> = ({ calculations, onDelete, onEdit, isEditMode }) => {
    if (calculations.length === 0) {
        return (
            <div className="text-center py-10 bg-slate-800 rounded-xl mt-8 border-2 border-dashed border-slate-700">
                <h3 className="text-lg font-semibold text-slate-300">No Saved Calculations</h3>
                <p className="text-sm text-slate-400">Your saved calculations will appear here.</p>
            </div>
        );
    }

    return (
        <div className="mt-10">
            <h2 className="text-xl font-bold text-slate-200 mb-4">Saved Calculations</h2>
            <div className="space-y-3">
                {calculations.map(calc => (
                    <div key={calc.id} className="bg-slate-800 p-4 rounded-lg shadow-md border border-slate-700">
                        <div className="flex justify-between items-start">
                           <div>
                                <p className="font-semibold text-slate-100">{calc.customer_name || 'Unnamed Calculation'}</p>
                                <div className="flex items-center gap-2 mt-1">
                                    <CalendarIcon />
                                    <span className="text-xs text-slate-400">{new Date(calc.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', year:'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}</span>
                                </div>
                           </div>
                           <div className="flex items-center gap-2">
                                {isEditMode && (
                                    <button onClick={() => onDelete(calc.id)} className="p-2 text-red-400 rounded-full hover:bg-red-500/10 transition-colors">
                                        <DeleteIcon />
                                    </button>
                                )}
                           </div>
                        </div>
                         <div className="mt-3 pt-3 border-t border-slate-700">
                            <div className="flex justify-between items-center">
                                <div>
                                    <p className="text-sm text-slate-300">{calc.total_kg.toFixed(2)} kg at {formatCurrency(calc.price_per_maund || 0)}/maund</p>
                                    <p className="text-xs text-slate-400">{calc.bags.length} bags</p>
                                </div>
                                <p className="text-2xl font-bold text-primary-400">{formatCurrency(calc.total_price)}</p>
                            </div>
                            {calc.notes && (
                                <div className="mt-2 p-2 text-sm bg-slate-700/50 rounded-md text-slate-300 italic">
                                    "{calc.notes}"
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};


const CalculatorPage: React.FC<{ isEditMode: boolean }> = ({ isEditMode }) => {
    const [calculatorType, setCalculatorType] = useState<CalculatorType>('maund');
    const [savedCalculations, setSavedCalculations] = useState<Calculation[]>([]);
    const { addNotification } = useNotifier();

     useEffect(() => {
        const loadFromCache = () => {
            const saved = localStorage.getItem(CALC_CACHE_KEY);
            if (saved) {
                try {
                    const parsed = JSON.parse(saved);
                    if (Array.isArray(parsed)) {
                        setSavedCalculations(parsed.sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
                    }
                } catch (e) { console.error("Failed to parse saved calculations", e); }
            }
        };
        loadFromCache();
    }, []);

    const saveToCache = (calcs: Calculation[]) => {
        localStorage.setItem(CALC_CACHE_KEY, JSON.stringify(calcs));
    };

    const handleSaveCalculation = (calculation: Omit<Calculation, 'id' | 'created_at'>) => {
        const newCalculation: Calculation = {
            ...calculation,
            id: crypto.randomUUID(),
            created_at: new Date().toISOString()
        };
        setSavedCalculations(prev => {
            const newCalcs = [newCalculation, ...prev];
            saveToCache(newCalcs);
            return newCalcs;
        });
        addNotification('Calculation saved successfully!', 'success');
    };

    const handleDeleteCalculation = (id: string) => {
        setSavedCalculations(prev => {
            const newCalcs = prev.filter(c => c.id !== id);
            saveToCache(newCalcs);
            return newCalcs;
        });
        addNotification('Calculation deleted!', 'info');
    };

    const handleEditCalculation = (calculation: Calculation) => {
        // Future implementation: pre-fill the form with calculation data
        addNotification('Edit functionality coming soon!', 'info');
    };


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
        <div className="mt-4 max-w-4xl mx-auto pb-10">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8">
                <h2 className="text-2xl font-bold text-slate-200">Calculators</h2>
                 <div className="w-full md:w-auto grid grid-cols-2 gap-1 p-1 bg-slate-800 rounded-xl">
                    <ToggleButton label="Maund to Price" type="maund" />
                    <ToggleButton label="Rate Finder" type="rate" />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                <div className="lg:col-span-3">
                    {calculatorType === 'maund' ? (
                        <MaundCalculator onSave={handleSaveCalculation} isEditMode={isEditMode} />
                    ) : (
                        <RateCalculator />
                    )}
                </div>
                 <div className="lg:col-span-2">
                    <SavedCalculations 
                        calculations={savedCalculations} 
                        onDelete={handleDeleteCalculation}
                        onEdit={handleEditCalculation}
                        isEditMode={isEditMode}
                    />
                </div>
            </div>
        </div>
    );
};

export default CalculatorPage;
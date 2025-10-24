
import React, { useState, useMemo, useCallback } from 'react';
import { formatCurrency } from '../utils/currency';
import { PlusIcon } from '../components/icons/PlusIcon';

interface CalculatorPageProps {
    onSave: (data: { quantity: number; rate: number; total: number }) => void;
}

// A simple, reusable input field component with error display.
const InputField = ({ id, label, value, onChange, placeholder, error }: { id: string, label: string, value: string, onChange: (val: string) => void, placeholder: string, error?: string }) => (
    <div>
        <label htmlFor={id} className="block text-sm font-medium text-slate-700">{label}</label>
        <input
            type="number"
            id={id}
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder={placeholder}
            className="mt-1 block w-full px-4 py-3 bg-white border border-slate-300 rounded-md shadow-sm text-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all text-slate-800"
            style={{ MozAppearance: 'textfield' }}
        />
        {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
);

const CalculatorPage: React.FC<CalculatorPageProps> = ({ onSave }) => {
    const [weight, setWeight] = useState('');
    const [amount, setAmount] = useState('');
    const [errors, setErrors] = useState<{ weight?: string; amount?: string }>({});

    const handleNumberChange = (value: string, field: 'weight' | 'amount') => {
        if (field === 'weight') setWeight(value);
        if (field === 'amount') setAmount(value);

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

    const calculation = useMemo(() => {
        const numWeight = parseFloat(weight);
        const numAmount = parseFloat(amount);

        if (numWeight > 0 && !isNaN(numAmount) && numAmount >= 0) {
            const rate = numAmount / numWeight;
            return {
                rate,
                isValid: true,
                quantity: numWeight,
                total: numAmount,
            };
        }
        return { rate: 0, isValid: false, quantity: 0, total: 0 };
    }, [weight, amount]);

    const handleReset = useCallback(() => {
        setWeight('');
        setAmount('');
        setErrors({});
    }, []);

    const handleSaveClick = () => {
        if (calculation.isValid) {
            onSave({
                quantity: calculation.quantity,
                rate: calculation.rate,
                total: calculation.total,
            });
        }
    };

    return (
        <div className="mt-4">
            <h2 className="text-2xl font-bold text-slate-700 mb-6">Quick Rate Calculator</h2>
            <div className="bg-white p-6 md:p-8 rounded-xl shadow-lg max-w-2xl mx-auto border border-amber-200/50">
                <div className="space-y-6">
                    <p className="text-center text-slate-500">Enter the total weight and price to calculate the rate per kg.</p>
                    
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
                    
                    <div className="bg-amber-50 p-6 rounded-lg text-center border border-amber-200 transition-all duration-300">
                        <p className="text-base font-medium text-slate-600">Calculated Rate</p>
                        <p className="text-4xl font-bold text-amber-600 mt-1">
                           {formatCurrency(calculation.rate)}
                           <span className="text-xl font-semibold text-slate-500"> / kg</span>
                        </p>
                    </div>

                </div>
                <div className="mt-8 pt-6 border-t border-slate-200 flex flex-col sm:flex-row gap-4">
                    <button
                        onClick={handleReset}
                        className="w-full px-4 py-3 bg-slate-600 text-white font-semibold rounded-lg shadow-md hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 transition-colors"
                    >
                        Reset
                    </button>
                    {calculation.isValid && (
                        <button
                            onClick={handleSaveClick}
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-amber-500 text-white font-semibold rounded-lg shadow-md hover:bg-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 transition-colors"
                        >
                            <PlusIcon />
                            Save as Transaction
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CalculatorPage;
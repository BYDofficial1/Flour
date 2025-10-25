import React, { useState } from 'react';
import { useNotifier } from '../context/NotificationContext';
import { verifyPin, hashPin } from '../utils/security';
import { CloseIcon } from './icons/CloseIcon';

interface ChangePinModalProps {
    isOpen: boolean;
    onClose: () => void;
}

type Step = 'verify' | 'new';

const ChangePinModal: React.FC<ChangePinModalProps> = ({ isOpen, onClose }) => {
    const { addNotification } = useNotifier();
    const [step, setStep] = useState<Step>('verify');
    const [currentPin, setCurrentPin] = useState('');
    const [newPin, setNewPin] = useState('');
    const [confirmNewPin, setConfirmNewPin] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const resetState = () => {
        setStep('verify');
        setCurrentPin('');
        setNewPin('');
        setConfirmNewPin('');
        setError('');
        setIsLoading(false);
        onClose();
    };

    const handleVerifyPin = async (e: React.FormEvent) => {
        e.preventDefault();
        const storedHash = localStorage.getItem('pinHash');
        if (!storedHash) {
            setError('No PIN is set up. Cannot change.');
            return;
        }
        setIsLoading(true);
        setError('');
        const isValid = await verifyPin(currentPin, storedHash);
        if (isValid) {
            setStep('new');
        } else {
            setError('Incorrect current PIN.');
        }
        setIsLoading(false);
    };

    const handleSetNewPin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPin.length < 4) {
            setError('New PIN must be at least 4 digits.');
            return;
        }
        if (newPin !== confirmNewPin) {
            setError('New PINs do not match.');
            return;
        }
        setIsLoading(true);
        setError('');
        try {
            const pinHash = await hashPin(newPin);
            localStorage.setItem('pinHash', pinHash);
            addNotification('PIN changed successfully!', 'success');
            resetState();
        } catch (err) {
            setError('Could not save new PIN.');
        } finally {
            setIsLoading(false);
        }
    };
    
    if (!isOpen) return null;
    
    const PinInput: React.FC<{ value: string, onChange: (val: string) => void, id: string, label: string }> = ({ value, onChange, id, label }) => (
        <div>
            <label htmlFor={id} className="block text-sm font-medium text-slate-300">{label}</label>
            <input
                id={id}
                type="password"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="mt-1 w-full px-4 py-3 bg-slate-700 text-slate-100 border border-slate-600 rounded-md"
                required
                minLength={4}
                maxLength={6}
                autoFocus
            />
        </div>
    );

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center p-4">
            <div
                className="bg-slate-800 rounded-xl shadow-2xl w-full max-w-sm"
                onClick={e => e.stopPropagation()}
            >
                <header className="flex justify-between items-center p-4 border-b border-slate-700">
                    <h2 className="text-xl font-bold text-slate-100">Change PIN</h2>
                    <button onClick={resetState} className="text-slate-400 hover:text-slate-200"><CloseIcon /></button>
                </header>

                {step === 'verify' && (
                    <form onSubmit={handleVerifyPin} className="p-6 space-y-4">
                        <PinInput id="current-pin" label="Enter Current PIN" value={currentPin} onChange={setCurrentPin} />
                        {error && <p className="text-red-400 text-sm">{error}</p>}
                        <div className="flex justify-end pt-2">
                             <button type="submit" disabled={isLoading} className="px-6 py-3 bg-primary-500 text-white font-semibold rounded-lg shadow-md hover:bg-primary-600 disabled:bg-slate-500/50">
                                {isLoading ? 'Verifying...' : 'Next'}
                             </button>
                        </div>
                    </form>
                )}

                {step === 'new' && (
                     <form onSubmit={handleSetNewPin} className="p-6 space-y-4">
                        <PinInput id="new-pin" label="Enter New PIN (4-6 digits)" value={newPin} onChange={setNewPin} />
                        <PinInput id="confirm-new-pin" label="Confirm New PIN" value={confirmNewPin} onChange={setConfirmNewPin} />
                        {error && <p className="text-red-400 text-sm">{error}</p>}
                        <div className="flex justify-end items-center gap-4 pt-2">
                            <button type="button" onClick={() => setStep('verify')} className="text-sm text-slate-400 hover:text-white">Back</button>
                             <button type="submit" disabled={isLoading} className="px-6 py-3 bg-primary-500 text-white font-semibold rounded-lg shadow-md hover:bg-primary-600 disabled:bg-slate-500/50">
                                {isLoading ? 'Saving...' : 'Set New PIN'}
                             </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export default ChangePinModal;

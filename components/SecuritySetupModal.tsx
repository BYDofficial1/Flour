import React, { useState } from 'react';
import { CloseIcon } from './icons/CloseIcon';
import { FingerprintIcon } from './icons/FingerprintIcon';
import { KeypadIcon } from './icons/KeypadIcon';
import { isWebAuthnSupported, registerBiometric, hashPin } from '../utils/security';
import { useNotifier } from '../context/NotificationContext';

interface SecuritySetupModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSetupSuccess: () => void;
}

type Step = 'code' | 'options' | 'pin';

const SECRET_CODE = '159951357753';

const SecuritySetupModal: React.FC<SecuritySetupModalProps> = ({ isOpen, onClose, onSetupSuccess }) => {
    const { addNotification } = useNotifier();
    const [step, setStep] = useState<Step>('code');
    const [code, setCode] = useState('');
    const [pin, setPin] = useState('');
    const [confirmPin, setConfirmPin] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    
    const handleCodeSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (code === SECRET_CODE) {
            setError('');
            setStep('options');
        } else {
            setError('Incorrect code. Please try again.');
        }
    };

    const handleBiometricSetup = async () => {
        setIsLoading(true);
        setError('');
        try {
            const credentialId = await registerBiometric();
            if (credentialId) {
                localStorage.setItem('webAuthnCredentialId', credentialId);
                localStorage.setItem('isSecuritySetup', 'true');
                addNotification('Biometric security enabled!', 'success');
                onSetupSuccess();
            } else {
                setError('Biometric registration was cancelled or failed.');
            }
        } catch (err) {
            setError('An error occurred during biometric setup.');
        } finally {
            setIsLoading(false);
        }
    };

    const handlePinSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (pin.length < 4) {
            setError('PIN must be at least 4 digits.');
            return;
        }
        if (pin !== confirmPin) {
            setError('PINs do not match.');
            return;
        }
        
        setIsLoading(true);
        setError('');
        
        try {
            const pinHash = await hashPin(pin);
            localStorage.setItem('pinHash', pinHash);
            localStorage.setItem('isSecuritySetup', 'true');
            addNotification('PIN security enabled!', 'success');
            onSetupSuccess();
        } catch (err) {
            setError('Could not save PIN. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const resetState = () => {
        setStep('code');
        setCode('');
        setPin('');
        setConfirmPin('');
        setError('');
        setIsLoading(false);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center p-4">
            <div
                className="bg-slate-800 rounded-xl shadow-2xl w-full max-w-sm transform transition-all animate-[fadeIn_0.2s_ease-out_forwards] scale-95"
                style={{ animation: 'fadeIn 0.2s ease-out forwards, scaleUp 0.2s ease-out forwards' }}
                onClick={e => e.stopPropagation()}
            >
                <header className="flex justify-between items-center p-4 border-b border-slate-700">
                    <h2 className="text-xl font-bold text-slate-100">Set Up Edit Lock</h2>
                    <button onClick={resetState} className="text-slate-400 hover:text-slate-200"><CloseIcon /></button>
                </header>

                {step === 'code' && (
                    <form onSubmit={handleCodeSubmit} className="p-6">
                        <label htmlFor="secret-code" className="block text-sm font-medium text-slate-300 mb-2">Enter setup code to continue</label>
                        <input
                            id="secret-code"
                            type="password"
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            className="w-full px-4 py-3 bg-slate-700 text-slate-100 border border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                            required
                            autoFocus
                        />
                        {error && <p className="text-red-400 text-sm mt-3">{error}</p>}
                        <button type="submit" className="w-full mt-4 px-6 py-3 bg-primary-500 text-white font-semibold rounded-lg shadow-md hover:bg-primary-600 transition-colors">
                            Verify
                        </button>
                    </form>
                )}

                {step === 'options' && (
                    <div className="p-6 space-y-4">
                        <p className="text-center text-slate-300">Choose a method to secure Edit Mode.</p>
                        {isWebAuthnSupported() && (
                            <button
                                onClick={handleBiometricSetup}
                                disabled={isLoading}
                                className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-slate-600 text-white font-semibold rounded-lg shadow-md hover:bg-slate-700 transition-colors"
                            >
                                <FingerprintIcon className="h-6 w-6" />
                                {isLoading ? 'Processing...' : 'Use Fingerprint / Face ID'}
                            </button>
                        )}
                        <button
                            onClick={() => setStep('pin')}
                            className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-slate-600 text-white font-semibold rounded-lg shadow-md hover:bg-slate-700 transition-colors"
                        >
                            <KeypadIcon className="h-6 w-6" />
                            Set a PIN Code
                        </button>
                        {error && <p className="text-red-400 text-sm mt-2 text-center">{error}</p>}
                    </div>
                )}
                
                {step === 'pin' && (
                    <form onSubmit={handlePinSubmit} className="p-6 space-y-4">
                        <div>
                             <label htmlFor="pin" className="block text-sm font-medium text-slate-300">Enter a 4-6 digit PIN</label>
                             <input
                                id="pin"
                                type="password"
                                value={pin}
                                onChange={(e) => setPin(e.target.value)}
                                className="mt-1 w-full px-4 py-3 bg-slate-700 text-slate-100 border border-slate-600 rounded-md"
                                required
                                minLength={4}
                                maxLength={6}
                                autoFocus
                             />
                        </div>
                         <div>
                             <label htmlFor="confirm-pin" className="block text-sm font-medium text-slate-300">Confirm PIN</label>
                             <input
                                id="confirm-pin"
                                type="password"
                                value={confirmPin}
                                onChange={(e) => setConfirmPin(e.target.value)}
                                className="mt-1 w-full px-4 py-3 bg-slate-700 text-slate-100 border border-slate-600 rounded-md"
                                required
                                minLength={4}
                                maxLength={6}
                             />
                        </div>
                        {error && <p className="text-red-400 text-sm">{error}</p>}
                        <div className="flex justify-end pt-2">
                             <button
                                type="submit"
                                disabled={isLoading}
                                className="px-6 py-3 bg-primary-500 text-white font-semibold rounded-lg shadow-md hover:bg-primary-600 disabled:bg-slate-500/50"
                             >
                                {isLoading ? 'Saving...' : 'Set PIN'}
                             </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export default SecuritySetupModal;

import React, { useState, useEffect } from 'react';
import { CloseIcon } from './icons/CloseIcon';
import { KeypadIcon } from './icons/KeypadIcon';

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAuthSuccess: () => void;
}

const CORRECT_PASSWORD = '753357951159';

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onAuthSuccess }) => {
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setPassword('');
            setError('');
        }
    }, [isOpen]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        
        // Simple delay to simulate processing
        setTimeout(() => {
            if (password === CORRECT_PASSWORD) {
                onAuthSuccess();
            } else {
                setError('Incorrect password. Please try again.');
                setPassword('');
            }
            setIsLoading(false);
        }, 300);
    };
    
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center p-4">
            <div
                className="bg-slate-800 rounded-xl shadow-2xl w-full max-w-sm transform transition-all animate-[fadeIn_0.2s_ease-out_forwards] scale-95"
                style={{ animation: 'fadeIn 0.2s ease-out forwards, scaleUp 0.2s ease-out forwards' }}
                onClick={e => e.stopPropagation()}
            >
                 <style>{`
                    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                    @keyframes scaleUp { from { transform: scale(0.95); } to { transform: scale(1); } }
                `}</style>
                <header className="flex justify-between items-center p-4 border-b border-slate-700">
                    <h2 className="text-xl font-bold text-slate-100">Unlock Edit Mode</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-200"><CloseIcon /></button>
                </header>
                
                <div className="p-6 text-center">
                    <form onSubmit={handleSubmit}>
                        <KeypadIcon className="mx-auto h-12 w-12 text-slate-400 mb-4" />
                        <label htmlFor="password-input" className="block text-sm font-medium text-slate-300 mb-2">Enter password to continue</label>
                        <input
                            id="password-input"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-3 text-center text-lg tracking-[0.2em] bg-slate-700 text-slate-100 border border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                            required
                            autoFocus
                        />
                        {error && <p className="text-red-400 text-sm mt-3">{error}</p>}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full mt-6 px-6 py-3 bg-primary-500 text-white font-semibold rounded-lg shadow-md hover:bg-primary-600 disabled:bg-slate-500/50 disabled:cursor-not-allowed transition-colors"
                        >
                            {isLoading ? 'Verifying...' : 'Unlock'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default AuthModal;

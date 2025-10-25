import React, { useState } from 'react';
import { supabase } from '../utils/supabase';
import { WheatIcon } from '../components/icons/WheatIcon';
import { useNotifier } from '../context/NotificationContext';

const AuthPage: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const { addNotification } = useNotifier();

    const handleAuth = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setLoading(true);
        
        const { error } = await supabase.auth.signInWithPassword({ email, password });

        if (error) {
            // Let's try to sign up the user if login fails, for convenience.
            const { error: signUpError } = await supabase.auth.signUp({ email, password });
            if (signUpError) {
                addNotification(signUpError.message, 'error');
            } else {
                addNotification('Check your email for a confirmation link to complete signup!', 'info');
            }
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-4">
            <div className="w-full max-w-sm">
                <div className="text-center mb-8">
                    <WheatIcon />
                    <h1 className="text-3xl font-bold text-slate-100 mt-2">Atta Chakki Hisab</h1>
                    <p className="text-slate-400">Sign in or create an account to continue.</p>
                </div>

                <div className="bg-slate-800 p-8 rounded-2xl shadow-2xl shadow-black/20 border border-slate-700">
                    <form onSubmit={handleAuth} className="space-y-6">
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-slate-300">
                                Email address
                            </label>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="mt-1 block w-full px-3 py-2 bg-slate-700 text-slate-100 border border-slate-600 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                            />
                        </div>

                        <div>
                            <label htmlFor="password"className="block text-sm font-medium text-slate-300">
                                Password
                            </label>
                            <input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="mt-1 block w-full px-3 py-2 bg-slate-700 text-slate-100 border border-slate-600 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                            />
                        </div>
                        
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-primary-500 disabled:bg-slate-500"
                        >
                            {loading ? 'Processing...' : 'Continue'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default AuthPage;

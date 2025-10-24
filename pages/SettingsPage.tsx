import React from 'react';
import { supabase } from '../utils/supabase';
import { CheckCircleIcon } from '../components/icons/CheckCircleIcon';
import { ExclamationCircleIcon } from '../components/icons/ExclamationCircleIcon';

const isSupabaseConfigured = !!supabase;

const SettingsPage: React.FC = () => {
    return (
        <div className="mt-4">
            <h2 className="text-2xl font-bold text-slate-700 mb-6">Sync & Backup Settings</h2>
            <div className="bg-white p-6 md:p-8 rounded-xl shadow-lg max-w-3xl mx-auto border border-amber-200/50">
                <div className="flex items-center gap-4 mb-6 pb-6 border-b border-slate-200">
                    {isSupabaseConfigured ? (
                        <CheckCircleIcon className="text-green-500 h-8 w-8" />
                    ) : (
                        <ExclamationCircleIcon className="text-amber-500 h-8 w-8" />
                    )}
                    <div>
                        <h3 className="text-lg font-bold text-slate-800">
                            {isSupabaseConfigured ? "Cloud Sync is Active" : "Offline-Only Mode"}
                        </h3>
                        <p className="text-slate-600">
                            {isSupabaseConfigured 
                                ? "Your data is being securely backed up and synced with Supabase." 
                                : "Your data is only saved locally on this device. Set up cloud sync for backup and multi-device access."}
                        </p>
                    </div>
                </div>

                {!isSupabaseConfigured && (
                    <div>
                        <h4 className="font-bold text-slate-800 text-lg mb-2">How to Enable Cloud Sync & Backup</h4>
                        <p className="text-slate-600 mb-4">
                            To protect your data and access it from anywhere, you can connect this app to a free Supabase database. It's a simple process:
                        </p>
                        <ol className="list-decimal list-inside space-y-4 text-slate-700">
                            <li>
                                <strong>Create a Supabase Project:</strong><br/>
                                Go to <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="text-amber-600 font-semibold hover:underline">supabase.com</a>, sign up for a free account, and create a new project.
                            </li>
                            <li>
                                <strong>Create the 'transactions' Table:</strong><br/>
                                In your Supabase project's SQL Editor, run the following command to create the necessary table:
                                <pre className="bg-slate-100 p-3 rounded-md text-xs font-mono my-2 overflow-x-auto">
{`CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name TEXT NOT NULL,
  item TEXT NOT NULL,
  quantity NUMERIC NOT NULL,
  rate NUMERIC NOT NULL,
  total NUMERIC NOT NULL,
  date TIMESTAMPTZ NOT NULL,
  customer_mobile TEXT,
  grinding_cost NUMERIC,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);`}
                                </pre>
                            </li>
                            <li>
                                <strong>Get Your API Credentials:</strong><br/>
                                In your Supabase project, go to "Project Settings" {'>'} "API". Find your <strong>Project URL</strong> and your <strong>`anon` public</strong> key.
                            </li>
                             <li>
                                <strong>Add Environment Variables:</strong><br/>
                                You need to set these keys as environment variables where you are hosting this app (like Vercel). Create two variables:
                                <ul className="my-2 space-y-1">
                                    <li><code className="bg-slate-200 px-1.5 py-1 rounded text-sm font-mono">SUPABASE_URL</code>: Your Project URL.</li>
                                    <li><code className="bg-slate-200 px-1.5 py-1 rounded text-sm font-mono">SUPABASE_KEY</code>: Your `anon` public key.</li>
                                </ul>
                            </li>
                            <li>
                                <strong>Redeploy:</strong><br/>
                                After setting the variables, redeploy your application. It will automatically detect the keys and enable cloud sync.
                            </li>
                        </ol>
                    </div>
                )}
                 {isSupabaseConfigured && (
                    <div>
                        <h4 className="font-bold text-slate-800 text-lg mb-2">Sync is Active!</h4>
                        <p className="text-slate-600">
                            Your app is successfully connected to your Supabase project. Any changes you make while online will be synced automatically. If you make changes while offline, they will be synced the next time you connect to the internet.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SettingsPage;

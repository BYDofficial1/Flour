import React, { useState, useEffect } from 'react';
import type { Settings, Theme } from '../types';

interface SettingsPageProps {
    currentSettings: Settings;
    onSave: (newSettings: Settings) => void;
    isEditMode: boolean;
}

const themes: { id: Theme, name: string, color: string }[] = [
    { id: 'amber', name: 'Amber', color: 'bg-amber-500' },
    { id: 'blue', name: 'Blue', color: 'bg-blue-500' },
    { id: 'green', name: 'Green', color: 'bg-green-500' },
    { id: 'slate', name: 'Slate', color: 'bg-slate-500' },
];

const SettingsPage: React.FC<SettingsPageProps> = ({ currentSettings, onSave, isEditMode }) => {
    const [settings, setSettings] = useState<Settings>(currentSettings);

    useEffect(() => {
        setSettings(currentSettings);
    }, [currentSettings]);

    const handleThemeChange = (theme: Theme) => {
        setSettings(prev => ({ ...prev, theme }));
    };

    const handleSave = () => {
        onSave(settings);
    };

    return (
        <div className="mt-4 max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold text-slate-700 mb-6">Settings</h2>

            <div className="bg-white p-6 md:p-8 rounded-xl shadow-lg border border-primary-200/50 space-y-6">
                <div>
                    <h3 className="text-lg font-semibold text-slate-800">Theme Color</h3>
                    <p className="text-sm text-slate-500 mt-1">
                        Choose the primary color for the application interface.
                    </p>

                    <fieldset className="mt-4" disabled={!isEditMode}>
                        <legend className="sr-only">Theme selection</legend>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            {themes.map((theme) => (
                                <label
                                    key={theme.id}
                                    className={`relative flex items-center justify-center p-4 rounded-lg cursor-pointer border-2 transition-all ${
                                        settings.theme === theme.id 
                                        ? 'border-primary-500 ring-2 ring-primary-500 shadow-lg' 
                                        : 'border-slate-300'
                                    } ${!isEditMode ? 'opacity-60 cursor-not-allowed' : 'hover:border-primary-400'}`}
                                >
                                    <input
                                        type="radio"
                                        name="theme-option"
                                        value={theme.id}
                                        className="sr-only"
                                        checked={settings.theme === theme.id}
                                        onChange={() => handleThemeChange(theme.id)}
                                        aria-labelledby={`${theme.id}-label`}
                                        disabled={!isEditMode}
                                    />
                                    <div className="flex items-center gap-3">
                                        <span className={`h-6 w-6 rounded-full ${theme.color} border border-black/10`}></span>
                                        <span id={`${theme.id}-label`} className="font-semibold text-slate-700">{theme.name}</span>
                                    </div>
                                     {settings.theme === theme.id && (
                                        <span className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary-500 text-white">
                                           <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                            </svg>
                                        </span>
                                    )}
                                </label>
                            ))}
                        </div>
                    </fieldset>
                </div>

                {isEditMode && (
                    <div className="pt-6 border-t border-slate-200 flex justify-end">
                        <button
                            onClick={handleSave}
                            className="px-6 py-3 bg-primary-500 text-white font-semibold rounded-lg shadow-md hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors disabled:bg-primary-400/50"
                        >
                            Save Settings
                        </button>
                    </div>
                )}
                 {!isEditMode && (
                    <div className="pt-6 border-t border-slate-200">
                        <p className="text-sm text-center text-slate-600 bg-primary-50 p-3 rounded-lg border border-primary-200">
                           Click the wheat icon in the header to enable Edit Mode and change settings.
                        </p>
                    </div>
                 )}
            </div>
        </div>
    );
};

export default SettingsPage;

import React, { useState, useEffect } from 'react';
import type { Settings } from '../types';
import { useNotifier } from '../context/NotificationContext';

interface SettingsPageProps {
    currentSettings: Settings;
    onSave: (newSettings: Settings) => void;
    isEditMode: boolean;
}

const ToggleSwitch: React.FC<{
    label: string;
    enabled: boolean;
    onChange: (enabled: boolean) => void;
    disabled: boolean;
}> = ({ label, enabled, onChange, disabled }) => (
    <div className={`flex items-center justify-between p-4 rounded-lg bg-slate-50 border ${disabled ? 'opacity-60' : ''}`}>
        <span className="font-semibold text-slate-700">{label}</span>
        <button
            type="button"
            className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${
                enabled ? 'bg-primary-500' : 'bg-slate-300'
            } ${disabled ? 'cursor-not-allowed' : 'cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500'}`}
            onClick={() => !disabled && onChange(!enabled)}
            disabled={disabled}
            aria-checked={enabled}
            role="switch"
        >
            <span
                className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${
                    enabled ? 'translate-x-6' : 'translate-x-1'
                }`}
            />
        </button>
    </div>
);


const SettingsPage: React.FC<SettingsPageProps> = ({ currentSettings, onSave, isEditMode }) => {
    const [settings, setSettings] = useState<Settings>(currentSettings);
    const { addNotification } = useNotifier();

    useEffect(() => {
        setSettings(currentSettings);
    }, [currentSettings]);
    
    const handleSettingChange = (key: keyof Settings, value: boolean) => {
        setSettings(prev => ({...prev, [key]: value}));
    }

    const handleSave = () => {
        onSave(settings);
    };

    return (
        <div className="mt-4 max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold text-slate-700 mb-6">Settings</h2>

            <div className="bg-white p-6 md:p-8 rounded-xl shadow-lg border border-primary-200/50 space-y-6">
                <div>
                    <h3 className="text-lg font-semibold text-slate-800">Notifications</h3>
                    <p className="text-sm text-slate-500 mt-1 mb-4">
                        Control how you receive alerts for transaction reminders.
                    </p>
                    
                    <div className="space-y-4">
                         <ToggleSwitch
                            label="Enable Sound Alerts"
                            enabled={settings.soundEnabled}
                            onChange={(enabled) => handleSettingChange('soundEnabled', enabled)}
                            disabled={!isEditMode}
                        />
                    </div>
                </div>

                {isEditMode && (
                    <div className="pt-6 border-t border-slate-200 flex justify-end">
                        <button
                            onClick={handleSave}
                            className="px-6 py-3 bg-primary-500 text-white font-semibold rounded-lg shadow-md hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors"
                        >
                            Save Settings
                        </button>
                    </div>
                )}
                 {!isEditMode && (
                    <div className="pt-6 border-t border-slate-200">
                        <p className="text-sm text-center text-slate-600 bg-primary-50 p-3 rounded-lg border border-primary-200">
                           Click the wheat icon in the sidebar to enable Edit Mode and change settings.
                        </p>
                    </div>
                 )}
            </div>
        </div>
    );
};

export default SettingsPage;

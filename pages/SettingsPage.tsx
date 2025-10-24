import React, { useState, useEffect } from 'react';
import type { Settings, Theme } from '../types';
import { useNotifier } from '../context/NotificationContext';
import { BellIcon } from '../components/icons/BellIcon';

interface SettingsPageProps {
    currentSettings: Settings;
    onSave: (newSettings: Settings) => void;
    notificationPermission: NotificationPermission;
    onRequestNotifications: () => void;
    isEditMode: boolean;
}

const ToggleSwitch: React.FC<{
    label: string;
    enabled: boolean;
    onChange: (enabled: boolean) => void;
    disabled: boolean;
}> = ({ label, enabled, onChange, disabled }) => (
    <div className={`flex items-center justify-between p-4 rounded-lg bg-slate-700/50 border border-slate-600 ${disabled ? 'opacity-60' : ''}`}>
        <span className="font-semibold text-slate-200">{label}</span>
        <button
            type="button"
            className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${
                enabled ? 'bg-primary-500' : 'bg-slate-400'
            } ${disabled ? 'cursor-not-allowed' : 'cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-primary-500'}`}
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

const THEMES: { name: Theme; color: string }[] = [
    { name: 'amber', color: 'bg-amber-500' },
    { name: 'blue', color: 'bg-blue-500' },
    { name: 'green', color: 'bg-green-500' },
    { name: 'slate', color: 'bg-slate-500' },
];

const SettingsPage: React.FC<SettingsPageProps> = ({ currentSettings, onSave, notificationPermission, onRequestNotifications, isEditMode }) => {
    const [settings, setSettings] = useState<Settings>(currentSettings);
    const { addNotification } = useNotifier();

    useEffect(() => {
        setSettings(currentSettings);
    }, [currentSettings]);
    
    const handleSettingChange = (key: keyof Settings, value: any) => {
        setSettings(prev => ({...prev, [key]: value}));
    }

    const handleSave = () => {
        onSave(settings);
    };

    return (
        <div className="mt-4 max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold text-slate-200 mb-6">Settings</h2>

            <div className="bg-slate-800 p-6 md:p-8 rounded-xl shadow-2xl shadow-black/20 border border-slate-700 space-y-8">
                <div>
                    <h3 className="text-lg font-semibold text-slate-100">Appearance</h3>
                    <p className="text-sm text-slate-400 mt-1 mb-4">
                        Personalize the look and feel of your app.
                    </p>
                    <div className={`p-4 rounded-lg bg-slate-700/50 border border-slate-600 ${!isEditMode ? 'opacity-60' : ''}`}>
                        <span className="font-semibold text-slate-200 mb-2 block">App Theme</span>
                        <div className="flex items-center justify-around gap-4">
                            {THEMES.map(theme => (
                                <div key={theme.name} className="flex flex-col items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => handleSettingChange('theme', theme.name)}
                                        className={`w-10 h-10 rounded-full ${theme.color} transition-all duration-200 focus:outline-none ring-offset-slate-800 ring-offset-2 ${settings.theme === theme.name ? 'ring-2 ring-white' : 'hover:ring-2 hover:ring-white/50'} ${!isEditMode ? 'cursor-not-allowed' : ''}`}
                                        aria-label={`Select ${theme.name} theme`}
                                        disabled={!isEditMode}
                                    >
                                    </button>
                                    <span className={`text-xs font-medium capitalize ${settings.theme === theme.name ? 'text-primary-400' : 'text-slate-400'}`}>{theme.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div>
                    <h3 className="text-lg font-semibold text-slate-100">Alerts & Sounds</h3>
                    <p className="text-sm text-slate-400 mt-1 mb-4">
                        Control how you receive alerts for transaction reminders.
                    </p>
                    
                    <div className="space-y-4">
                         <ToggleSwitch
                            label="Enable Sound Alerts"
                            enabled={settings.soundEnabled}
                            onChange={(enabled) => handleSettingChange('soundEnabled', enabled)}
                            disabled={!isEditMode}
                        />

                        <div className={`flex items-center justify-between p-4 rounded-lg bg-slate-700/50 border border-slate-600 ${!isEditMode ? 'opacity-60' : ''}`}>
                            <span className="font-semibold text-slate-200">Browser Notifications</span>
                            {notificationPermission === 'granted' ? (
                                <span className="text-sm font-semibold text-green-300 bg-green-500/20 px-3 py-1 rounded-full">Enabled</span>
                            ) : (
                                <button
                                    onClick={onRequestNotifications}
                                    disabled={notificationPermission === 'denied' || !isEditMode}
                                    className="px-4 py-2 text-sm font-semibold rounded-lg bg-primary-500 text-white hover:bg-primary-600 disabled:bg-slate-500 disabled:cursor-not-allowed"
                                >
                                    {notificationPermission === 'denied' ? 'Permission Denied' : 'Enable'}
                                </button>
                            )}
                        </div>
                         {notificationPermission === 'denied' && (
                            <p className="text-xs text-red-400 mt-2 px-1">
                                You have blocked notifications. To re-enable them, you must go into your browser's site settings for this page.
                            </p>
                        )}
                    </div>
                </div>

                {isEditMode && (
                    <div className="pt-6 border-t border-slate-700 flex justify-end">
                        <button
                            onClick={handleSave}
                            className="px-6 py-3 bg-primary-500 text-white font-semibold rounded-lg shadow-md hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-slate-800 transition-colors"
                        >
                            Save Settings
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SettingsPage;
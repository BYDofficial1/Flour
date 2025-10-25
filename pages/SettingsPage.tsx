import React, { useState, useEffect, useCallback } from 'react';
import type { Settings, Theme } from '../types';
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
}> = ({ label, enabled, onChange }) => (
    <div className="flex items-center justify-between p-4 rounded-lg bg-slate-700/50 border border-slate-600">
        <span className="font-semibold text-slate-200">{label}</span>
        <button
            type="button"
            className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-primary-500 ${
                enabled ? 'bg-primary-500' : 'bg-slate-400'
            }`}
            onClick={() => onChange(!enabled)}
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

const SettingsPage: React.FC<SettingsPageProps> = ({ currentSettings, onSave, isEditMode }) => {
    const { addNotification } = useNotifier();
    const [settings, setSettings] = useState<Settings>(currentSettings);
    const [notificationPermission, setNotificationPermission] = useState(Notification.permission);

    useEffect(() => {
        setSettings(currentSettings);
    }, [currentSettings]);
    
    const handleNotificationRequest = useCallback(() => {
        if (!('Notification' in window)) {
            addNotification('This browser does not support desktop notifications.', 'error');
            return;
        }

        if (notificationPermission === 'granted') {
             addNotification('Notifications are already enabled!', 'info');
             return;
        }

        if (notificationPermission === 'denied') {
            addNotification('Notifications are blocked. Please enable them in your browser settings.', 'error');
            return;
        }

        Notification.requestPermission().then(permission => {
            setNotificationPermission(permission);
            if (permission === 'granted') {
                addNotification('Notifications enabled successfully!', 'success');
                new Notification('Welcome!', { body: 'You will now receive reminders here.' });
            } else {
                addNotification('Notification permissions were not granted.', 'info');
            }
        });
    }, [notificationPermission, addNotification]);


    const handleSettingChange = (key: keyof Settings, value: any) => {
        setSettings(prev => ({ ...prev, [key]: value }));
    };

    const getPermissionButton = () => {
        switch (notificationPermission) {
            case 'granted':
                return { text: 'Permissions Granted', disabled: true, className: 'bg-green-600 text-white cursor-not-allowed' };
            case 'denied':
                return { text: 'Permissions Blocked', disabled: true, className: 'bg-red-600 text-white cursor-not-allowed' };
            default:
                return { text: 'Enable Notifications', disabled: false, className: 'bg-primary-500 text-white hover:bg-primary-600' };
        }
    };
    
    const permissionButton = getPermissionButton();

    return (
        <div className="mt-4 max-w-4xl mx-auto pb-10">
            <h2 className="text-2xl font-bold text-slate-200 mb-6">Settings</h2>

            <div className="bg-slate-800 p-6 md:p-8 rounded-xl shadow-2xl shadow-black/20 border border-slate-700 space-y-8">
                
                <div>
                    <h3 className="text-lg font-semibold text-slate-100">Appearance</h3>
                    <p className="text-sm text-slate-400 mt-1 mb-4">
                        Personalize the look and feel of your app.
                    </p>
                    <div className="p-4 rounded-lg bg-slate-700/50 border border-slate-600">
                        <span className="font-semibold text-slate-200 mb-2 block">App Theme</span>
                        <div className="flex items-center justify-around gap-4">
                            {THEMES.map(theme => (
                                <div key={theme.name} className="flex flex-col items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => handleSettingChange('theme', theme.name)}
                                        className={`w-10 h-10 rounded-full ${theme.color} transition-all duration-200 focus:outline-none ring-offset-slate-800 ring-offset-2 ${settings.theme === theme.name ? 'ring-2 ring-white' : 'hover:ring-2 hover:ring-white/50'}`}
                                        aria-label={`Select ${theme.name} theme`}
                                    >
                                    </button>
                                    <span className={`text-xs font-medium capitalize ${settings.theme === theme.name ? 'text-primary-400' : 'text-slate-400'}`}>{theme.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div>
                    <h3 className="text-lg font-semibold text-slate-100">Notifications & Sounds</h3>
                    <p className="text-sm text-slate-400 mt-1 mb-4">
                        Manage reminders and audio feedback.
                    </p>
                    
                    <div className="space-y-4">
                         <ToggleSwitch
                            label="Enable Sound Alerts"
                            enabled={settings.soundEnabled}
                            onChange={(enabled) => handleSettingChange('soundEnabled', enabled)}
                        />
                         <div className="flex items-center justify-between p-4 rounded-lg bg-slate-700/50 border border-slate-600">
                            <span className="font-semibold text-slate-200">Push Notifications</span>
                            <button
                                onClick={handleNotificationRequest}
                                disabled={permissionButton.disabled}
                                className={`px-4 py-2 text-sm font-semibold rounded-lg shadow-md transition-colors ${permissionButton.className}`}
                            >
                                {permissionButton.text}
                            </button>
                        </div>
                    </div>
                </div>

                <div className="pt-6 border-t border-slate-700 flex justify-end">
                    <button
                        onClick={() => onSave(settings)}
                        disabled={!isEditMode}
                        title={!isEditMode ? "Unlock Edit Mode to save settings" : "Save settings"}
                        className="px-6 py-3 bg-primary-500 text-white font-semibold rounded-lg shadow-md hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-slate-800 transition-colors disabled:bg-slate-500/50 disabled:cursor-not-allowed"
                    >
                        Save App Settings
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SettingsPage;
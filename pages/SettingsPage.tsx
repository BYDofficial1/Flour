import React, { useState, useEffect, useCallback } from 'react';
import type { Settings, Theme, Service } from '../types';
import { useNotifier } from '../context/NotificationContext';
import ManagementPage from './ManagementPage';

interface SettingsPageProps {
    currentSettings: Settings;
    onSave: (newSettings: Settings) => void;
    isEditMode: boolean;
    services: Service[];
    onAddService: (service: Omit<Service, 'id' | 'created_at' | 'user_id'>) => void;
    onUpdateService: (service: Service) => void;
    onDeleteService: (id: string) => void;
}

const ToggleSwitch: React.FC<{ enabled: boolean; onChange: (enabled: boolean) => void; }> = ({ enabled, onChange }) => (
    <button
        type="button"
        className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-primary-500 ${
            enabled ? 'bg-primary-500' : 'bg-slate-600'
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
);

const THEMES: { name: Theme; color: string }[] = [
    { name: 'green', color: 'bg-green-500' },
    { name: 'blue', color: 'bg-blue-500' },
    { name: 'amber', color: 'bg-amber-500' },
    { name: 'violet', color: 'bg-violet-500' },
    { name: 'rose', color: 'bg-rose-500' },
    { name: 'red', color: 'bg-red-500' },
    { name: 'indigo', color: 'bg-indigo-500' },
    { name: 'teal', color: 'bg-teal-500' },
    { name: 'cyan', color: 'bg-cyan-500' },
    { name: 'slate', color: 'bg-slate-500' },
];

const SettingsCategory: React.FC<{ title: string; description: string; children: React.ReactNode }> = ({ title, description, children }) => (
    <div>
        <h2 className="text-xl font-bold text-slate-100">{title}</h2>
        <p className="text-sm text-slate-400 mt-1">{description}</p>
        <div className="mt-4 space-y-4 rounded-xl border border-slate-700 bg-slate-800/50 p-4 sm:p-6">
            {children}
        </div>
    </div>
);

const SettingItem: React.FC<{ label: string; description?: string; children: React.ReactNode }> = ({ label, description, children }) => (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
            <h3 className="font-semibold text-slate-200">{label}</h3>
            {description && <p className="text-xs text-slate-400 mt-1 max-w-md">{description}</p>}
        </div>
        <div className="mt-3 sm:mt-0 flex-shrink-0">
            {children}
        </div>
    </div>
);


const SettingsPage: React.FC<SettingsPageProps> = ({ currentSettings, onSave, isEditMode, services, onAddService, onUpdateService, onDeleteService }) => {
    const { addNotification } = useNotifier();
    const [settings, setSettings] = useState<Settings>(currentSettings);
    const [notificationPermission, setNotificationPermission] = useState(Notification.permission);
    const [isManagementModalOpen, setIsManagementModalOpen] = useState(false);


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
                return { text: 'Permissions Granted', disabled: true, className: 'bg-green-600/50 text-white cursor-not-allowed' };
            case 'denied':
                return { text: 'Permissions Blocked', disabled: true, className: 'bg-red-600/50 text-white cursor-not-allowed' };
            default:
                return { text: 'Enable Notifications', disabled: false, className: 'bg-primary-500 text-white hover:bg-primary-600' };
        }
    };
    
    const permissionButton = getPermissionButton();

    return (
        <>
            <div className="mt-4 max-w-3xl mx-auto pb-10 px-2">
                <h1 className="text-3xl font-bold text-slate-100 mb-8">Settings</h1>

                <div className="space-y-10">
                     <SettingsCategory
                        title="General"
                        description="Basic application preferences and notifications."
                    >
                        <SettingItem 
                            label="Enable Sound Alerts"
                            description="Play a short sound for successful actions."
                        >
                            <ToggleSwitch
                                enabled={settings.soundEnabled}
                                onChange={(enabled) => handleSettingChange('soundEnabled', enabled)}
                            />
                        </SettingItem>
                         <div className="border-t border-slate-700/50" />
                        <SettingItem
                            label="Push Notifications"
                            description="Get reminders for due transactions on your device."
                        >
                             <button
                                onClick={handleNotificationRequest}
                                disabled={permissionButton.disabled}
                                className={`px-4 py-2 text-sm font-semibold rounded-lg shadow-md transition-colors ${permissionButton.className}`}
                            >
                                {permissionButton.text}
                            </button>
                        </SettingItem>
                    </SettingsCategory>
                    
                    <SettingsCategory
                        title="Appearance"
                        description="Personalize the look and feel of your app."
                    >
                        <div className="flex flex-col gap-4">
                            <span className="font-semibold text-slate-200">App Theme</span>
                            <div className="grid grid-cols-5 sm:grid-cols-10 gap-y-4 gap-x-2">
                                {THEMES.map(theme => (
                                    <div key={theme.name} className="flex flex-col items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => handleSettingChange('theme', theme.name)}
                                            className={`w-10 h-10 rounded-full ${theme.color} transition-all duration-200 focus:outline-none ring-offset-slate-800 ring-offset-2 ${settings.theme === theme.name ? 'ring-2 ring-white shadow-lg scale-110' : 'hover:ring-2 hover:ring-white/50'}`}
                                            aria-label={`Select ${theme.name} theme`}
                                        />
                                        <span className={`text-xs font-medium capitalize ${settings.theme === theme.name ? 'text-primary-400' : 'text-slate-400'}`}>{theme.name}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </SettingsCategory>
                    
                    <SettingsCategory
                        title="Service Management"
                        description="Add, edit, or remove the services and items you offer. This will update the options in the transaction form."
                    >
                         <div className="text-center">
                            <button
                                onClick={() => setIsManagementModalOpen(true)}
                                disabled={!isEditMode}
                                className="px-6 py-3 bg-slate-600 text-white font-semibold rounded-lg shadow-md hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 focus:ring-offset-slate-800 transition-colors disabled:bg-slate-700/50 disabled:text-slate-400 disabled:cursor-not-allowed"
                            >
                                Manage Services
                            </button>
                        </div>
                    </SettingsCategory>
                </div>
                
                <div className="mt-10 pt-6 border-t border-slate-700 flex justify-end">
                    <button
                        onClick={() => onSave(settings)}
                        disabled={!isEditMode}
                        title={!isEditMode ? "Unlock Edit Mode to save settings" : "Save settings"}
                        className="w-full sm:w-auto px-6 py-3 bg-primary-500 text-white font-semibold rounded-lg shadow-md hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-slate-800 transition-colors disabled:bg-slate-500/50 disabled:cursor-not-allowed"
                    >
                        Save Settings
                    </button>
                </div>
            </div>
            <ManagementPage 
                isOpen={isManagementModalOpen}
                onClose={() => setIsManagementModalOpen(false)}
                services={services}
                onAddService={onAddService}
                onUpdateService={onUpdateService}
                onDeleteService={onDeleteService}
                isEditMode={isEditMode}
            />
        </>
    );
};

export default SettingsPage;
import React from 'react';
import { MenuIcon } from './icons/MenuIcon';
import { WheatIcon } from './icons/WheatIcon';
import { WifiIcon } from './icons/WifiIcon';
import { SyncIcon } from './icons/SyncIcon';
import { ExclamationCircleIcon } from './icons/ExclamationCircleIcon';
import { LockClosedIcon } from './icons/LockClosedIcon';
import { LockOpenIcon } from './icons/LockOpenIcon';

interface HeaderProps {
    onMenuClick: () => void;
    isOnline: boolean;
    isSyncing: boolean;
    isEditMode: boolean;
    onToggleEditMode: () => void;
}

const SyncStatus: React.FC<{ isOnline: boolean; isSyncing: boolean }> = ({ isOnline, isSyncing }) => {
    if (!isOnline) {
        return (
            <div title="Offline" className="flex items-center gap-2 text-sm font-semibold text-red-400 bg-red-500/10 px-3 py-1.5 rounded-lg border border-red-500/20">
                <ExclamationCircleIcon className="h-4 w-4" />
                <span>Offline</span>
            </div>
        );
    }
    if (isSyncing) {
        return (
            <div title="Syncing data..." className="flex items-center gap-2 text-sm font-semibold text-blue-300 bg-blue-500/10 px-3 py-1.5 rounded-lg border border-blue-500/20">
                <SyncIcon className="h-4 w-4 animate-spin" />
                <span>Syncing...</span>
            </div>
        );
    }
    return (
        <div title="Online and all data synced" className="flex items-center gap-2 text-sm font-semibold text-green-300 bg-green-500/10 px-3 py-1.5 rounded-lg border border-green-500/20">
            <WifiIcon className="h-4 w-4" />
            <span>Synced</span>
        </div>
    );
};

const EditModeToggle: React.FC<{ isEditMode: boolean; onClick: () => void }> = ({ isEditMode, onClick }) => {
    return (
        <button
            onClick={onClick}
            title={isEditMode ? "Lock Edit Mode" : "Unlock Edit Mode"}
            className={`flex items-center gap-2 text-sm font-semibold px-3 py-1.5 rounded-lg border transition-colors ${
                isEditMode
                    ? 'text-primary-300 bg-primary-500/10 border-primary-500/20 hover:bg-primary-500/20'
                    : 'text-slate-300 bg-slate-700/50 border-slate-600/80 hover:bg-slate-700'
            }`}
        >
            {isEditMode ? <LockOpenIcon /> : <LockClosedIcon />}
            <span>{isEditMode ? 'ON' : 'OFF'}</span>
        </button>
    );
};


const Header: React.FC<HeaderProps> = ({ onMenuClick, isOnline, isSyncing, isEditMode, onToggleEditMode }) => {
    return (
        <header className="bg-slate-900/80 backdrop-blur-lg shadow-sm sticky top-0 z-40 border-b border-slate-700/80">
            <div className="container mx-auto px-4 md:px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button onClick={onMenuClick} className="text-slate-300 hover:text-primary-400 lg:hidden" aria-label="Open menu">
                        <MenuIcon />
                    </button>
                    <div className="flex items-center gap-3">
                        <WheatIcon />
                        <h1 className="text-xl sm:text-2xl font-bold text-slate-100 transition-colors">
                            Atta Chakki Hisab
                        </h1>
                    </div>
                     {isEditMode && (
                        <div id="edit-mode-indicator">
                            <span className="pulse-dot"></span>
                            <span>Edit Mode</span>
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-3">
                    <SyncStatus isOnline={isOnline} isSyncing={isSyncing} />
                    <EditModeToggle isEditMode={isEditMode} onClick={onToggleEditMode} />
                </div>
            </div>
        </header>
    );
};

export default Header;

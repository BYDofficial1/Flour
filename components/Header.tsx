import React from 'react';
import { MenuIcon } from './icons/MenuIcon';
import { WheatIcon } from './icons/WheatIcon';
import { SyncIcon } from './icons/SyncIcon';
import { WifiIcon } from './icons/WifiIcon';

interface HeaderProps {
    onMenuClick: () => void;
    isOnline: boolean;
    isSyncing: boolean;
    unsyncedCount: number;
    onSync: () => void;
    isSupabaseConfigured: boolean;
    isEditMode: boolean;
}

const Header: React.FC<HeaderProps> = ({ onMenuClick, isOnline, isSyncing, unsyncedCount, onSync, isSupabaseConfigured, isEditMode }) => {
    return (
        <header className="bg-slate-900/80 backdrop-blur-lg shadow-sm sticky top-0 z-40 border-b border-slate-700/80">
            <div className="container mx-auto px-4 md:px-6 py-5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button onClick={onMenuClick} className="text-slate-300 hover:text-primary-400 lg:hidden" aria-label="Open menu">
                        <MenuIcon />
                    </button>
                    <div className="flex items-center gap-3">
                        <WheatIcon isEditMode={isEditMode} />
                        <h1 className="text-xl sm:text-2xl font-bold text-slate-100 transition-colors">
                            Atta Chakki Hisab
                        </h1>
                    </div>
                </div>
                <div className="flex items-center gap-2 sm:gap-4">
                    {isSupabaseConfigured && isOnline && (
                        <button
                            onClick={onSync}
                            disabled={isSyncing}
                            className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg shadow-md transition-all text-white bg-primary-500 hover:bg-primary-600 disabled:bg-slate-500 disabled:cursor-not-allowed"
                            aria-label={isSyncing ? 'Syncing data...' : (unsyncedCount > 0 ? `Sync ${unsyncedCount} offline changes` : 'Refresh data from server')}
                            title={isSyncing ? 'Sync in progress...' : (unsyncedCount > 0 ? 'Sync local changes' : 'Check for new data from server. Sync is also automatic.')}
                        >
                             <SyncIcon className={isSyncing ? 'animate-spin' : ''} />
                             <span className="hidden sm:inline">
                                {isSyncing ? 'Syncing...' : (unsyncedCount > 0 ? `Sync (${unsyncedCount})` : 'Refresh')}
                            </span>
                        </button>
                    )}
                    
                    <div className="flex items-center gap-2" title={isOnline ? 'You are online' : 'You are offline. Changes will be synced later.'}>
                        <WifiIcon className={isOnline ? 'text-green-400' : 'text-red-500'} />
                        <span className={`text-sm font-medium hidden sm:block ${isOnline ? 'text-slate-300' : 'text-red-500 font-semibold'}`}>
                            {isOnline ? 'Online' : 'Offline'}
                        </span>
                    </div>

                    {!isSupabaseConfigured && (
                         <div className="relative group p-2" title="Supabase is not configured. The app is in offline-only mode.">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary-500" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                            </svg>
                             <span className="absolute top-1 right-1 flex h-2.5 w-2.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                            </span>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
};

export default Header;
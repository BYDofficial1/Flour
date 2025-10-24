
import React from 'react';
import { DeleteIcon } from './icons/DeleteIcon';
import { EditIcon } from './icons/EditIcon';
import { BellIcon } from './icons/BellIcon';
import { CloseIcon } from './icons/CloseIcon';

interface BulkActionBarProps {
    count: number;
    onClear: () => void;
    onDelete: () => void;
    onChangeStatus: () => void;
    onSetReminder: () => void;
}

const BulkActionBar: React.FC<BulkActionBarProps> = ({ count, onClear, onDelete, onChangeStatus, onSetReminder }) => {
    return (
        <div className="fixed bottom-0 left-0 right-0 lg:left-64 z-40 p-4 transform transition-transform translate-y-0">
            <div className="container mx-auto">
                <div className="bg-stone-800 text-white rounded-xl shadow-2xl p-3 flex items-center justify-between gap-4 animate-[slideUp_0.3s_ease-out_forwards]">
                     <style>{`
                        @keyframes slideUp { 
                            from { transform: translateY(100%); opacity: 0; } 
                            to { transform: translateY(0); opacity: 1; }
                        }
                    `}</style>
                    <div className="flex items-center gap-3">
                        <span className="text-lg font-bold bg-white text-stone-800 rounded-md px-2.5 py-0.5">{count}</span>
                        <span className="font-semibold hidden sm:inline">items selected</span>
                    </div>

                    <div className="flex items-center gap-1 sm:gap-2">
                         <button onClick={onChangeStatus} className="flex items-center gap-1.5 text-sm font-semibold p-2 sm:px-3 sm:py-2 rounded-lg hover:bg-white/10 transition-colors">
                            <EditIcon /> <span className="hidden sm:inline">Change Status</span>
                        </button>
                        <button onClick={onSetReminder} className="flex items-center gap-1.5 text-sm font-semibold p-2 sm:px-3 sm:py-2 rounded-lg hover:bg-white/10 transition-colors">
                            <BellIcon isActive={true} /> <span className="hidden sm:inline">Set Reminder</span>
                        </button>
                        <button onClick={onDelete} className="flex items-center gap-1.5 text-sm font-semibold p-2 sm:px-3 sm:py-2 rounded-lg text-red-400 hover:bg-red-500/20 transition-colors">
                            <DeleteIcon /> <span className="hidden sm:inline">Delete</span>
                        </button>
                    </div>
                    
                    <button onClick={onClear} className="p-2 rounded-full hover:bg-white/20 transition-colors" aria-label="Clear selection">
                        <CloseIcon />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BulkActionBar;

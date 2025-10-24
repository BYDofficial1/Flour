
import React from 'react';
import { CloseIcon } from './icons/CloseIcon';
import { WarningIcon } from './icons/WarningIcon';

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ isOpen, onClose, onConfirm, title, message }) => {
    if (!isOpen) return null;

    const handleConfirm = () => {
        onConfirm();
        onClose();
    };

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4"
            onClick={onClose}
        >
            <div 
                className="bg-white rounded-lg shadow-xl w-full max-w-sm transform transition-all" 
                onClick={e => e.stopPropagation()}
            >
                <div className="p-6">
                    <div className="flex items-start space-x-4">
                        <div className="flex-shrink-0 h-12 w-12 flex items-center justify-center rounded-full bg-red-100">
                           <WarningIcon />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg font-bold text-slate-800">{title}</h3>
                            <p className="text-sm text-slate-600 mt-1">{message}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-slate-50 px-6 py-3 flex justify-end items-center space-x-3 rounded-b-lg">
                    <button 
                        type="button" 
                        onClick={onClose} 
                        className="px-4 py-2 bg-slate-200 text-slate-800 rounded-md hover:bg-slate-300 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2"
                    >
                        Cancel
                    </button>
                    <button 
                        type="button" 
                        onClick={handleConfirm} 
                        className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                    >
                        Delete
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmationModal;

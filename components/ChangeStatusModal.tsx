
import React from 'react';
import type { Transaction } from '../types';
import { CloseIcon } from './icons/CloseIcon';

interface ChangeStatusModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (newStatus: Transaction['paymentStatus']) => void;
}

const ChangeStatusModal: React.FC<ChangeStatusModalProps> = ({ isOpen, onClose, onConfirm }) => {
    if (!isOpen) return null;

    const handleConfirm = (status: Transaction['paymentStatus']) => {
        onConfirm(status);
    };

    const StatusButton: React.FC<{ status: Transaction['paymentStatus'], label: string, color: string }> = ({ status, label, color }) => (
        <button
            onClick={() => handleConfirm(status)}
            className={`w-full py-3 text-base font-semibold rounded-lg shadow-md transition-all transform hover:scale-105 ${color}`}
        >
            {label}
        </button>
    );

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4"
            onClick={onClose}
        >
            <div 
                className="bg-white rounded-lg shadow-xl w-full max-w-xs transform transition-all" 
                onClick={e => e.stopPropagation()}
            >
                <div className="flex justify-between items-center p-4 border-b">
                    <h2 className="text-lg font-bold text-slate-800">Change Payment Status</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><CloseIcon /></button>
                </div>
                <div className="p-6 space-y-3">
                   <StatusButton status="paid" label="Paid" color="bg-green-500 hover:bg-green-600 text-white" />
                   <StatusButton status="unpaid" label="Unpaid" color="bg-red-500 hover:bg-red-600 text-white" />
                   <StatusButton status="partial" label="Partial" color="bg-yellow-500 hover:bg-yellow-600 text-white" />
                </div>
                <div className="bg-slate-50 px-6 py-3 flex justify-end items-center rounded-b-lg">
                     <button 
                        type="button" 
                        onClick={onClose} 
                        className="w-full px-4 py-2 bg-slate-200 text-slate-800 rounded-md hover:bg-slate-300 transition-colors"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ChangeStatusModal;

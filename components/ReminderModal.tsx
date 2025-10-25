

import React, { useState, useEffect } from 'react';
import type { Transaction } from '../types';
import { CloseIcon } from './icons/CloseIcon';
import { BellIcon } from './icons/BellIcon';

interface ReminderModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSetReminder: (transactionId: string, remindAt: Date) => void;
    transaction: Transaction | null;
}

const ReminderModal: React.FC<ReminderModalProps> = ({ isOpen, onClose, onSetReminder, transaction }) => {
    const [date, setDate] = useState('');
    const [time, setTime] = useState('');

    useEffect(() => {
        if (transaction) {
            const now = new Date();
            // Default to tomorrow at 9 AM
            now.setDate(now.getDate() + 1);
            now.setHours(9, 0, 0, 0);
            
            setDate(now.toISOString().split('T')[0]);
            setTime(now.toTimeString().substring(0, 5));
        }
    }, [transaction]);

    if (!isOpen || !transaction) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const combinedDateTime = new Date(`${date}T${time}`);
        if (isNaN(combinedDateTime.getTime())) {
            alert('Invalid date or time.');
            return;
        }
        onSetReminder(transaction.id, combinedDateTime);
        onClose();
    };

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4 transition-opacity"
            onClick={onClose}
        >
            <div 
                className="bg-slate-800 rounded-lg shadow-xl w-full max-w-sm transform transition-all" 
                onClick={e => e.stopPropagation()}
            >
                <div className="flex justify-between items-center p-4 border-b border-slate-700">
                    <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                        <BellIcon />
                        Set Reminder
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
                        <CloseIcon />
                    </button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="p-6 space-y-4">
                        <p className="text-sm text-slate-300">
                            Set a reminder for the transaction with <strong className="text-primary-400">{transaction.customer_name}</strong>.
                        </p>
                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="reminderDate" className="block text-sm font-medium text-slate-300">Date</label>
                                <input 
                                    type="date" 
                                    id="reminderDate" 
                                    value={date} 
                                    onChange={e => setDate(e.target.value)} 
                                    required 
                                    className="mt-1 block w-full px-3 py-2 bg-slate-700 text-slate-100 border border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm" 
                                />
                            </div>
                            <div>
                                <label htmlFor="reminderTime" className="block text-sm font-medium text-slate-300">Time</label>
                                <input 
                                    type="time" 
                                    id="reminderTime" 
                                    value={time} 
                                    onChange={e => setTime(e.target.value)} 
                                    required 
                                    className="mt-1 block w-full px-3 py-2 bg-slate-700 text-slate-100 border border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm" 
                                />
                            </div>
                        </div>
                    </div>
                    <div className="bg-slate-900/50 px-6 py-3 flex justify-end items-center space-x-3 rounded-b-lg">
                        <button 
                            type="button" 
                            onClick={onClose} 
                            className="px-4 py-2 bg-slate-600 text-slate-100 rounded-md hover:bg-slate-500 transition-colors"
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit" 
                            className="px-4 py-2 bg-primary-500 text-white rounded-md hover:bg-primary-600 transition-colors"
                        >
                            Set Reminder
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ReminderModal;

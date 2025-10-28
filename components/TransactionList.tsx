import React, { useState, useRef, useEffect } from 'react';
import type { Transaction, Reminder } from '../types';
import { formatCurrency } from '../utils/currency';
import { DocumentPlusIcon } from './icons/DocumentPlusIcon';
import { DotsVerticalIcon } from './icons/DotsVerticalIcon';
import { EditIcon } from './icons/EditIcon';
import { DeleteIcon } from './icons/DeleteIcon';
import { BellIcon } from './icons/BellIcon';
import { PhoneIcon } from './icons/PhoneIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { ExclamationCircleIcon } from './icons/ExclamationCircleIcon';

interface TransactionListProps {
    transactions: Transaction[];
    onEdit: (transaction: Transaction) => void;
    onDelete: (id: string) => void;
    onSetReminder: (transaction: Transaction) => void;
    reminders: Reminder[];
    isEditMode: boolean;
}

type ReminderStatus = 'due' | 'soon' | 'upcoming';

const getReminderStatus = (reminderDate: Date): { status: ReminderStatus, text: string } => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const reminderDay = new Date(reminderDate.getFullYear(), reminderDate.getMonth(), reminderDate.getDate());
    const diffTime = reminderDay.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    const timeText = reminderDate.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });

    if (reminderDate < now) {
        return { status: 'due', text: `Due ${reminderDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}` };
    }
    if (diffDays === 0) {
        return { status: 'soon', text: `Today at ${timeText}` };
    }
    if (diffDays === 1) {
        return { status: 'upcoming', text: `Tomorrow at ${timeText}` };
    }
    return { status: 'upcoming', text: `${reminderDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} at ${timeText}` };
};

const StatusBadge: React.FC<{ status: Transaction['payment_status'] | 'settled' }> = ({ status }) => {
    const baseClasses = "px-2.5 py-1 text-xs font-bold rounded-full capitalize";
    const styles = {
        paid: 'bg-green-500/20 text-green-300',
        unpaid: 'bg-red-500/20 text-red-300',
        partial: 'bg-yellow-500/20 text-yellow-300',
        settled: 'bg-blue-500/20 text-blue-300',
    };
    return <span className={`${baseClasses} ${styles[status]}`}>{status}</span>;
};

const MenuItem: React.FC<{ icon: React.ReactNode; label: string; onClick: () => void; isDestructive?: boolean }> = ({ icon, label, onClick, isDestructive }) => (
    <li>
        <button
            onClick={(e) => { e.stopPropagation(); onClick(); }}
            className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md ${
                isDestructive
                    ? 'text-red-400 hover:bg-red-500/10'
                    : 'text-slate-200 hover:bg-slate-700'
            }`}
        >
            {icon}
            <span>{label}</span>
        </button>
    </li>
);

const ActionsMenu: React.FC<{
    transaction: Transaction;
    onEdit: () => void;
    onDelete: () => void;
    onSetReminder: () => void;
    hasReminder: boolean;
}> = ({ transaction, onEdit, onDelete, onSetReminder, hasReminder }) => {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleAction = (action: () => void) => {
        action();
        setIsOpen(false);
    };

    return (
        <div className="relative" ref={menuRef}>
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(!isOpen);
                }}
                className="p-2 rounded-full text-slate-400 hover:bg-slate-700 hover:text-white transition-colors"
                aria-label="Transaction actions"
            >
                <DotsVerticalIcon />
            </button>
            {isOpen && (
                <div className="absolute top-full right-0 mt-1 w-48 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl z-10 animate-[fadeIn_0.1s_ease-out]">
                    <ul className="p-1">
                        <MenuItem icon={<EditIcon />} label="Edit" onClick={() => handleAction(onEdit)} />
                        <MenuItem icon={<BellIcon isActive={hasReminder}/>} label={hasReminder ? "Change Reminder" : "Set Reminder"} onClick={() => handleAction(onSetReminder)} />
                        <MenuItem icon={<DeleteIcon />} label="Delete" onClick={() => handleAction(onDelete)} isDestructive={true} />
                    </ul>
                </div>
            )}
        </div>
    );
};

const DetailItem: React.FC<{ label: string, value: React.ReactNode }> = ({ label, value }) => (
    <div>
        <p className="text-xs text-slate-400">{label}</p>
        <p className="text-sm font-medium text-slate-200">{value}</p>
    </div>
);


const TransactionCard: React.FC<{
    t: Transaction;
    onEdit: () => void;
    onDelete: () => void;
    onSetReminder: () => void;
    reminder: Reminder | undefined;
    isEditMode: boolean;
}> = ({ t, onEdit, onDelete, onSetReminder, reminder, isEditMode }) => {
    
    const balanceDue = t.total - (t.paid_amount || 0);
    const isGrindingService = t.item.toLowerCase().includes('grinding');
    
    const flourUsedForCosts = (t.grinding_cost_flour_kg || 0) + (t.cleaning_cost_flour_kg || 0);
    const cleaningReduction = t.cleaning_reduction_kg || 0;
    const grindingReduction = t.grinding_reduction_kg || 0;
    const flourRemaining = t.quantity - (t.flour_taken_kg || 0) - flourUsedForCosts - cleaningReduction - grindingReduction;


    const statusStyles: Record<Transaction['payment_status'] | 'settled', { border: string, bg: string }> = {
        paid: { border: 'border-l-green-500/80', bg: 'bg-gradient-to-r from-green-500/10' },
        unpaid: { border: 'border-l-red-500/80', bg: 'bg-gradient-to-r from-red-500/10' },
        partial: { border: 'border-l-yellow-500/80', bg: 'bg-gradient-to-r from-yellow-500/10' },
        settled: { border: 'border-l-blue-500/80', bg: 'bg-gradient-to-r from-blue-500/10' },
    };
    
    const cardStatus = t.is_settled ? 'settled' : t.payment_status;
    const baseClasses = `bg-slate-800 rounded-xl shadow-lg hover:shadow-primary-500/10 transition-all duration-300 overflow-hidden border-l-4`;

    const reminderInfo = reminder ? getReminderStatus(new Date(reminder.remindAt)) : null;

    const CostDisplay: React.FC<{ cash?: number, paidWithFlour?: boolean, flour?: number }> = ({ cash, paidWithFlour, flour }) => {
        const cashPart = cash ? formatCurrency(cash) : null;
        const flourPart = paidWithFlour && flour ? `${flour.toFixed(2)} kg Flour` : null;

        if (cashPart && flourPart) {
            return <span>{cashPart} <span className="text-xs text-slate-400">&</span> {flourPart}</span>;
        }
        return <>{cashPart || flourPart || formatCurrency(0)}</>;
    };

    return (
        <div className={`${baseClasses} ${statusStyles[cardStatus].border} ${statusStyles[cardStatus].bg} via-slate-800 to-slate-800`}>
            {/* Section 1: Customer, Date, Actions */}
            <div className="p-4 flex justify-between items-start gap-4">
               <div className="flex-1 min-w-0">
                    <p className="font-bold text-lg text-slate-100 truncate">{t.customer_name}</p>
                    {t.customer_mobile && (
                         <a href={`tel:${t.customer_mobile}`} className="flex items-center gap-1.5 text-base font-semibold text-slate-300 hover:text-primary-400 transition-colors w-fit mt-1">
                            <PhoneIcon className="h-4 w-4" />
                            {t.customer_mobile}
                        </a>
                    )}
                    <p className="text-sm text-slate-400 mt-1">
                        {new Date(t.date).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}
                    </p>
               </div>
                <div className="flex-shrink-0">
                    {isEditMode && (
                        <ActionsMenu
                            transaction={t}
                            onEdit={onEdit}
                            onDelete={onDelete}
                            onSetReminder={onSetReminder}
                            hasReminder={!!reminder}
                        />
                    )}
                </div>
            </div>

            {/* Section 2: Item & Cost Breakdown */}
            <div className="px-4 pb-4">
                <div className="bg-slate-700/50 p-3 rounded-lg">
                    <p className="font-semibold text-slate-100 text-base mb-2">{t.item}</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-2">
                        <DetailItem label="Quantity" value={`${t.quantity.toFixed(2)} kg`} />
                        <DetailItem label="Rate" value={`${formatCurrency(t.rate)}/kg`} />
                        <DetailItem label="Grinding" value={<CostDisplay cash={t.grinding_cost} paidWithFlour={t.paid_grinding_with_flour} flour={t.grinding_cost_flour_kg} />} />
                        <DetailItem label="Cleaning" value={<CostDisplay cash={t.cleaning_cost} paidWithFlour={t.paid_cleaning_with_flour} flour={t.cleaning_cost_flour_kg} />} />
                    </div>
                    {t.notes && <p className="text-xs italic text-slate-300 mt-3 pt-2 border-t border-slate-600/50">"{t.notes}"</p>}
                </div>
            </div>

            {isGrindingService && (
                <div className="px-4 pb-4">
                    <div className="bg-slate-700/50 p-3 rounded-lg">
                        <h4 className="text-sm font-semibold text-primary-400 mb-2">Flour Account</h4>
                        <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                                <span className="text-slate-300">Initial Wheat</span>
                                <span className="font-semibold text-slate-100">{t.quantity.toFixed(2)} kg</span>
                            </div>
                            
                            {cleaningReduction > 0 && (
                                <div className="flex justify-between text-slate-400">
                                    <span>(-) Cleaning Reduction</span>
                                    <span className="font-semibold">-{cleaningReduction.toFixed(2)} kg</span>
                                </div>
                            )}
                            {grindingReduction > 0 && (
                                <div className="flex justify-between text-slate-400">
                                    <span>(-) Grinding Reduction</span>
                                    <span className="font-semibold">-{grindingReduction.toFixed(2)} kg</span>
                                </div>
                            )}
                             {(t.flour_taken_kg || 0) > 0 && (
                                <div className="flex justify-between text-slate-400">
                                    <span>(-) Flour Taken by Customer</span>
                                    <span className="font-semibold">-{(t.flour_taken_kg || 0).toFixed(2)} kg</span>
                                </div>
                            )}
                             {flourUsedForCosts > 0 && (
                                <div className="flex justify-between text-slate-400">
                                    <span>(-) Flour for Payment</span>
                                    <span className="font-semibold">-{flourUsedForCosts.toFixed(2)} kg</span>
                                </div>
                            )}
                        </div>
                        <div className="mt-3 pt-3 border-t border-slate-600/50 flex justify-between items-baseline">
                            <span className="font-bold text-slate-200">Remaining Flour</span>
                            <span className={`font-bold text-xl ${flourRemaining >= 0 ? 'text-amber-400' : 'text-red-400'}`}>
                                {flourRemaining.toFixed(2)} kg
                            </span>
                        </div>
                    </div>
                </div>
            )}

             {reminderInfo && (
                <div className="px-4 pb-4">
                    <div className={`flex items-center gap-2 p-2 rounded-lg text-sm bg-slate-700`}>
                       <BellIcon isActive={true} status={reminderInfo.status} />
                       <span className="font-semibold text-slate-300">Reminder: {reminderInfo.text}</span>
                    </div>
                </div>
            )}

            {/* Section 3: Payment Status & Totals */}
            <div className="p-4 bg-slate-900/40 border-t border-slate-700/50 flex justify-between items-center">
                <div>
                    <StatusBadge status={cardStatus} />
                </div>
                <div className="text-right space-y-1">
                    {cardStatus !== 'paid' && cardStatus !== 'settled' && balanceDue > 0 && (
                        <div>
                            <span className="text-slate-400 text-xs">DUE: </span>
                            <span className="font-bold text-base text-red-400">{formatCurrency(balanceDue)}</span>
                        </div>
                    )}
                     <div>
                        <span className="text-slate-400 text-sm">CASH TOTAL: </span>
                        <span className="font-bold text-xl text-primary-400">{formatCurrency(t.total)}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

const TransactionList: React.FC<TransactionListProps> = ({ 
    transactions,
    onEdit,
    onDelete,
    onSetReminder,
    reminders,
    isEditMode,
}) => {
    
    if (transactions.length === 0) {
         return (
            <div className="text-center py-16 px-6 bg-slate-800 rounded-xl shadow-lg border-2 border-dashed border-slate-700">
                <DocumentPlusIcon />
                <h3 className="text-xl font-semibold text-slate-200 mt-4">No transactions found.</h3>
                <p className="text-slate-400 mt-2">Try adjusting your filters or add a new transaction.</p>
            </div>
        );
    }
    
    return (
        <div className="space-y-4">
            {transactions.map(t => (
                <TransactionCard
                    key={t.id}
                    t={t}
                    onEdit={() => onEdit(t)}
                    onDelete={() => onDelete(t.id)}
                    onSetReminder={() => onSetReminder(t)}
                    reminder={reminders.find(r => r.transactionId === t.id)}
                    isEditMode={isEditMode}
                />
            ))}
        </div>
    );
};

export default TransactionList;
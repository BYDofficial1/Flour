import React from 'react';
import type { Transaction, Reminder } from '../types';
import { formatCurrency } from '../utils/currency';
import { DocumentPlusIcon } from './icons/DocumentPlusIcon';
import { DotsVerticalIcon } from './icons/DotsVerticalIcon';
import { EditIcon } from './icons/EditIcon';
import { DeleteIcon } from './icons/DeleteIcon';
import { BellIcon } from './icons/BellIcon';
import { PhoneIcon } from './icons/PhoneIcon';
import { UserIcon } from './icons/UserIcon';
import { WheatIcon } from './icons/WheatIcon';
import { RupeeIcon } from './icons/RupeeIcon';
import { WeightIcon } from './icons/WeightIcon';

interface TransactionListProps {
    transactions: Transaction[];
    onEdit: (transaction: Transaction) => void;
    onDelete: (id: string) => void;
    onSetReminder: (transaction: Transaction) => void;
    reminders: Reminder[];
    isEditMode: boolean;
}

const getReminderStatus = (reminderDate: Date) => {
    const now = new Date();
    const diffTime = reminderDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffTime < 0) return { status: 'due', text: `Due ${reminderDate.toLocaleDateString('en-IN')}` };
    if (diffDays <= 1 && reminderDate.getDate() === now.getDate()) return { status: 'soon', text: `Today at ${reminderDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}` };
    return { status: 'upcoming', text: `On ${reminderDate.toLocaleDateString('en-IN')}` };
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

const ActionsMenu: React.FC<{
    transaction: Transaction;
    onEdit: () => void;
    onDelete: () => void;
    onSetReminder: () => void;
    hasReminder: boolean;
}> = ({ transaction, onEdit, onDelete, onSetReminder, hasReminder }) => {
    const [isOpen, setIsOpen] = React.useState(false);
    const menuRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) setIsOpen(false);
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
                onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
                className="p-2 rounded-full text-slate-400 hover:bg-slate-700 hover:text-white"
                aria-label="Transaction actions"
            >
                <DotsVerticalIcon />
            </button>
            {isOpen && (
                <div className="absolute top-full right-0 mt-1 w-48 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl z-10 p-1">
                    <ul>
                        <li><button onClick={() => handleAction(onEdit)} className="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md text-slate-200 hover:bg-slate-700"><EditIcon /> Edit</button></li>
                        <li><button onClick={() => handleAction(onSetReminder)} className="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md text-slate-200 hover:bg-slate-700"><BellIcon isActive={hasReminder}/> {hasReminder ? "Change Reminder" : "Set Reminder"}</button></li>
                        <li><button onClick={() => handleAction(onDelete)} className="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md text-red-400 hover:bg-red-500/10"><DeleteIcon /> Delete</button></li>
                    </ul>
                </div>
            )}
        </div>
    );
};

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
    const processLoss = cleaningReduction + grindingReduction;
    const flourRemaining = t.quantity - (t.flour_taken_kg || 0) - flourUsedForCosts - processLoss;

    const statusStyles: Record<Transaction['payment_status'] | 'settled', { border: string, bg: string }> = {
        paid: { border: 'border-l-green-500', bg: 'bg-gradient-to-r from-slate-800' },
        unpaid: { border: 'border-l-red-500', bg: 'bg-gradient-to-r from-slate-800' },
        partial: { border: 'border-l-yellow-500', bg: 'bg-gradient-to-r from-slate-800' },
        settled: { border: 'border-l-blue-500', bg: 'bg-gradient-to-r from-slate-800' },
    };
    
    const cardStatus = t.is_settled ? 'settled' : t.payment_status;
    const cardDate = new Date(t.date);

    return (
        <div className={`bg-slate-800 rounded-xl shadow-lg hover:shadow-primary-500/10 transition-all duration-300 overflow-hidden border-l-4 ${statusStyles[cardStatus].border} ${statusStyles[cardStatus].bg} via-slate-800 to-slate-800/90`}>
            {/* Header */}
            <div className="p-4 flex justify-between items-start gap-4">
               <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="p-1.5 bg-slate-700 rounded-full mt-1"><UserIcon /></div>
                    <div className="flex-1">
                        <p className="font-bold text-xl text-slate-100 truncate">{t.customer_name}</p>
                         {t.customer_mobile && (
                             <a href={`tel:${t.customer_mobile}`} className="flex items-center gap-1.5 text-sm font-medium text-slate-300 hover:text-primary-400 transition-colors w-fit">
                                <PhoneIcon className="h-4 w-4" />{t.customer_mobile}
                            </a>
                        )}
                        <p className="text-xs text-slate-400 mt-1">
                            {cardDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                            <span className="mx-1.5">&bull;</span>
                            {cardDate.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true })}
                        </p>
                    </div>
               </div>
                <div className="flex-shrink-0">
                    {isEditMode && <ActionsMenu transaction={t} onEdit={onEdit} onDelete={onDelete} onSetReminder={onSetReminder} hasReminder={!!reminder} />}
                </div>
            </div>

            {/* Body */}
            <div className="px-4 pb-4">
                 {isGrindingService ? (
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Flour Account */}
                        <div className="space-y-2">
                             <h4 className="flex items-center gap-2 text-base font-semibold text-primary-400"><WheatIcon />Flour Account</h4>
                             <div className="p-3 bg-slate-700/50 rounded-lg space-y-1.5 border border-slate-600/50 text-base">
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-300">Initial Wheat</span>
                                    <span className="font-bold text-slate-100">{t.quantity.toFixed(2)} kg</span>
                                </div>
                                
                                <div className="text-sm border-l-2 border-slate-600 pl-3 ml-1 space-y-1 text-slate-400 pt-1">
                                    {processLoss > 0 && <div className="flex justify-between items-center"><span>Process Loss</span> <span className="font-semibold">-{processLoss.toFixed(2)} kg</span></div>}
                                    {(t.flour_taken_kg || 0) > 0 && <div className="flex justify-between items-center"><span>Flour Taken</span> <span className="font-semibold">-{(t.flour_taken_kg || 0).toFixed(2)} kg</span></div>}
                                    {flourUsedForCosts > 0 && <div className="flex justify-between items-center"><span>Used for Costs</span> <span className="font-semibold">-{flourUsedForCosts.toFixed(2)} kg</span></div>}
                                </div>

                                <div className="!mt-2 pt-2 border-t border-slate-600 flex justify-between items-baseline">
                                    <span className="font-bold text-base text-amber-300">Remaining</span>
                                    <span className={`font-bold text-xl ${flourRemaining >= 0 ? 'text-amber-300' : 'text-red-400'}`}>{flourRemaining.toFixed(2)} kg</span>
                                </div>
                             </div>
                        </div>
                        {/* Cost Breakdown */}
                        <div className="space-y-2">
                             <h4 className="flex items-center gap-2 text-base font-semibold text-slate-200"><RupeeIcon className="h-5 w-5"/>Cost Breakdown</h4>
                             <div className="space-y-2">
                                <div className="p-3 bg-slate-700/50 rounded-lg">
                                    <p className="text-sm text-slate-400">Grinding Cost</p>
                                    <p className="font-semibold text-base text-slate-100">{formatCurrency(t.grinding_cost || 0)}{t.paid_grinding_with_flour ? ` (${t.grinding_cost_flour_kg}kg)` : ''}</p>
                                </div>
                                <div className="p-3 bg-slate-700/50 rounded-lg">
                                    <p className="text-sm text-slate-400">Cleaning Cost</p>
                                    <p className="font-semibold text-base text-slate-100">{formatCurrency(t.cleaning_cost || 0)}{t.paid_cleaning_with_flour ? ` (${t.cleaning_cost_flour_kg}kg)` : ''}</p>
                                </div>
                             </div>
                        </div>
                    </div>
                 ) : (
                    <div className="space-y-2">
                        <h4 className="flex items-center gap-2 text-base font-semibold text-slate-200">{t.item}</h4>
                         <div className="grid grid-cols-2 gap-3">
                             <div className="p-3 bg-slate-700/50 rounded-lg flex items-center gap-2"><WeightIcon className="h-5 w-5 text-blue-400"/><div><p className="text-sm text-slate-400">Quantity</p><p className="font-semibold text-base text-slate-100">{`${t.quantity.toFixed(2)} kg`}</p></div></div>
                             <div className="p-3 bg-slate-700/50 rounded-lg flex items-center gap-2"><RupeeIcon className="h-5 w-5 text-green-400"/><div><p className="text-sm text-slate-400">Rate</p><p className="font-semibold text-base text-slate-100">{`${formatCurrency(t.rate)}/kg`}</p></div></div>
                         </div>
                    </div>
                 )}
                 {t.notes && <p className="text-sm italic text-slate-300 px-1 pt-2">Note: "{t.notes}"</p>}
            </div>

             {reminder && getReminderStatus(new Date(reminder.remindAt)) && (
                <div className="px-4 pb-4">
                    <div className="flex items-center gap-2 p-2 rounded-lg text-sm bg-slate-700">
                       <BellIcon isActive={true} status={getReminderStatus(new Date(reminder.remindAt)).status} />
                       <span className="font-semibold text-slate-300">Reminder: {getReminderStatus(new Date(reminder.remindAt)).text}</span>
                    </div>
                </div>
            )}

            {/* Footer */}
            <div className="p-4 bg-slate-900/40 border-t border-slate-700/50 flex justify-between items-center">
                <div><StatusBadge status={cardStatus} /></div>
                <div className="text-right">
                     <p className="text-sm text-slate-400">Total Bill</p>
                     <p className="font-bold text-2xl text-primary-400">{formatCurrency(t.total)}</p>
                     {cardStatus !== 'paid' && cardStatus !== 'settled' && balanceDue > 0 && (
                        <p className="font-semibold text-base text-red-400">Balance Due: {formatCurrency(balanceDue)}</p>
                    )}
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
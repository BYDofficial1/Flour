
import React, { useMemo, useState } from 'react';
import type { Transaction } from '../types';
import { formatCurrency } from '../utils/currency';
import { SearchIcon } from '../components/icons/SearchIcon';
import TransactionList from '../components/TransactionList'; // Re-using this for the detail view would be complex, so building a simple list.
import { UserIcon } from '../components/icons/UserIcon';

interface Customer {
    name: string;
    mobile?: string;
    totalBusiness: number;
    totalPaid: number;
    balance: number;
    transactionCount: number;
}

interface CustomersPageProps {
    transactions: Transaction[];
}

const CustomerStatCard: React.FC<{ label: string; value: string; colorClass: string; }> = ({ label, value, colorClass }) => (
    <div className="bg-slate-800 p-4 rounded-lg">
        <p className="text-sm text-slate-400">{label}</p>
        <p className={`text-2xl font-bold ${colorClass}`}>{value}</p>
    </div>
);


const CustomersPage: React.FC<CustomersPageProps> = ({ transactions }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    
    const customers = useMemo<Customer[]>(() => {
        const customerMap: { [name: string]: Customer } = {};

        transactions.forEach(t => {
            const name = t.customerName.trim();
            if (!name) return; // Skip transactions with no customer name

            if (!customerMap[name]) {
                customerMap[name] = {
                    name,
                    mobile: t.customerMobile,
                    totalBusiness: 0,
                    totalPaid: 0,
                    balance: 0,
                    transactionCount: 0,
                };
            }

            const customer = customerMap[name];
            customer.totalBusiness += t.total;
            customer.totalPaid += t.paidAmount || (t.paymentStatus === 'paid' ? t.total : 0);
            customer.transactionCount += 1;
            // Always update mobile if a newer transaction has one
            if(t.customerMobile) customer.mobile = t.customerMobile;
        });

        Object.values(customerMap).forEach(c => {
            c.balance = c.totalBusiness - c.totalPaid;
        });

        return Object.values(customerMap).sort((a, b) => b.balance - a.balance);
    }, [transactions]);
    
    const filteredCustomers = useMemo(() => {
        if (!searchQuery) return customers;
        const lowercasedQuery = searchQuery.toLowerCase();
        return customers.filter(c => 
            c.name.toLowerCase().includes(lowercasedQuery) ||
            (c.mobile && c.mobile.includes(lowercasedQuery))
        );
    }, [customers, searchQuery]);

    const customerTransactions = useMemo(() => {
        if (!selectedCustomer) return [];
        return transactions
            .filter(t => t.customerName.trim() === selectedCustomer.name)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [selectedCustomer, transactions]);
    
    if (selectedCustomer) {
        return (
            <div className="mt-4 animate-[fadeIn_0.3s_ease-out]">
                 <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }`}</style>
                <button onClick={() => setSelectedCustomer(null)} className="mb-4 text-sm font-semibold text-primary-400 hover:text-primary-300">
                    &larr; Back to All Customers
                </button>
                <div className="bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-700 mb-6">
                    <h2 className="text-2xl font-bold text-slate-100">{selectedCustomer.name}</h2>
                    <p className="text-slate-400">{selectedCustomer.mobile}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
                        <CustomerStatCard label="Total Business" value={formatCurrency(selectedCustomer.totalBusiness)} colorClass="text-slate-100" />
                        <CustomerStatCard label="Total Paid" value={formatCurrency(selectedCustomer.totalPaid)} colorClass="text-green-400" />
                        <CustomerStatCard label="Balance Due" value={formatCurrency(selectedCustomer.balance)} colorClass={selectedCustomer.balance > 0 ? 'text-red-400' : 'text-slate-100'} />
                    </div>
                </div>

                <h3 className="text-xl font-bold text-slate-200 mb-4">Transaction History ({customerTransactions.length})</h3>
                 <div className="space-y-3">
                    {customerTransactions.map(t => {
                         const balanceDue = t.total - (t.paidAmount || 0);
                         return(
                            <div key={t.id} className="bg-slate-800 p-4 rounded-lg border border-slate-700 flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                                <div>
                                    <p className="font-semibold text-slate-200">{t.item} - {t.quantity} kg @ {formatCurrency(t.rate)}</p>
                                    <p className="text-sm text-slate-400">{new Date(t.date).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</p>
                                </div>
                                <div className="text-left sm:text-right">
                                    <p className="font-bold text-lg text-primary-400">{formatCurrency(t.total)}</p>
                                    <p className={`text-sm font-semibold capitalize ${t.paymentStatus === 'paid' ? 'text-green-400' : t.paymentStatus === 'unpaid' ? 'text-red-400' : 'text-yellow-400'}`}>
                                       {t.paymentStatus} {t.paymentStatus !== 'paid' && `(Due: ${formatCurrency(balanceDue)})`}
                                    </p>
                                </div>
                            </div>
                         )
                    })}
                 </div>
            </div>
        );
    }

    return (
        <div className="mt-4 space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <h2 className="text-2xl font-bold text-slate-200">Customers</h2>
                <div className="relative w-full sm:w-64">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                        <SearchIcon />
                    </span>
                    <input
                        type="search"
                        placeholder="Search customers..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-slate-700 text-slate-100 placeholder-slate-400 border border-slate-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-primary-500 transition-colors"
                    />
                </div>
            </div>

            {filteredCustomers.length > 0 ? (
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredCustomers.map(customer => (
                        <div key={customer.name} onClick={() => setSelectedCustomer(customer)} className="bg-slate-800 p-5 rounded-xl shadow-lg border border-slate-700 hover:border-primary-500 hover:shadow-primary-500/10 cursor-pointer transition-all duration-200">
                            <h3 className="font-bold text-lg text-slate-100 truncate">{customer.name}</h3>
                            <p className="text-sm text-slate-400">{customer.mobile || 'No mobile'}</p>
                            <div className="mt-3 pt-3 border-t border-slate-700 flex justify-between items-center">
                                <span className="text-sm text-slate-300">{customer.transactionCount} transactions</span>
                                <div>
                                    <span className="text-xs text-slate-400">Balance</span>
                                    <p className={`font-bold text-lg ${customer.balance > 0 ? 'text-red-400' : 'text-green-400'}`}>
                                        {formatCurrency(customer.balance)}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-16 px-6 bg-slate-800 rounded-xl shadow-lg border-2 border-dashed border-slate-700">
                    <div className="mx-auto bg-primary-100 p-4 rounded-full w-fit">
                        <UserIcon />
                    </div>
                    <h3 className="text-xl font-semibold text-slate-200 mt-4">No Customers Found</h3>
                    <p className="text-slate-400 mt-2">{searchQuery ? 'Try clearing your search.' : 'Add transactions with customer names to see them here.'}</p>
                </div>
            )}
           
        </div>
    );
};

export default CustomersPage;

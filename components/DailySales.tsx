import React, { useMemo } from 'react';
import type { Transaction } from '../types';
import { formatCurrency } from '../utils/currency';
import { CalendarIcon } from './icons/CalendarIcon';

interface DailySalesProps {
    transactions: Transaction[];
}

const DailySales: React.FC<DailySalesProps> = ({ transactions }) => {
    const dailyData = useMemo(() => {
        const salesByDay: Record<string, number> = {};

        transactions.forEach(t => {
            const date = new Date(t.date).toLocaleDateString('en-CA'); // YYYY-MM-DD format
            if (!salesByDay[date]) {
                salesByDay[date] = 0;
            }
            salesByDay[date] += t.total;
        });

        return Object.entries(salesByDay)
            .map(([date, total]) => ({ date, total }))
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    }, [transactions]);

    return (
        <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-lg h-full border border-slate-200/80">
            <h3 className="text-lg font-bold text-slate-800 mb-4">
                Daily Sales Breakdown
            </h3>
            {dailyData.length > 0 ? (
                <div>
                    <ul className="space-y-2 max-h-[20rem] overflow-y-auto pr-2">
                        {dailyData.map(({ date, total }) => (
                            <li key={date} className="flex justify-between items-center bg-slate-50 p-4 rounded-lg hover:bg-slate-100 transition-colors">
                                <span className="text-sm font-medium text-slate-600">
                                    {new Date(date).toLocaleDateString('en-IN', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric',
                                    })}
                                </span>
                                <span className="text-base font-bold text-slate-800">
                                    {formatCurrency(total)}
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>
            ) : (
                <div className="flex flex-col justify-center items-center h-full pb-10 text-center">
                    <CalendarIcon />
                    <h4 className="text-md font-semibold text-slate-700 mt-3">No Sales Data</h4>
                    <p className="text-slate-500 mt-1 text-sm">Your daily breakdown will show up here.</p>
                </div>
            )}
        </div>
    );
};

export default DailySales;
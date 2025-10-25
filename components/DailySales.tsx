import React, { useMemo } from 'react';
import type { Transaction } from '../types';
import { formatCurrency } from '../utils/currency';
import { ChartPieIcon } from './icons/ChartPieIcon';

interface ItemTrendsChartProps {
    transactions: Transaction[];
}

const ItemTrendsChart: React.FC<ItemTrendsChartProps> = ({ transactions }) => {
    const salesByItem = useMemo(() => {
        if (transactions.length < 1) return [];

        const itemTotals: Record<string, number> = {};
        let totalSales = 0;

        transactions.forEach(t => {
            const itemKey = t.item.trim() || 'Uncategorized';
            itemTotals[itemKey] = (itemTotals[itemKey] || 0) + t.total;
            totalSales += t.total;
        });

        if (totalSales === 0) return [];

        return Object.entries(itemTotals)
            .map(([name, sales]) => ({
                name,
                sales,
                percentage: (sales / totalSales) * 100,
            }))
            .sort((a, b) => b.sales - a.sales);
    }, [transactions]);

    const hasData = salesByItem.length > 0;
    const colors = ['bg-primary-500', 'bg-blue-500', 'bg-amber-500', 'bg-red-500', 'bg-violet-500', 'bg-slate-500'];

    return (
        <div className="bg-slate-800 p-4 sm:p-6 rounded-2xl shadow-2xl shadow-black/20 h-full border border-slate-700 flex flex-col">
            <h3 className="text-lg font-bold text-slate-100 mb-4 flex-shrink-0">
                Sales by Item
            </h3>
            <div className="flex-grow">
                {hasData ? (
                    <div className="space-y-4">
                        {salesByItem.map((item, index) => (
                            <div key={item.name} className="animate-[fadeIn_0.3s_ease-out]">
                                <div className="flex justify-between items-baseline mb-1">
                                    <span className="font-semibold text-slate-200 truncate pr-4">{item.name}</span>
                                    <span className="text-sm font-bold text-slate-100">{formatCurrency(item.sales)}</span>
                                </div>
                                <div className="relative w-full bg-slate-700 h-2 rounded-full overflow-hidden">
                                    <div
                                        className={`absolute top-0 left-0 h-full rounded-full transition-all duration-500 ${colors[index % colors.length]}`}
                                        style={{ width: `${item.percentage}%` }}
                                        title={`${item.percentage.toFixed(1)}%`}
                                    ></div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col justify-center items-center text-center h-full p-4 min-h-[250px]">
                        <ChartPieIcon />
                        <h4 className="text-md font-semibold text-slate-200 mt-3">No Sales Data</h4>
                        <p className="text-slate-400 mt-1 text-sm">Add transactions to see a breakdown of your sales by item.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ItemTrendsChart;
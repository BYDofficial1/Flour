import React, { useEffect, useRef, useMemo } from 'react';
import type { Expense } from '../types';
import { formatCurrency } from '../utils/currency';
import { ChartPieIcon } from './icons/ChartPieIcon';

declare const Chart: any;

interface ExpenseBreakdownChartProps {
    expenses: Expense[];
}

const ExpenseBreakdownChart: React.FC<ExpenseBreakdownChartProps> = ({ expenses }) => {
    const chartRef = useRef<HTMLCanvasElement>(null);
    const chartInstance = useRef<any>(null);

    const { chartData, totalExpenses, legendData } = useMemo(() => {
        if (expenses.length === 0) {
            return { chartData: { labels: [], datasets: [] }, totalExpenses: 0, legendData: [] };
        }

        // FIX: Correctly type the accumulator for the reduce function to ensure `totalsByCategory` is Record<string, number>.
        const totalsByCategory = expenses.reduce((acc, expense) => {
            const category = expense.category || 'Uncategorized';
            acc[category] = (acc[category] || 0) + expense.amount;
            return acc;
        }, {} as Record<string, number>);

        // FIX: With `totalsByCategory` correctly typed, `Object.values` returns `number[]`, so `val` is a number.
        // The explicit `Number()` cast is no longer needed.
        const currentTotal = Object.values(totalsByCategory).reduce((sum, val) => sum + val, 0);

        const sortedEntries = Object.entries(totalsByCategory).sort((a, b) => b[1] - a[1]);
        
        // Group smaller slices into 'Other' for clarity
        const mainEntries: [string, number][] = [];
        let otherTotal = 0;
        if (sortedEntries.length > 5) {
            for (let i = 0; i < sortedEntries.length; i++) {
                if (i < 5) {
                    // FIX: No cast needed as `sortedEntries[i]` is correctly inferred as `[string, number]`.
                    mainEntries.push(sortedEntries[i]);
                } else {
                    // FIX: No cast needed as `sortedEntries[i][1]` is correctly inferred as a number.
                    otherTotal += sortedEntries[i][1];
                }
            }
            if (otherTotal > 0) {
                 mainEntries.push(['Other', otherTotal]);
            }
        } else {
            // FIX: No cast needed as `sortedEntries` is correctly inferred as `[string, number][]`.
            mainEntries.push(...sortedEntries);
        }

        const computedStyle = getComputedStyle(document.documentElement);
        const colors = [
            `rgb(${computedStyle.getPropertyValue('--color-primary-500').trim()})`,
            'rgb(59, 130, 246)', // blue-500
            'rgb(245, 158, 11)',  // amber-500
            'rgb(239, 68, 68)',   // red-500
            'rgb(139, 92, 246)',  // violet-500
            'rgb(20, 184, 166)',  // teal-500
        ];

        const finalChartData = {
            labels: mainEntries.map(d => d[0]),
            datasets: [{
                data: mainEntries.map(d => d[1]),
                backgroundColor: mainEntries.map((_, i) => colors[i % colors.length]),
                borderColor: '#1e293b', // slate-800
                borderWidth: 4,
                hoverBorderColor: '#334155' // slate-700
            }]
        };

        const finalLegendData = mainEntries.map(([name, value], i) => ({
            name,
            value,
            // FIX: No casts needed as `currentTotal` and `value` are correctly typed as numbers.
            percentage: currentTotal > 0 ? ((value / currentTotal) * 100).toFixed(1) : '0.0',
            color: colors[i % colors.length]
        }));
        
        return { chartData: finalChartData, totalExpenses: currentTotal, legendData: finalLegendData };

    }, [expenses]);

    useEffect(() => {
        if (!chartRef.current) return;
        const ChartJs = (window as any).Chart;
        if (!ChartJs) return;

        if (chartInstance.current) {
            chartInstance.current.destroy();
        }
        
        if (!chartData.datasets.length || !chartData.datasets[0].data.length) {
            return;
        }

        const ctx = chartRef.current.getContext('2d');
        if (!ctx) return;
        
        chartInstance.current = new Chart(ctx, {
            type: 'doughnut',
            data: chartData,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '70%',
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        enabled: true,
                        backgroundColor: '#0f172a',
                        titleFont: { size: 14, weight: 'bold' },
                        bodyFont: { size: 12 },
                        padding: 12,
                        cornerRadius: 6,
                        callbacks: {
                            label: (context: any) => {
                                const label = context.label || '';
                                const value = context.parsed;
                                return `${label}: ${formatCurrency(value)}`;
                            }
                        }
                    }
                }
            }
        });
        
        // Cleanup on unmount
        return () => {
            if (chartInstance.current) {
                chartInstance.current.destroy();
            }
        };

    }, [chartData]);
    
    const hasData = expenses.length > 0;

    return (
        <div className="bg-slate-800 p-4 sm:p-6 rounded-2xl shadow-2xl shadow-black/20 border border-slate-700 flex flex-col">
            <h3 className="text-lg font-bold text-slate-100 mb-4 flex-shrink-0">Expense Breakdown</h3>
            {hasData ? (
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                    <div className="relative h-56 w-full max-w-[250px] mx-auto">
                        <canvas ref={chartRef}></canvas>
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                            <span className="text-slate-400 text-sm">Total Spent</span>
                            <span className="text-3xl font-bold text-slate-100 leading-tight mt-1">{formatCurrency(totalExpenses)}</span>
                        </div>
                    </div>
                    <div className="space-y-3">
                        {legendData.map(item => (
                             <div key={item.name} className="flex items-center justify-between text-sm animate-[fadeIn_0.3s_ease-out]">
                                <div className="flex items-center gap-3 truncate">
                                    <span className="h-3 w-3 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }}></span>
                                    <span className="text-slate-300 truncate">{item.name}</span>
                                </div>
                                <div className="font-semibold text-slate-100 text-right flex-shrink-0">
                                    {formatCurrency(item.value)}
                                    <span className="text-xs text-slate-400 font-normal ml-2 w-14 inline-block text-left">({item.percentage}%)</span>
                                </div>
                             </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="flex flex-col justify-center items-center text-center p-4 min-h-[250px]">
                    <ChartPieIcon />
                    <h4 className="text-md font-semibold text-slate-200 mt-3">No Expense Data</h4>
                    <p className="text-slate-400 mt-1 text-sm">Add expenses to see a category breakdown here.</p>
                </div>
            )}
        </div>
    );
};

export default ExpenseBreakdownChart;

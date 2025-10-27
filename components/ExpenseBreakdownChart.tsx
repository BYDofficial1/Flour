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

        const totalsByCategory = expenses.reduce((acc, expense) => {
            const category = expense.category || 'Uncategorized';
            // FIX: Operator '+' cannot be applied to types 'unknown' and 'unknown'.
            // Ensure expense.amount is treated as a number during the reduction.
            // FIX: Error on line 32: Operator '+' cannot be applied to types 'unknown' and 'number'.
            acc[category] = (acc[category] || 0) + Number(expense.amount);
            return acc;
        }, {} as Record<string, number>);

        // FIX: The left-hand side of an arithmetic operation must be of type 'any', 'number', 'bigint' or an enum type.
        // FIX: The right-hand side of an arithmetic operation must be of type 'any', 'number', 'bigint' or an enum type.
        // Ensure the reduced value is treated as a number.
        // FIX: Error on line 34: The left-hand side of an arithmetic operation must be of type 'any', 'number', 'bigint' or an enum type.
        // FIX: Error on line 34: The right-hand side of an arithmetic operation must be of type 'any', 'number', 'bigint' or an enum type.
        const currentTotal = Object.values(totalsByCategory).reduce((sum, val) => sum + Number(val), 0);

        const sortedEntries = Object.entries(totalsByCategory).sort((a, b) => b[1] - a[1]);
        
        // Group smaller slices into 'Other' for clarity
        const mainEntries: [string, number][] = [];
        let otherTotal = 0;
        if (sortedEntries.length > 5) {
            for (let i = 0; i < sortedEntries.length; i++) {
                if (i < 5) {
                    // FIX: Error on line 42: Argument of type '[string, unknown]' is not assignable to parameter of type '[string, number]'.
                    mainEntries.push(sortedEntries[i] as [string, number]);
                } else {
                    // FIX: Operator '+=' cannot be applied to types 'number' and 'unknown'.
                    // Ensure the value from sorted entries is treated as a number.
                    otherTotal += Number(sortedEntries[i][1]);
                }
            }
            if (otherTotal > 0) {
                 mainEntries.push(['Other', otherTotal]);
            }
        } else {
            // FIX: Error on line 53: Argument of type '[string, unknown]' is not assignable to parameter of type '[string, number]'.
            mainEntries.push(...sortedEntries as [string, number][]);
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
            // FIX: Operator '>' cannot be applied to types 'unknown' and 'number'.
            // FIX: The right-hand side of an arithmetic operation must be of type 'any', 'number', 'bigint' or an enum type.
            // Ensure currentTotal is treated as a number for comparison and division.
            percentage: Number(currentTotal) > 0 ? ((Number(value) / Number(currentTotal)) * 100).toFixed(1) : '0.0',
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
        <div className="bg-slate-800 p-4 sm:p-6 rounded-2xl shadow-2xl shadow-black/20 h-full border border-slate-700 flex flex-col">
            <h3 className="text-lg font-bold text-slate-100 mb-4 flex-shrink-0">Expense Breakdown</h3>
            {hasData ? (
                 <div className="flex-grow grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                    <div className="relative h-48 md:h-full w-full max-w-[250px] mx-auto">
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
                <div className="flex-grow flex flex-col justify-center items-center text-center p-4 min-h-[250px]">
                    <ChartPieIcon />
                    <h4 className="text-md font-semibold text-slate-200 mt-3">No Expense Data</h4>
                    <p className="text-slate-400 mt-1 text-sm">Add expenses to see a category breakdown here.</p>
                </div>
            )}
        </div>
    );
};

export default ExpenseBreakdownChart;
import React, { useEffect, useRef, useMemo } from 'react';
import type { Expense } from '../types';
import { formatCurrency } from '../utils/currency';
import { ChartPieIcon } from './icons/ChartPieIcon';

declare const Chart: any;

interface ExpenseBreakdownChartProps {
    expenses: Expense[];
}

const hexToRgba = (hex: string, alpha: number): string => {
    let r = 0, g = 0, b = 0;
    // FIX: Updated regex to handle various rgb string formats, including from CSS variables with spaces or commas.
    const match = hex.match(/(\d+)\D*(\d+)\D*(\d+)/);
    if (match) {
        r = parseInt(match[1], 10);
        g = parseInt(match[2], 10);
        b = parseInt(match[3], 10);
    }
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const ExpenseBreakdownChart: React.FC<ExpenseBreakdownChartProps> = ({ expenses }) => {
    const chartRef = useRef<HTMLCanvasElement>(null);
    const chartInstance = useRef<any>(null);

    const chartData = useMemo(() => {
        if (expenses.length === 0) {
            return { labels: [], datasets: [] };
        }

        const totalsByCategory = expenses.reduce((acc, expense) => {
            const category = expense.category || 'Uncategorized';
            acc[category] = (acc[category] || 0) + expense.amount;
            return acc;
        }, {} as Record<string, number>);

        const sortedData = Object.entries(totalsByCategory).sort((a, b) => b[1] - a[1]);
        
        const computedStyle = getComputedStyle(document.documentElement);
        const colors = [
            `rgb(${computedStyle.getPropertyValue('--color-primary-500').trim()})`,
            'rgb(59, 130, 246)', // blue-500
            'rgb(245, 158, 11)',  // amber-500
            'rgb(239, 68, 68)',   // red-500
            'rgb(139, 92, 246)',  // violet-500
            'rgb(20, 184, 166)',  // teal-500
            'rgb(100, 116, 139)', // slate-500
        ];
        
        return {
            labels: sortedData.map(d => d[0]),
            datasets: [{
                label: 'Expenses by Category',
                data: sortedData.map(d => d[1]),
                // FIX: Simplified the call to hexToRgba. The function now correctly handles parsing the full 'rgb(...)' string, preventing a runtime error.
                backgroundColor: sortedData.map((_, i) => hexToRgba(colors[i % colors.length], 0.7)),
                borderColor: '#334155', // slate-700
                borderWidth: 2,
                hoverBackgroundColor: sortedData.map((_, i) => colors[i % colors.length]),
            }]
        };

    }, [expenses]);

    useEffect(() => {
        if (!chartRef.current) return;
        const ChartJs = (window as any).Chart;
        if (!ChartJs) return;

        if (chartInstance.current) {
            chartInstance.current.destroy();
        }
        
        if (chartData.datasets.length === 0 || chartData.datasets[0].data.length === 0) {
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
                cutout: '60%',
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                           color: '#cbd5e1', // slate-300
                           boxWidth: 12,
                           padding: 15,
                        }
                    },
                    tooltip: {
                        backgroundColor: '#0f172a',
                        titleFont: { size: 14, weight: 'bold' },
                        bodyFont: { size: 12 },
                        padding: 12,
                        cornerRadius: 6,
                        callbacks: {
                            label: (context: any) => {
                                const label = context.label || '';
                                const value = context.parsed;
                                const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
                                const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                                return `${label}: ${formatCurrency(value)} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    }, [chartData]);
    
    const hasData = chartData.datasets.length > 0 && chartData.datasets[0].data.length > 0;

    return (
        <div className="bg-slate-800 p-4 sm:p-6 rounded-2xl shadow-md border border-slate-700">
            <h3 className="text-lg font-bold text-slate-100 mb-4">Expense Breakdown</h3>
            <div className="relative h-64">
                {hasData ? (
                    <canvas ref={chartRef}></canvas>
                ) : (
                    <div className="absolute inset-0 flex flex-col justify-center items-center text-center p-4">
                        <ChartPieIcon />
                        <h4 className="text-lg font-semibold text-slate-200 mt-3">No Expense Data</h4>
                        <p className="text-slate-400 mt-1 text-sm max-w-xs">
                            Add expenses in this period to see a category breakdown here.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ExpenseBreakdownChart;
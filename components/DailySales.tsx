import React, { useMemo, useRef, useEffect } from 'react';
import type { Transaction } from '../types';
import { formatCurrency } from '../utils/currency';
import { ChartPieIcon } from './icons/ChartPieIcon';

declare const Chart: any;

interface ItemBreakdownChartProps {
    transactions: Transaction[];
    itemFilter: string | null;
    setItemFilter: (item: string | null) => void;
}

// Helper to generate a color palette
const generateColors = (numColors: number): string[] => {
    const colors = [
        `rgb(${getComputedStyle(document.documentElement).getPropertyValue('--color-primary-500').trim()})`,
        '#f59e0b', // amber-500
        '#3b82f6', // blue-500
        '#ef4444', // red-500
        '#8b5cf6', // violet-500
        '#ec4899', // pink-500
        '#14b8a6', // teal-500
    ];
    // Simple repeat if more colors are needed
    const palette = [];
    for (let i = 0; i < numColors; i++) {
        palette.push(colors[i % colors.length]);
    }
    return palette;
};

const ItemBreakdownChart: React.FC<ItemBreakdownChartProps> = ({ transactions, itemFilter, setItemFilter }) => {
    const chartRef = useRef<HTMLCanvasElement>(null);
    const chartInstance = useRef<any>(null);

    const chartData = useMemo(() => {
        const salesByItem: Record<string, number> = {};
        let totalSales = 0;

        transactions.forEach(t => {
            const item = t.item || 'Uncategorized';
            if (!salesByItem[item]) {
                salesByItem[item] = 0;
            }
            salesByItem[item] += t.total;
            totalSales += t.total;
        });
        
        const sortedItems = Object.entries(salesByItem)
            .sort(([, a], [, b]) => b - a); // Sort descending by sales

        return {
            labels: sortedItems.map(([label]) => label),
            data: sortedItems.map(([, data]) => data),
            totalSales,
        };
    }, [transactions]);
    
    useEffect(() => {
        if (!chartRef.current || typeof Chart === 'undefined') return;

        if (chartData.data.length === 0) {
            if (chartInstance.current) {
                chartInstance.current.destroy();
                chartInstance.current = null;
            }
            return;
        }

        const { labels, data } = chartData;
        const ctx = chartRef.current.getContext('2d');
        if (!ctx) return;
        
        if (chartInstance.current) {
            chartInstance.current.destroy();
        }

        const backgroundColors = generateColors(labels.length);
        if (itemFilter) {
            labels.forEach((label, index) => {
                if (label !== itemFilter) {
                    backgroundColors[index] = '#475569'; // Muted color for non-filtered items
                }
            });
        }
        
        const centerTextPlugin = {
            id: 'centerText',
            afterDraw: (chart: any) => {
                const {ctx, chartArea: {top, bottom, left, right, width, height}} = chart;
                ctx.save();
                const text1 = 'Total Sales';
                const text2 = formatCurrency(chartData.totalSales);
                
                ctx.font = '600 14px Inter, sans-serif';
                ctx.fillStyle = '#94a3b8'; // slate-400
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(text1, width / 2, height / 2 + top - 8);

                ctx.font = 'bold 24px Inter, sans-serif';
                ctx.fillStyle = '#f1f5f9'; // slate-100
                ctx.fillText(text2, width / 2, height / 2 + top + 15);

                ctx.restore();
            }
        };

        chartInstance.current = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Sales',
                    data: data,
                    backgroundColor: backgroundColors,
                    borderColor: '#1e293b', // slate-800
                    borderWidth: 4,
                    hoverOffset: 8,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '70%',
                plugins: {
                    legend: {
                        position: 'bottom',
                        onClick: (e: any, legendItem: any) => {
                            const clickedLabel = legendItem.text;
                            const newItemFilter = itemFilter === clickedLabel ? null : clickedLabel;
                            setItemFilter(newItemFilter);
                        },
                        labels: {
                            color: '#cbd5e1',
                            padding: 15,
                            font: { size: 12 },
                            boxWidth: 12,
                            generateLabels: (chart: any) => {
                                const original = Chart.defaults.plugins.legend.labels.generateLabels(chart);
                                original.forEach((label: any) => {
                                    if (itemFilter && label.text !== itemFilter) {
                                        label.fontColor = '#64748b'; // slate-500
                                    }
                                });
                                return original;
                            }
                        },
                    },
                    tooltip: {
                        backgroundColor: '#0f172a',
                        callbacks: {
                            label: (context: any) => {
                                const label = context.label || '';
                                const value = context.raw || 0;
                                const percentage = chartData.totalSales > 0 ? ((value / chartData.totalSales) * 100).toFixed(1) : 0;
                                return `${label}: ${formatCurrency(value)} (${percentage}%)`;
                            }
                        }
                    }
                }
            },
            plugins: [centerTextPlugin]
        });

    }, [chartData, itemFilter, setItemFilter]);


    return (
        <div className="bg-slate-800 p-4 sm:p-6 rounded-2xl shadow-2xl shadow-black/20 h-full border border-slate-700 flex flex-col">
            <h3 className="text-lg font-bold text-slate-100 mb-4 flex-shrink-0">
                Sales by Item
            </h3>
            <div className="relative flex-grow h-64">
                {chartData.data.length > 0 ? (
                    <canvas ref={chartRef}></canvas>
                ) : (
                    <div className="absolute inset-0 flex flex-col justify-center items-center text-center p-4">
                        <ChartPieIcon />
                        <h4 className="text-md font-semibold text-slate-200 mt-3">No Sales Data</h4>
                        <p className="text-slate-400 mt-1 text-sm">Your item breakdown will show up here.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ItemBreakdownChart;
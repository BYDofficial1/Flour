import React, { useEffect, useRef, useState, useMemo } from 'react';
import type { Transaction } from '../types';
import { formatCurrency } from '../utils/currency';
import { ChartPieIcon } from './icons/ChartPieIcon';

declare const Chart: any;

interface SalesChartProps {
    transactions: Transaction[];
}

type ChartView = 'sales' | 'quantity';

const hexToRgba = (hex: string, alpha: number): string => {
    let r = 0, g = 0, b = 0;
    if (hex.length === 4) {
        r = parseInt(hex[1] + hex[1], 16);
        g = parseInt(hex[2] + hex[2], 16);
        b = parseInt(hex[3] + hex[3], 16);
    } else if (hex.length === 7) {
        r = parseInt(hex[1] + hex[2], 16);
        g = parseInt(hex[3] + hex[4], 16);
        b = parseInt(hex[5] + hex[6], 16);
    }
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const SalesChart: React.FC<SalesChartProps> = ({ transactions }) => {
    const chartRef = useRef<HTMLCanvasElement>(null);
    const chartInstance = useRef<any>(null);
    const [chartView, setChartView] = useState<ChartView>('sales');

    const chartData = useMemo(() => {
        if (transactions.length === 0) {
            return { data: [] };
        }

        const sortedTransactions = [...transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        let cumulativeSales = 0;
        let cumulativeQuantity = 0;

        const dataPoints = sortedTransactions.map(t => {
            cumulativeSales += t.total;
            cumulativeQuantity += t.quantity;
            
            return {
                x: new Date(t.date).getTime(),
                y: chartView === 'sales' ? cumulativeSales : cumulativeQuantity,
                customerName: t.customerName,
                transactionAmount: chartView === 'sales' ? t.total : t.quantity,
            };
        });

        // Add a starting point at 0 for a proper cumulative graph
        const firstTransactionDate = new Date(sortedTransactions[0].date);
        const startOfDay = new Date(firstTransactionDate.getFullYear(), firstTransactionDate.getMonth(), firstTransactionDate.getDate()).getTime();

        const startingPoint = {
            x: startOfDay,
            y: 0,
            customerName: 'Period Start',
            transactionAmount: 0
        };

        return { data: [startingPoint, ...dataPoints] };
        
    }, [transactions, chartView]);

    useEffect(() => {
        if (!chartRef.current || typeof Chart === 'undefined') return;

        if (chartData.data.length === 0) {
            if (chartInstance.current) {
                chartInstance.current.destroy();
                chartInstance.current = null;
            }
            return;
        }
        
        const computedStyle = getComputedStyle(document.documentElement);
        const primaryColor500 = `rgb(${computedStyle.getPropertyValue('--color-primary-500').trim()})`;
        
        const { data } = chartData;
        const ctx = chartRef.current.getContext('2d');
        if (!ctx) return;
        
        if (chartInstance.current) {
            chartInstance.current.destroy();
        }
        
        const gradient = ctx.createLinearGradient(0, 0, 0, 400);
        gradient.addColorStop(0, hexToRgba(primaryColor500, 0.4));
        gradient.addColorStop(1, hexToRgba(primaryColor500, 0));

        chartInstance.current = new Chart(ctx, {
            type: 'line',
            data: {
                datasets: [{
                    label: `Cumulative ${chartView === 'sales' ? 'Sales' : 'Quantity'}`,
                    data: data,
                    backgroundColor: gradient,
                    borderColor: primaryColor500,
                    borderWidth: 2,
                    pointBackgroundColor: primaryColor500,
                    pointBorderColor: '#1e293b', // slate-800
                    pointHoverRadius: 6,
                    pointRadius: 4,
                    fill: true,
                    tension: 0.1,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(100, 116, 139, 0.2)' },
                        ticks: { color: '#94a3b8' }
                    },
                    x: {
                         type: 'time',
                         time: {
                            unit: 'day',
                            tooltipFormat: 'dd MMM yyyy, HH:mm',
                            displayFormats: {
                                hour: 'HH:mm',
                                day: 'dd MMM',
                            },
                         },
                         grid: { display: false },
                         ticks: { color: '#94a3b8' }
                    }
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        align: 'end',
                        labels: {
                            color: '#cbd5e1',
                            padding: 10,
                            font: {
                                size: 13,
                                weight: '500'
                            },
                            boxWidth: 12,
                            usePointStyle: true,
                            pointStyle: 'circle',
                        }
                    },
                    tooltip: {
                        backgroundColor: '#0f172a',
                        titleFont: { size: 14, weight: 'bold' },
                        bodyFont: { size: 12 },
                        padding: 12,
                        cornerRadius: 6,
                        displayColors: false,
                        callbacks: {
                            title: function(context: any) {
                                const d = new Date(context[0].parsed.x);
                                return d.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
                            },
                            label: function() {
                                return '';
                            },
                            afterBody: function(context: any) {
                                const pointData = context[0].raw;
                                 if (pointData.customerName === 'Period Start') {
                                    return [`Cumulative: ${chartView === 'sales' ? formatCurrency(0) : '0.00 kg'}`];
                                }
                                
                                const lines = [];
                                lines.push(`Customer: ${pointData.customerName}`);
                                
                                if (chartView === 'sales') {
                                    lines.push(`Amount: ${formatCurrency(pointData.transactionAmount)}`);
                                    lines.push(`Cumulative Total: ${formatCurrency(pointData.y)}`);
                                } else {
                                    lines.push(`Amount: ${pointData.transactionAmount.toFixed(2)} kg`);
                                    lines.push(`Cumulative Total: ${pointData.y.toFixed(2)} kg`);
                                }
                                return lines;
                            }
                        }
                    }
                }
            }
        });

    }, [chartData, chartView]);

    const ToggleButton: React.FC<{
        isActive: boolean;
        onClick: () => void;
        children: React.ReactNode;
    }> = ({ isActive, onClick, children }) => (
         <button
            onClick={onClick}
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${
                isActive 
                ? 'bg-slate-600 shadow-md text-slate-100' 
                : 'text-slate-300 hover:bg-slate-600/50'
            }`}
        >
            {children}
        </button>
    )

    return (
        <div className="bg-slate-800 p-4 sm:p-6 rounded-2xl shadow-2xl shadow-black/20 border border-slate-700">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
                 <h3 className="text-lg font-bold text-slate-100">Cumulative Growth</h3>
                <div className="flex items-center space-x-1 p-1 bg-slate-700 rounded-lg">
                    <ToggleButton isActive={chartView === 'sales'} onClick={() => setChartView('sales')}>Sales (Rs)</ToggleButton>
                    <ToggleButton isActive={chartView === 'quantity'} onClick={() => setChartView('quantity')}>Quantity (kg)</ToggleButton>
                </div>
            </div>
            <div className="relative h-64 sm:h-80">
                {chartData.data.length > 0 ? (
                    <canvas ref={chartRef}></canvas>
                ) : (
                    <div className="absolute inset-0 flex flex-col justify-center items-center text-center p-4">
                        <ChartPieIcon />
                        <h4 className="text-lg font-semibold text-slate-200 mt-3">No Chart Data Yet!</h4>
                        <p className="text-slate-400 mt-1 text-sm max-w-xs">
                            Add some transactions in this period to see your sales trends appear here.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SalesChart;
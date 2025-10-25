import React, { useEffect, useRef, useState, useMemo } from 'react';
import type { Transaction } from '../types';
import { formatCurrency } from '../utils/currency';
import { ChartPieIcon } from './icons/ChartPieIcon';
import { SyncIcon } from './icons/SyncIcon';

declare const Chart: any;

interface MainChartProps {
    transactions: Transaction[];
}

type ChartView = 'sales' | 'quantity';
type Aggregation = 'daily' | 'weekly' | 'monthly';

const hexToRgba = (hex: string, alpha: number): string => {
    let r = 0, g = 0, b = 0;
    if (hex.length === 7) { // Assuming #RRGGBB
        r = parseInt(hex.substring(1, 3), 16);
        g = parseInt(hex.substring(3, 5), 16);
        b = parseInt(hex.substring(5, 7), 16);
    } else { // Fallback for rgb(r, g, b)
        const match = hex.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
        if (match) {
            r = parseInt(match[1]);
            g = parseInt(match[2]);
            b = parseInt(match[3]);
        }
    }
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const MainChart: React.FC<MainChartProps> = ({ transactions }) => {
    const chartRef = useRef<HTMLCanvasElement>(null);
    const chartInstance = useRef<any>(null);
    const [chartView, setChartView] = useState<ChartView>('sales');
    const [aggregation, setAggregation] = useState<Aggregation>('daily');
    const [libsLoaded, setLibsLoaded] = useState(false);

    useEffect(() => {
        // Check if libraries are already available
        if ((window as any).Chart && (window as any).dateFns) {
            setLibsLoaded(true);
            return;
        }

        // If not, poll for them
        const interval = setInterval(() => {
            if ((window as any).Chart && (window as any).dateFns) {
                setLibsLoaded(true);
                clearInterval(interval);
            }
        }, 100);

        return () => clearInterval(interval);
    }, []);

    const chartData = useMemo(() => {
        const dateFns = (window as any).dateFns;
        if (transactions.length === 0 || !libsLoaded || !dateFns) {
            return { labels: [], data: [] };
        }

        const aggregationMap = new Map<string, number>();

        transactions.forEach(t => {
            const date = new Date(t.date);
            let key = '';
            if (aggregation === 'daily') {
                key = dateFns.format(date, 'yyyy-MM-dd');
            } else if (aggregation === 'weekly') {
                key = dateFns.format(dateFns.startOfWeek(date, { weekStartsOn: 1 }), 'yyyy-MM-dd');
            } else { // monthly
                key = dateFns.format(dateFns.startOfMonth(date), 'yyyy-MM-01');
            }

            const value = chartView === 'sales' ? t.total : t.quantity;
            aggregationMap.set(key, (aggregationMap.get(key) || 0) + value);
        });
        
        const sortedData = Array.from(aggregationMap.entries()).sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime());
        
        let cumulativeValue = 0;
        const cumulativeData = sortedData.map(d => {
            cumulativeValue += d[1];
            return cumulativeValue;
        });

        return {
            labels: sortedData.map(d => d[0]),
            data: cumulativeData,
        };
    }, [transactions, chartView, aggregation, libsLoaded]);

    useEffect(() => {
        if (!chartRef.current || !libsLoaded) return;

        if (chartData.data.length === 0) {
            if (chartInstance.current) {
                chartInstance.current.destroy();
                chartInstance.current = null;
            }
            return;
        }
        
        const computedStyle = getComputedStyle(document.documentElement);
        const primaryColor500 = `rgb(${computedStyle.getPropertyValue('--color-primary-500').trim()})`;
        
        const { labels, data } = chartData;
        const ctx = chartRef.current.getContext('2d');
        if (!ctx) return;
        
        if (chartInstance.current) {
            chartInstance.current.destroy();
        }

        const gradient = ctx.createLinearGradient(0, 0, 0, chartRef.current.clientHeight);
        gradient.addColorStop(0, hexToRgba(primaryColor500, 0.4));
        gradient.addColorStop(1, hexToRgba(primaryColor500, 0));

        chartInstance.current = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: `Cumulative ${chartView === 'sales' ? 'Sales' : 'Quantity'}`,
                    data: data,
                    backgroundColor: gradient,
                    borderColor: primaryColor500,
                    borderWidth: 2.5,
                    tension: 0.3,
                    fill: 'start',
                    pointRadius: 0,
                    pointHitRadius: 10,
                    pointHoverRadius: 5,
                    pointHoverBackgroundColor: primaryColor500,
                    pointHoverBorderColor: '#fff',
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(100, 116, 139, 0.2)' },
                        ticks: { 
                            color: '#94a3b8',
                            callback: function(value: number) {
                                if (chartView === 'sales') {
                                    return 'Rs ' + value.toLocaleString();
                                }
                                return value.toLocaleString() + ' kg';
                            }
                        }
                    },
                    x: {
                         type: 'time',
                         time: {
                            unit: aggregation === 'daily' ? 'day' : aggregation === 'weekly' ? 'week' : 'month',
                            tooltipFormat: 'dd MMM yyyy',
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
                            boxWidth: 12,
                            padding: 20,
                            font: {
                                size: 12,
                            }
                        }
                     },
                    tooltip: {
                        backgroundColor: '#0f172a',
                        titleFont: { size: 14, weight: 'bold' },
                        bodyFont: { size: 12 },
                        padding: 12,
                        cornerRadius: 6,
                        intersect: false,
                        mode: 'index',
                        callbacks: {
                            label: function(context: any) {
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                if (context.parsed.y !== null) {
                                     if (chartView === 'sales') {
                                        label += formatCurrency(context.parsed.y);
                                    } else {
                                        label += `${context.parsed.y.toFixed(2)} kg`;
                                    }
                                }
                                return label;
                            }
                        }
                    }
                }
            }
        });

    }, [chartData, chartView, aggregation, libsLoaded]);

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
    );

    return (
        <div className="bg-slate-800 p-4 sm:p-6 rounded-2xl shadow-2xl shadow-black/20 border border-slate-700">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
                 <h3 className="text-lg font-bold text-slate-100">Cumulative Growth</h3>
                 <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center space-x-1 p-1 bg-slate-700 rounded-lg">
                        <ToggleButton isActive={aggregation === 'daily'} onClick={() => setAggregation('daily')}>Daily</ToggleButton>
                        <ToggleButton isActive={aggregation === 'weekly'} onClick={() => setAggregation('weekly')}>Weekly</ToggleButton>
                        <ToggleButton isActive={aggregation === 'monthly'} onClick={() => setAggregation('monthly')}>Monthly</ToggleButton>
                    </div>
                    <div className="flex items-center space-x-1 p-1 bg-slate-700 rounded-lg">
                        <ToggleButton isActive={chartView === 'sales'} onClick={() => setChartView('sales')}>Sales (Rs)</ToggleButton>
                        <ToggleButton isActive={chartView === 'quantity'} onClick={() => setChartView('quantity')}>Quantity (kg)</ToggleButton>
                    </div>
                </div>
            </div>
            <div className="relative h-64 sm:h-80">
                {!libsLoaded && transactions.length > 0 ? (
                    <div className="absolute inset-0 flex flex-col justify-center items-center text-center p-4">
                        <SyncIcon className="h-8 w-8 text-slate-400 animate-spin" />
                        <p className="text-slate-400 mt-2 text-sm">Loading chart libraries...</p>
                    </div>
                ) : chartData.data.length > 0 ? (
                    <canvas ref={chartRef}></canvas>
                ) : (
                    <div className="absolute inset-0 flex flex-col justify-center items-center text-center p-4">
                        <ChartPieIcon />
                        <h4 className="text-lg font-semibold text-slate-200 mt-3">No Chart Data Yet!</h4>
                        <p className="text-slate-400 mt-1 text-sm max-w-xs">
                            Add transactions in this period to see your performance overview here.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MainChart;
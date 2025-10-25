import React, { useEffect, useRef, useMemo } from 'react';
import type { Transaction } from '../types';
import { formatCurrency } from '../utils/currency';
import { ChartPieIcon } from './icons/ChartPieIcon';
import { useNotifier } from '../context/NotificationContext';

declare const Chart: any;

interface MainChartProps {
    transactions: Transaction[];
}

type ChartView = 'sales' | 'quantity';
type Aggregation = 'daily' | 'weekly' | 'monthly';

const hexToRgba = (hex: string, alpha: number): string => {
    let r = 0, g = 0, b = 0;
    const match = hex.match(/(\d+),?\s*(\d+),?\s*(\d+)/);
    if (match) {
        r = parseInt(match[1], 10);
        g = parseInt(match[2], 10);
        b = parseInt(match[3], 10);
    }
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};


const MainChart: React.FC<MainChartProps> = ({ transactions }) => {
    const chartRef = useRef<HTMLCanvasElement>(null);
    const chartInstance = useRef<any>(null);
    const [chartView, setChartView] = React.useState<ChartView>('sales');
    const [aggregation, setAggregation] = React.useState<Aggregation>('monthly');

    const chartData = useMemo(() => {
        const dateFns = (window as any).dateFns;
        if (transactions.length === 0 || !dateFns) {
            return { labels: [], datasets: [] };
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
        
        const computedStyle = getComputedStyle(document.documentElement);
        const primaryColor500 = computedStyle.getPropertyValue('--color-primary-500').trim();

        return {
            labels: sortedData.map(d => d[0]),
            datasets: [{
                label: `${aggregation === 'daily' ? 'Daily' : aggregation === 'weekly' ? 'Weekly' : 'Monthly'} ${chartView === 'sales' ? 'Sales' : 'Quantity'}`,
                data: sortedData.map(d => d[1]),
                backgroundColor: hexToRgba(primaryColor500, 0.5),
                borderColor: `rgb(${primaryColor500})`,
                borderWidth: 1.5,
                borderRadius: 4,
                hoverBackgroundColor: hexToRgba(primaryColor500, 0.8),
            }]
        };

    }, [transactions, chartView, aggregation]);

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
            type: 'bar',
            data: chartData,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(100, 116, 139, 0.2)' },
                        ticks: { 
                            color: '#94a3b8',
                            callback: (value: number) => chartView === 'sales' ? formatCurrency(value) : `${value} kg`,
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
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: '#0f172a',
                        titleFont: { size: 14, weight: 'bold' },
                        bodyFont: { size: 12 },
                        padding: 12,
                        cornerRadius: 6,
                        intersect: false,
                        mode: 'index',
                        callbacks: {
                            label: (context: any) => {
                                const value = context.parsed.y;
                                if (chartView === 'sales') {
                                    return `Sales: ${formatCurrency(value)}`;
                                }
                                return `Quantity: ${value.toFixed(2)} kg`;
                            }
                        }
                    }
                }
            }
        });

    }, [chartData, chartView]);

    const ToggleButton: React.FC<{ isActive: boolean; onClick: () => void; children: React.ReactNode; }> = ({ isActive, onClick, children }) => (
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

    const hasData = chartData.datasets.length > 0 && chartData.datasets[0].data.length > 0;

    return (
        <div className="bg-slate-800 p-4 sm:p-6 rounded-2xl shadow-2xl shadow-black/20 border border-slate-700">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
                 <h3 className="text-lg font-bold text-slate-100">Performance Overview</h3>
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
                {hasData ? (
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
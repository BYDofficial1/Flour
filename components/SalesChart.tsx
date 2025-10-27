import React, { useEffect, useRef, useMemo } from 'react';
import type { Transaction } from '../types';
import { formatCurrency } from '../utils/currency';
import { ChartPieIcon } from './icons/ChartPieIcon';

declare const Chart: any;

interface MainChartProps {
    transactions: Transaction[];
}

type ChartView = 'sales' | 'quantity';

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

    const chartData = useMemo(() => {
        const dateFns = (window as any).dateFns;
        if (transactions.length === 0 || !dateFns) {
            return { labels: [], datasets: [] };
        }

        // Group transactions by day and sum the values
        const dailyTotals: Record<string, number> = transactions.reduce((acc, t) => {
            const day = dateFns.format(new Date(t.date), 'yyyy-MM-dd');
            const value = chartView === 'sales' ? t.total : t.quantity;
            if (typeof value === 'number' && !isNaN(value)) {
                acc[day] = (acc[day] || 0) + value;
            }
            return acc;
        }, {} as Record<string, number>);

        const sortedDays = Object.keys(dailyTotals).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

        const dataPoints = sortedDays.map(day => ({
            x: dateFns.parse(day, 'yyyy-MM-dd', new Date()),
            y: dailyTotals[day]
        }));
        
        const computedStyle = getComputedStyle(document.documentElement);
        const primaryColor500 = computedStyle.getPropertyValue('--color-primary-500').trim();

        return {
            datasets: [{
                label: `Daily ${chartView === 'sales' ? 'Sales' : 'Quantity'}`,
                data: dataPoints,
                backgroundColor: hexToRgba(primaryColor500, 0.6),
                borderColor: `rgb(${primaryColor500})`,
                borderWidth: 1,
                borderRadius: 4,
                barPercentage: 0.7,
                categoryPercentage: 0.8,
            }]
        };

    }, [transactions, chartView]);

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
                            unit: 'day',
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
                                    return `Total Sales: ${formatCurrency(value)}`;
                                }
                                return `Total Quantity: ${value.toFixed(2)} kg`;
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
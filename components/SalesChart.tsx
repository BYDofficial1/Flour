import React, { useEffect, useRef, useState, useMemo } from 'react';
import type { Transaction } from '../types';
import { formatCurrency } from '../utils/currency';
import { ChartPieIcon } from './icons/ChartPieIcon';

declare const Chart: any;

interface SalesChartProps {
    transactions: Transaction[];
}

type ChartView = 'sales' | 'quantity';

const SalesChart: React.FC<SalesChartProps> = ({ transactions }) => {
    const chartRef = useRef<HTMLCanvasElement>(null);
    const chartInstance = useRef<any>(null);
    const [chartView, setChartView] = useState<ChartView>('sales');

    const chartData = useMemo(() => {
        if (transactions.length === 0) {
            return { labels: [], primaryData: [], fullDataForTooltip: [] };
        }

        const dataByDate = transactions.reduce((acc, t) => {
            const date = new Date(t.date).toLocaleDateString('en-CA'); // YYYY-MM-DD format
            if (!acc[date]) {
                acc[date] = { sales: 0, quantity: 0 };
            }
            acc[date].sales += t.total;
            acc[date].quantity += t.quantity;
            return acc;
        }, {} as Record<string, { sales: number, quantity: number }>);

        const sortedDates = Object.keys(dataByDate).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
        
        const labels = sortedDates.map(date => new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }));
        
        let cumulativeSales = 0;
        let cumulativeQuantity = 0;
        const fullDataForTooltip = sortedDates.map(date => {
            const daily = dataByDate[date];
            cumulativeSales += daily.sales;
            cumulativeQuantity += daily.quantity;
            return {
                fullDate: new Date(date).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' }),
                dailySales: daily.sales,
                dailyQuantity: daily.quantity,
                cumulativeSales,
                cumulativeQuantity,
            };
        });

        const cumulativeData = fullDataForTooltip.map(data => data[chartView === 'sales' ? 'cumulativeSales' : 'cumulativeQuantity']);
        
        return { 
            labels: ['', ...labels], 
            primaryData: [0, ...cumulativeData],
            // Add a null entry at the start to align indices for tooltips
            fullDataForTooltip: [null, ...fullDataForTooltip] 
        };
        
    }, [transactions, chartView]);

    useEffect(() => {
        if (!chartRef.current || typeof Chart === 'undefined') return;

        if (chartData.primaryData.length === 0) {
            if (chartInstance.current) {
                chartInstance.current.destroy();
                chartInstance.current = null;
            }
            return;
        }

        const { labels, primaryData, fullDataForTooltip } = chartData;
        const ctx = chartRef.current.getContext('2d');
        if (!ctx) return;
        
        if (chartInstance.current) {
            chartInstance.current.destroy();
        }
        
        const gradient = ctx.createLinearGradient(0, 0, 0, 400);
        gradient.addColorStop(0, 'rgba(217, 119, 6, 0.6)'); // amber-600
        gradient.addColorStop(1, 'rgba(217, 119, 6, 0)');

        chartInstance.current = new Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets: [{
                    label: `Cumulative ${chartView === 'sales' ? 'Sales' : 'Quantity'}`,
                    data: primaryData,
                    backgroundColor: gradient,
                    borderColor: '#d97706', // amber-600
                    borderWidth: 2,
                    pointBackgroundColor: '#d97706',
                    pointBorderColor: '#fff',
                    pointHoverRadius: 6,
                    pointRadius: 4,
                    fill: true,
                    tension: 0.4,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: '#f3f4f6' },
                        ticks: { color: '#64748b' }
                    },
                    x: {
                         grid: { display: false },
                         ticks: { color: '#64748b' }
                    }
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        align: 'end',
                        labels: {
                            color: '#475569',
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
                        backgroundColor: '#1e293b',
                        titleFont: { size: 14, weight: 'bold' },
                        bodyFont: { size: 12 },
                        padding: 12,
                        cornerRadius: 6,
                        displayColors: false,
                        callbacks: {
                            title: function(context: any) {
                                const index = context[0].dataIndex;
                                const pointData = fullDataForTooltip[index];
                                if (!pointData) return 'Period Start';
                                return pointData.fullDate;
                            },
                            label: function() {
                                // We use afterBody for multi-line content, so this can be empty.
                                return '';
                            },
                            afterBody: function(context: any) {
                                const index = context[0].dataIndex;
                                const pointData = fullDataForTooltip[index];
                                
                                let sales, quantity;

                                if (!pointData) {
                                    // This is the starting point (0) for the cumulative chart.
                                    sales = 0;
                                    quantity = 0;
                                } else {
                                    sales = pointData.cumulativeSales;
                                    quantity = pointData.cumulativeQuantity;
                                }

                                const salesLine = `Sales: ${formatCurrency(sales)}`;
                                const quantityLine = `Quantity: ${quantity.toFixed(2)} kg`;
                                
                                return ["", salesLine, quantityLine]; // Prepend newline for spacing
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
            className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${
                isActive 
                ? 'bg-amber-500 text-white shadow-sm' 
                : 'text-slate-600 hover:bg-slate-200'
            }`}
        >
            {children}
        </button>
    )

    return (
        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-lg border border-amber-200/50">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
                 <h3 className="text-lg font-bold text-slate-800">Cumulative Growth</h3>
                <div className="flex items-center space-x-1 p-1 bg-slate-100 rounded-lg">
                    <ToggleButton isActive={chartView === 'sales'} onClick={() => setChartView('sales')}>Sales (Rs)</ToggleButton>
                    <ToggleButton isActive={chartView === 'quantity'} onClick={() => setChartView('quantity')}>Quantity (kg)</ToggleButton>
                </div>
            </div>
            <div className="relative h-64 sm:h-80">
                {chartData.primaryData.length > 0 ? (
                    <canvas ref={chartRef}></canvas>
                ) : (
                    <div className="absolute inset-0 flex flex-col justify-center items-center text-center p-4">
                        <ChartPieIcon />
                        <h4 className="text-lg font-semibold text-slate-700 mt-3">No Chart Data Yet!</h4>
                        <p className="text-slate-500 mt-1 text-sm max-w-xs">
                            Add some transactions in this period to see your sales trends appear here.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SalesChart;

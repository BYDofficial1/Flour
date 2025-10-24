


import React from 'react';
import type { TimeFilter, TimePeriod } from '../App';

interface TimeFilterButtonProps {
    period: TimePeriod;
    label: string;
    activePeriod: TimePeriod;
    setPeriod: (period: TimePeriod) => void;
}

const TimeFilterButton: React.FC<TimeFilterButtonProps> = ({ period, label, activePeriod, setPeriod }) => (
    <button
        onClick={() => setPeriod(period)}
        className={`px-3 sm:px-4 py-2 text-sm font-semibold rounded-md transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-800 ${
            activePeriod === period
                ? 'bg-primary-600 text-white shadow-md'
                : 'text-slate-300 hover:bg-slate-700'
        }`}
    >
        {label}
    </button>
);


interface TimeFilterControlsProps {
    timeFilter: TimeFilter;
    setTimeFilter: (filter: TimeFilter) => void;
    isPrimary?: boolean; // To style it differently if needed
}

const TimeFilterControls: React.FC<TimeFilterControlsProps> = ({ timeFilter, setTimeFilter, isPrimary = true }) => {
    
    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'start' | 'end') => {
        const newDate = e.target.value;
        if (type === 'start') {
            setTimeFilter({ period: 'custom', startDate: newDate, endDate: timeFilter.endDate });
        } else {
            setTimeFilter({ period: 'custom', startDate: timeFilter.startDate, endDate: newDate });
        }
    };

    const handlePeriodChange = (p: TimePeriod) => {
        setTimeFilter({ period: p, startDate: timeFilter.startDate, endDate: timeFilter.endDate });
    }

    return (
        <div className="w-full">
            <div className={`flex items-center space-x-1 p-1 ${isPrimary ? 'bg-slate-800' : 'bg-slate-700/50 border border-slate-700'} rounded-lg justify-center md:justify-end`}>
                <TimeFilterButton period="today" label="Today" activePeriod={timeFilter.period} setPeriod={handlePeriodChange} />
                <TimeFilterButton period="week" label="Week" activePeriod={timeFilter.period} setPeriod={handlePeriodChange} />
                <TimeFilterButton period="month" label="Month" activePeriod={timeFilter.period} setPeriod={handlePeriodChange} />
                <TimeFilterButton period="custom" label="Custom" activePeriod={timeFilter.period} setPeriod={handlePeriodChange} />
                <TimeFilterButton period="all" label="All" activePeriod={timeFilter.period} setPeriod={handlePeriodChange} />
            </div>

            {timeFilter.period === 'custom' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-800 p-4 rounded-lg shadow-md mt-4 border border-slate-700">
                    <div>
                        <label htmlFor="startDate" className="block text-sm font-medium text-slate-300">Start Date</label>
                        <input 
                            type="date" 
                            id="startDate" 
                            value={timeFilter.startDate || ''} 
                            onChange={(e) => handleDateChange(e, 'start')} 
                            className="mt-1 block w-full px-3 py-2 bg-slate-700 text-slate-100 border border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm" 
                        />
                    </div>
                     <div>
                        <label htmlFor="endDate" className="block text-sm font-medium text-slate-300">End Date</label>
                        <input 
                            type="date" 
                            id="endDate" 
                            value={timeFilter.endDate || ''} 
                            onChange={(e) => handleDateChange(e, 'end')} 
                            className="mt-1 block w-full px-3 py-2 bg-slate-700 text-slate-100 border border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm" 
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default TimeFilterControls;
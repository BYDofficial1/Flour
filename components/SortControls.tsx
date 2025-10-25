import React, { useState, useRef, useEffect } from 'react';
import type { SortKey } from '../App';
import { ArrowsUpDownIcon } from './icons/ArrowsUpDownIcon';
import { ChevronDownIcon } from './icons/ChevronDownIcon';

type SortConfig = { key: SortKey; direction: 'ascending' | 'descending' };

interface SortControlsProps {
    sortConfig: SortConfig;
    setSortConfig: (config: SortConfig) => void;
}

const SORT_OPTIONS: { label: string; config: SortConfig }[] = [
    { label: 'Newest First', config: { key: 'date', direction: 'descending' } },
    { label: 'Oldest First', config: { key: 'date', direction: 'ascending' } },
    { label: 'Customer (A-Z)', config: { key: 'customer_name', direction: 'ascending' } },
    { label: 'Customer (Z-A)', config: { key: 'customer_name', direction: 'descending' } },
    { label: 'Total (Low-High)', config: { key: 'total', direction: 'ascending' } },
    { label: 'Total (High-Low)', config: { key: 'total', direction: 'descending' } },
];

const SortControls: React.FC<SortControlsProps> = ({ sortConfig, setSortConfig }) => {
    const currentOption = SORT_OPTIONS.find(
        opt => opt.config.key === sortConfig.key && opt.config.direction === sortConfig.direction
    ) || SORT_OPTIONS[0];

    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-300 bg-slate-700 rounded-lg hover:bg-slate-600 transition-colors w-full justify-between md:w-auto focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-primary-500"
                aria-haspopup="true"
                aria-expanded={isOpen}
            >
                <div className="flex items-center gap-1.5">
                    <ArrowsUpDownIcon />
                    <span>Sort: <strong>{currentOption.label}</strong></span>
                </div>
                <ChevronDownIcon isExpanded={isOpen} />
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-20 animate-[fadeIn_0.1s_ease-out]">
                    <style>{`@keyframes fadeIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }`}</style>
                    <ul className="p-1" role="menu" aria-orientation="vertical">
                        {SORT_OPTIONS.map(option => (
                            <li key={option.label}>
                                <button
                                    onClick={() => {
                                        setSortConfig(option.config);
                                        setIsOpen(false);
                                    }}
                                    className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                                        currentOption.label === option.label
                                            ? 'bg-primary-500/90 text-white font-semibold'
                                            : 'text-slate-200 hover:bg-slate-700'
                                    }`}
                                    role="menuitem"
                                >
                                    {option.label}
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};

export default SortControls;
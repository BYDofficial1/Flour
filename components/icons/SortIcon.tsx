import React from 'react';

export const SortIcon: React.FC<{ direction: 'asc' | 'desc' | 'none' }> = ({ direction }) => {
    const iconColor = direction === 'none' ? 'text-slate-500' : 'text-primary-400';
    return (
        <span className={`inline-flex flex-col items-center justify-center ml-1.5 h-4 w-4 ${iconColor} transition-colors`}>
            <svg className="w-3 h-3 -mb-1" fill="currentColor" viewBox="0 0 10 10">
                <path d="M5 0l5 5H0L5 0z" className={`transition-opacity ${direction === 'asc' ? 'opacity-100' : 'opacity-40'}`} />
            </svg>
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 10 10">
                <path d="M5 10L0 5h10L5 10z" className={`transition-opacity ${direction === 'desc' ? 'opacity-100' : 'opacity-40'}`} />
            </svg>
        </span>
    );
};

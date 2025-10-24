
import React from 'react';

type ReminderStatus = 'due' | 'soon' | 'upcoming';

interface BellIconProps {
    isActive?: boolean;
    status?: ReminderStatus;
}

export const BellIcon: React.FC<BellIconProps> = ({ isActive = false, status }) => {
    let colorClass = "text-slate-500"; // Default color when no reminder is set

    if (isActive) {
        switch (status) {
            case 'due':
                colorClass = "text-red-500";
                break;
            case 'soon':
                colorClass = "text-yellow-500";
                break;
            case 'upcoming':
                colorClass = "text-green-500";
                break;
            default:
                colorClass = "text-green-600"; // Default for an active but non-statused reminder
                break;
        }
    }

    return (
        <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 transition-colors duration-300 ${colorClass}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            {isActive ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            )}
        </svg>
    );
};

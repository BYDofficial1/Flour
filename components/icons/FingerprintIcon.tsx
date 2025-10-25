import React from 'react';

export const FingerprintIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w.org/2000/svg" className={`h-6 w-6 ${className}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5.636 5.636a9 9 0 1012.728 0M12 3v9" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 13.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15V9.75m0 9.75a4.5 4.5 0 01-4.5-4.5M12 19.5a4.5 4.5 0 004.5-4.5" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9.75a4.5 4.s5 0 014.5 4.5" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 21a9 9 0 001.277-5.25" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 21a9 9 0 01-1.277-5.25" />
    </svg>
);

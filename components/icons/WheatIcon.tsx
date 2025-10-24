import React from 'react';

export const WheatIcon: React.FC<{ isEditMode: boolean }> = ({ isEditMode }) => (
    <svg 
        xmlns="http://www.w3.org/2000/svg" 
        className={`h-8 w-8 text-primary-500 transition-all duration-300 ${isEditMode ? 'drop-shadow-glow scale-110' : ''}`}
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="1.5" 
        strokeLinecap="round" 
        strokeLinejoin="round"
    >
        <path d="M20 12c0-2.5-2.5-6-2.5-6s-2.5 3.5-2.5 6c0 2.2-1.8 4-4 4s-4-1.8-4-4c0-2.5-2.5-6-2.5-6S4 9.5 4 12c0 4.4 3.6 8 8 8s8-3.6 8-8z" />
        <path d="M12 2v2" />
        <path d="M11 2.5a.5.5 0 0 1 1 0V4a.5.5 0 0 1-1 0z" />
        <path d="M13 2.5a.5.5 0 0 0-1 0V4a.5.5 0 0 0 1 0z" />
        <path d="M14 4.5s-1-1.5-1-3.5" />
        <path d="M10 4.5s1-1.5 1-3.5" />
    </svg>
);
import React, { useEffect, useState } from 'react';
import type { NotificationType } from '../context/NotificationContext';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { ExclamationCircleIcon } from './icons/ExclamationCircleIcon';
import { InformationCircleIcon } from './icons/InformationCircleIcon';
import { CloseIcon } from './icons/CloseIcon';

interface ToastProps {
    message: string;
    type: NotificationType;
    onClose: () => void;
}

const ICONS = {
    success: <CheckCircleIcon className="text-green-400" />,
    error: <ExclamationCircleIcon className="text-red-400" />,
    info: <InformationCircleIcon className="text-blue-400" />,
};

const BG_GRADIENTS = {
    success: 'from-green-500/10 via-slate-900 to-slate-900',
    error: 'from-red-500/10 via-slate-900 to-slate-900',
    info: 'from-blue-500/10 via-slate-900 to-slate-900',
};

const BORDER_COLORS = {
    success: 'border-green-500/50',
    error: 'border-red-500/50',
    info: 'border-blue-500/50',
};

const PROGRESS_BG = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    info: 'bg-blue-500',
};

const Toast: React.FC<ToastProps> = ({ message, type, onClose }) => {
    const [isExiting, setIsExiting] = useState(false);

    useEffect(() => {
        const exitTimer = setTimeout(() => {
            setIsExiting(true);
        }, 3500); // Start exit animation

        const closeTimer = setTimeout(() => {
            onClose();
        }, 3800); // Fully close after animation

        return () => {
            clearTimeout(exitTimer);
            clearTimeout(closeTimer);
        };
    }, [onClose]);

    return (
        <div
            className={`relative overflow-hidden flex items-start p-4 mb-3 w-full max-w-sm rounded-lg shadow-2xl shadow-black/30 border backdrop-blur-lg bg-slate-900/80 transition-all duration-300
                ${isExiting ? 'animate-[toast-out_0.3s_ease-in_forwards]' : 'animate-[toast-in_0.3s_ease-out_forwards]'}
                ${BG_GRADIENTS[type]} ${BORDER_COLORS[type]}`}
            role="alert"
        >
            <div className="flex-shrink-0 pt-0.5">{ICONS[type]}</div>
            <div className="ml-3 text-sm font-medium text-slate-200 flex-1">
                {message}
            </div>
            <button
                onClick={onClose}
                className="ml-auto -mx-1.5 -my-1.5 p-1.5 rounded-lg inline-flex h-8 w-8 text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                aria-label="Close"
            >
                <span className="sr-only">Close</span>
                <CloseIcon className="h-5 w-5"/>
            </button>
            <div 
                className={`absolute bottom-0 left-0 h-0.5 ${PROGRESS_BG[type]}`}
                style={{ animation: 'progress-bar 3.5s linear forwards' }}
            />
        </div>
    );
};

export default Toast;
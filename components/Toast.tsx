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

const BORDER_COLORS = {
    success: 'border-green-600',
    error: 'border-red-600',
    info: 'border-blue-600',
};

const BG_COLORS = {
    success: 'bg-green-900/80',
    error: 'bg-red-900/80',
    info: 'bg-blue-900/80',
};

const TEXT_COLORS = {
    success: 'text-green-200',
    error: 'text-red-200',
    info: 'text-blue-200',
};


const Toast: React.FC<ToastProps> = ({ message, type, onClose }) => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Animate in
        const enterTimeout = setTimeout(() => setIsVisible(true), 50);

        // Set timers for auto-dismiss
        const timer = setTimeout(() => {
            setIsVisible(false);
        }, 4000); // 4 seconds visible

        const closeTimer = setTimeout(() => {
            onClose();
        }, 4300); // 4.3 seconds to allow fade out

        return () => {
            clearTimeout(enterTimeout);
            clearTimeout(timer);
            clearTimeout(closeTimer);
        };
    }, [onClose]);

    return (
        <div
            className={`flex items-start p-4 mb-3 w-full max-w-sm rounded-lg shadow-lg border-l-4 backdrop-blur-sm transition-all duration-300 transform ${BG_COLORS[type]} ${BORDER_COLORS[type]} ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}`}
            role="alert"
        >
            <div className="flex-shrink-0">{ICONS[type]}</div>
            <div className={`ml-3 text-sm font-medium ${TEXT_COLORS[type]}`}>
                {message}
            </div>
            <button
                onClick={onClose}
                className={`ml-auto -mx-1.5 -my-1.5 p-1.5 rounded-lg inline-flex h-8 w-8 ${TEXT_COLORS[type]} focus:ring-2 focus:ring-offset-2 ${BG_COLORS[type]} hover:bg-black/20 transition-colors`}
                aria-label="Close"
            >
                <span className="sr-only">Close</span>
                <CloseIcon />
            </button>
        </div>
    );
};

export default Toast;
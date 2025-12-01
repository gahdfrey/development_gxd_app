'use client';

import { useEffect, useState } from 'react';
import { CheckCircleIcon, XCircleIcon, InformationCircleIcon, XMarkIcon } from '@heroicons/react/24/outline';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastProps {
    id: string;
    message: string;
    type: ToastType;
    duration?: number;
    onClose: (id: string) => void;
}

export default function Toast({ id, message, type, duration = 3000, onClose }: ToastProps) {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Trigger enter animation
        requestAnimationFrame(() => setIsVisible(true));

        const timer = setTimeout(() => {
            setIsVisible(false);
            // Wait for exit animation to finish before removing
            setTimeout(() => onClose(id), 300);
        }, duration);

        return () => clearTimeout(timer);
    }, [duration, id, onClose]);

    const handleClose = () => {
        setIsVisible(false);
        setTimeout(() => onClose(id), 300);
    };

    const icons = {
        success: <CheckCircleIcon className="w-6 h-6 text-green-500" />,
        error: <XCircleIcon className="w-6 h-6 text-red-500" />,
        info: <InformationCircleIcon className="w-6 h-6 text-blue-500" />,
    };

    const bgColors = {
        success: 'bg-white dark:bg-gray-800 border-green-100 dark:border-green-900',
        error: 'bg-white dark:bg-gray-800 border-red-100 dark:border-red-900',
        info: 'bg-white dark:bg-gray-800 border-blue-100 dark:border-blue-900',
    };

    return (
        <div
            className={`flex items-center w-full max-w-sm p-4 mb-4 text-gray-500 rounded-lg shadow-lg border ${bgColors[type]} transition-all duration-300 transform ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
                }`}
            role="alert"
        >
            <div className="inline-flex items-center justify-center shrink-0 w-8 h-8">
                {icons[type]}
            </div>
            <div className="ml-3 text-sm font-normal text-gray-800 dark:text-gray-200">{message}</div>
            <button
                type="button"
                className="ml-auto -mx-1.5 -my-1.5 bg-transparent text-gray-400 hover:text-gray-900 rounded-lg focus:ring-2 focus:ring-gray-300 p-1.5 hover:bg-gray-100 inline-flex h-8 w-8 dark:text-gray-500 dark:hover:text-white dark:bg-transparent dark:hover:bg-gray-700"
                onClick={handleClose}
                aria-label="Close"
            >
                <span className="sr-only">Close</span>
                <XMarkIcon className="w-5 h-5" />
            </button>
        </div>
    );
}

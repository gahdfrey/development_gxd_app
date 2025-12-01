'use client';

import { useMemo, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSidebar } from '@/app/contexts/SidebarContext';

interface MenuItem {
    name: string;
    icon: React.JSX.Element;
    href: string;
}

export default function SideMenu() {
    const { isExpanded, isLocked, setIsExpanded } = useSidebar();
    const pathname = usePathname();

    const menuItems: MenuItem[] = useMemo(() => [
        {
            name: 'Dashboard',
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
            ),
            href: '/dashboard',
        },
        {
            name: 'Users',
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
            ),
            href: '/users',
        }
    ], []);

    const handleMouseEnter = useCallback(() => {
        if (!isLocked) {
            setIsExpanded(true);
        }
    }, [isLocked, setIsExpanded]);

    const handleMouseLeave = useCallback(() => {
        if (!isLocked) {
            setIsExpanded(false);
        }
    }, [isLocked, setIsExpanded]);

    const isActive = useCallback((href: string) => {
        return pathname === href;
    }, [pathname]);

    return (
        <aside
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            className={`fixed left-0 top-24 bottom-0 z-40 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md rounded-r-lg border-gray-200 dark:border-gray-700 transition-all duration-400 ease-out shadow-lg  ${isExpanded ? 'w-50' : 'w-16'
                }`}
        >
            <div className="flex flex-col h-full py-4 px-2 ">
                {/* Menu Items */}
                <nav className="flex-1 space-y-1">
                    {menuItems.map((item) => {
                        const active = isActive(item.href);
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-r-lg text-sm font-medium transition-all duration-200 ${active
                                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-l-4 border-blue-600 dark:border-blue-400'
                                    : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white border-l-4 border-transparent'
                                    }`}
                                aria-current={active ? 'page' : undefined}
                            >
                                <div className="shrink-0 relative p-1">
                                    {item.icon}
                                </div>
                                <span
                                    className={`overflow-hidden whitespace-nowrap transition-all duration-300 ${isExpanded ? 'max-w-48 opacity-100' : 'max-w-0 opacity-0'
                                        }`}
                                >
                                    {item.name}
                                </span>
                                {!isExpanded && (
                                    <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none">
                                        {item.name}
                                    </div>
                                )}
                            </Link>
                        );
                    })}
                </nav>

                {/* Bottom Section */}
                <div className="pt-6 border-t border-gray-200 dark:border-gray-700 space-y-1 mt-auto">
                    <Link
                        href="/settings"
                        className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-r-lg text-sm font-medium transition-all duration-200 ${isActive('/settings')
                            ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                            : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                            }`}
                        aria-label="Settings"
                        aria-current={isActive('/settings') ? 'page' : undefined}
                    >
                        <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span
                            className={`overflow-hidden whitespace-nowrap transition-all duration-300 ${isExpanded ? 'max-w-48 opacity-100' : 'max-w-0 opacity-0'
                                }`}
                        >
                            Settings
                        </span>
                        {!isExpanded && (
                            <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none">
                                Settings
                            </div>
                        )}
                    </Link>
                    <Link
                        href="/help"
                        className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-r-lg text-sm font-medium transition-all duration-200 ${isActive('/help')
                            ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                            : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                            }`}
                        aria-label="Help"
                        aria-current={isActive('/help') ? 'page' : undefined}
                    >
                        <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span
                            className={`overflow-hidden whitespace-nowrap transition-all duration-300 ${isExpanded ? 'max-w-48 opacity-100' : 'max-w-0 opacity-0'
                                }`}
                        >
                            Help
                        </span>
                        {!isExpanded && (
                            <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none">
                                Help
                            </div>
                        )}
                    </Link>
                </div>
            </div>
        </aside>
    );
}

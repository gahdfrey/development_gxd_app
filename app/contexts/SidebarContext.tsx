'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface SidebarContextType {
    isExpanded: boolean;
    isLocked: boolean;
    setIsExpanded: (value: boolean) => void;
    setIsLocked: (value: boolean) => void;
    toggleLock: () => void;
    // Phones: the sidebar is a slide-out drawer, opened from the top bar's menu button.
    isMobileOpen: boolean;
    setMobileOpen: (value: boolean) => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function SidebarProvider({ children }: { children: ReactNode }) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isLocked, setIsLocked] = useState(false);
    const [isMobileOpen, setMobileOpen] = useState(false);

    const toggleLock = useCallback(() => {
        setIsLocked(prev => {
            const newLocked = !prev;
            setIsExpanded(newLocked);
            return newLocked;
        });
    }, []);

    return (
        <SidebarContext.Provider
            value={{
                isExpanded,
                isLocked,
                setIsExpanded,
                setIsLocked,
                toggleLock,
                isMobileOpen,
                setMobileOpen,
            }}
        >
            {children}
        </SidebarContext.Provider>
    );
}

export function useSidebar() {
    const context = useContext(SidebarContext);
    if (context === undefined) {
        throw new Error('useSidebar must be used within a SidebarProvider');
    }
    return context;
}

'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface SidebarContextType {
    isExpanded: boolean;
    isLocked: boolean;
    setIsExpanded: (value: boolean) => void;
    setIsLocked: (value: boolean) => void;
    toggleLock: () => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function SidebarProvider({ children }: { children: ReactNode }) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isLocked, setIsLocked] = useState(false);

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

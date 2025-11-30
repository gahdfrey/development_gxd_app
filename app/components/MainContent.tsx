'use client';

import { useSidebar } from '@/app/contexts/SidebarContext';

export default function MainContent({ children }: { children: React.ReactNode }) {
    const { isLocked } = useSidebar();

    // Determine the left padding based on sidebar state
    const sidebarWidth = (isLocked) ? 'pl-64' : 'pl-16';

    return (
        <main className={`pt-24 ${sidebarWidth} transition-all duration-500 ease-out`}>
            {children}
        </main>
    );
}

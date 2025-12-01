'use client';

import { SidebarProvider } from '@/app/contexts/SidebarContext';
import { ToastProvider } from '@/app/contexts/ToastContext';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
    return (
        <ToastProvider>
            <SidebarProvider>{children}</SidebarProvider>
        </ToastProvider>
    );
}

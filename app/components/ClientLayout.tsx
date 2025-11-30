'use client';

import { SidebarProvider } from '@/app/contexts/SidebarContext';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
    return <SidebarProvider>{children}</SidebarProvider>;
}

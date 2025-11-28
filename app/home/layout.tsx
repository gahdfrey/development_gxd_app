'use client';

import NavigationBar from '../components/NavigationBar';
import SideMenu from '../components/SideMenu';
import { SessionProvider } from 'next-auth/react';

export default function HomeLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <SessionProvider>
            {/* <div className="min-h-screen bg-gradient-to-br from-[var(--gradient-accent-start)] via-[var(--gradient-primary-start)] to-[var(--gradient-accent-end)] animate-gradient"> */}

            <div>
                <NavigationBar />
                <SideMenu />
                <div className="pt-[73px] pl-20">
                    {children}
                </div>
            </div>
        </SessionProvider>
    );
}

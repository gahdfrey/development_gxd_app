import SideMenu from '@/app/components/SideMenu';
import NavigationBar from '@/app/components/NavigationBar';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';

import Providers from '@/app/components/Providers';

export default async function AuthenticatedLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await auth();

    if (!session) {
        redirect('/login');
    }

    return (
        <Providers>
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
                <NavigationBar />
                <SideMenu />
                <main className="pt-[73px] pl-16 transition-all duration-500 ease-out">
                    {children}
                </main>
            </div>
        </Providers>
    );
}

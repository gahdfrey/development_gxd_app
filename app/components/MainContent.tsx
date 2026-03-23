'use client';

import { useSidebar } from '@/app/contexts/SidebarContext';
import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';

export default function MainContent({ children }: { children: React.ReactNode }) {
  const { isLocked } = useSidebar();

  const { data: user } = useSWR('/api/wai', fetcher, {
    shouldRetryOnError: false,
    revalidateOnFocus: false,
    dedupingInterval: 60000,
  });

  // Patients have no sidebar — remove the sidebar offset entirely
  const isPatient = user?.userrole === 'Patient';

  const sidebarWidth = isPatient ? 'pl-0' : isLocked ? 'pl-64' : 'pl-16';

  return (
    <main className={`pt-24 ${sidebarWidth} transition-all duration-500 ease-out`}>
      {children}
    </main>
  );
}

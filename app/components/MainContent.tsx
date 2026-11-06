'use client';

import { useSidebar } from '@/app/contexts/SidebarContext';
import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';
import CriticalAlertsBar from '@/app/(authenticated)/components/lab/CriticalAlertsBar';

export default function MainContent({ children }: { children: React.ReactNode }) {
  const { isLocked } = useSidebar();

  const { data: user } = useSWR('/api/wai', fetcher, {
    shouldRetryOnError: false,
    revalidateOnFocus: false,
    dedupingInterval: 60000,
  });

  // Patients have no sidebar — remove the sidebar offset entirely
  const isPatient = user?.userrole === 'Patient';

  // Phones: the sidebar is a slide-out drawer, so content uses the full width.
  const sidebarWidth = isPatient ? 'md:pl-0' : isLocked ? 'md:pl-64' : 'md:pl-16';

  return (
    <main className={`pt-20 md:pt-24 pl-0 ${sidebarWidth} min-w-0 overflow-x-clip transition-all duration-500 ease-out`}>
      {/* Unacknowledged critical lab results addressed to this clinician. */}
      {!isPatient && <CriticalAlertsBar />}
      {children}
    </main>
  );
}

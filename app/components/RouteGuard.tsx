'use client';

import { useRouter, usePathname } from 'next/navigation';
import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';
import { getDefaultRoute } from '@/lib/utils/getDefaultRoute';
import { ShieldExclamationIcon } from '@heroicons/react/24/outline';

// Maps URL prefix → module name (must match APP_MODULES in lib/constants.ts)
const ROUTE_MODULE_MAP: Record<string, string> = {
  '/dashboard':        'dashboard',
  '/appointments':     'appointments',
  '/my-appointments':  'my-appointments',
  '/all-appointments': 'all-appointments',
  '/users':            'users',
  '/roles':            'roles',
  '/finance':          'finance',
  '/laboratory':       'laboratory',
  '/radiology':        'radiography',
  '/setup':            'setup',
  '/my-history':       'my-history',
  '/inventory/orders': 'supply-orders',
  '/products':          'products',
  '/product-inventory': 'products',
  '/orders':           'orders',
  '/pharmacy':         'pharmacy',
};

function canViewModule(permissions: Record<string, unknown> | null | undefined, module: string): boolean {
  if (!permissions) return false;
  const perm = permissions[module];
  if (!perm) return false;
  if (typeof perm === 'object' && !Array.isArray(perm)) {
    return (perm as Record<string, boolean>).view === true;
  }
  if (Array.isArray(perm)) {
    return (perm as string[]).includes('view');
  }
  return false;
}

export default function RouteGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  // Reuses the same SWR key as SideMenu and MainContent — no extra network request
  const { data: user, isLoading } = useSWR('/api/wai', fetcher, {
    shouldRetryOnError: false,
    revalidateOnFocus: false,
    dedupingInterval: 60000,
  });

  // Compute access synchronously — no useEffect/useState so there's no stale render
  const module = Object.entries(ROUTE_MODULE_MAP).find(([route]) =>
    pathname === route || pathname.startsWith(route + '/')
  )?.[1];

  const permissions = user?.permissions as Record<string, unknown> | null;

  // Still fetching — render nothing so the page never flashes
  if (isLoading || !user) return null;

  // Route has a module guard and user lacks view permission
  const isDenied = !!module && !canViewModule(permissions, module);

  if (isDenied) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-50">
          <ShieldExclamationIcon className="h-10 w-10 text-red-400" />
        </div>
        <h1 className="mb-2 text-xl font-semibold text-gray-800">
          Access Denied
        </h1>
        <p className="mb-8 max-w-sm text-sm text-gray-500">
          You don&apos;t have permission to access this module. Contact your
          administrator if you believe this is a mistake.
        </p>
        <button
          onClick={() => router.replace(getDefaultRoute(permissions))}
          className="rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 active:scale-95"
        >
          Go to my dashboard
        </button>
      </div>
    );
  }

  return <>{children}</>;
}

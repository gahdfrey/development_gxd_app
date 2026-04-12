"use client";

import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";

export default function DashboardLoadingOverlay() {
  const { isLoading } = useSWR("/api/wai", fetcher, {
    shouldRetryOnError: false,
    revalidateOnFocus: false,
    dedupingInterval: 60000,
  });

  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-md bg-white/60">
      <div className="flex flex-col items-center gap-4">
        <svg
          className="animate-spin h-10 w-10 text-blue-600"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
        <p className="text-lg font-medium text-gray-700">Loading your dashboard</p>
      </div>
    </div>
  );
}

"use client";

import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";

export interface Dose {
  id: number;
  courseId: number;
  doseNumber: number;
  scheduledDate: string;
  status: string; // scheduled | overdue | given | missed | cancelled
  givenAt: string | null;
  givenByName: string | null;
  batchNumber: string | null;
  site: string | null;
  notes: string | null;
  chargeId: number | null;
  amount: number | null;
  paymentStatus: string | null; // not_paid | paid | waived
}

export interface Course {
  id: number;
  vaccineId: number;
  vaccineName: string;
  vaccineDescription: string | null;
  startDate: string;
  doseCount: number;
  intervalValue: number;
  intervalUnit: string;
  period: string;
  status: string;
  notes: string | null;
  createdAt: string;
  doses: Dose[];
}

export interface Vaccine {
  id: number;
  name: string;
  description: string | null;
  doseCount: number;
  intervalValue: number;
  intervalUnit: string;
  price: number;
  taxCode: string;
  isActive: boolean;
}

export const INTERVAL_UNIT_OPTIONS = [
  { value: "day", label: "Day(s)" },
  { value: "week", label: "Week(s)" },
  { value: "month", label: "Month(s)" },
  { value: "year", label: "Year(s)" },
];

export function naira(amount: number | null | undefined): string {
  return amount != null ? `₦${amount.toLocaleString()}` : "—";
}

/** "10 Oct 2026" from a YYYY-MM-DD date, without timezone drift. */
export function formatDay(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

/** Today in Nigeria, YYYY-MM-DD. */
export function todayLagos(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Lagos" });
}

const STATUS_STYLES: Record<string, { label: string; cls: string }> = {
  scheduled: { label: "Scheduled", cls: "bg-blue-50 text-blue-700 ring-blue-200" },
  overdue: { label: "Overdue", cls: "bg-red-50 text-red-700 ring-red-200" },
  given: { label: "Given", cls: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  missed: { label: "Missed", cls: "bg-amber-50 text-amber-700 ring-amber-200" },
  cancelled: { label: "Cancelled", cls: "bg-gray-100 text-gray-500 ring-gray-200" },
  active: { label: "In progress", cls: "bg-blue-50 text-blue-700 ring-blue-200" },
  completed: { label: "Completed", cls: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
};

export function StatusPill({ status }: { status: string }) {
  const s = STATUS_STYLES[status] ?? { label: status, cls: "bg-gray-100 text-gray-600 ring-gray-200" };
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${s.cls}`}>{s.label}</span>;
}

export function PaymentPill({ status }: { status: string | null }) {
  if (!status) return null;
  const s =
    status === "paid" ? { label: "Paid", cls: "bg-emerald-50 text-emerald-700 ring-emerald-200" }
    : status === "waived" ? { label: "Waived", cls: "bg-gray-100 text-gray-600 ring-gray-200" }
    : { label: "Unpaid", cls: "bg-amber-50 text-amber-700 ring-amber-200" };
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${s.cls}`}>{s.label}</span>;
}

/** Whether the signed-in user's role grants module/action (both permission JSON shapes). */
export function useCan() {
  const { data: user } = useSWR("/api/wai", fetcher, { shouldRetryOnError: false, revalidateOnFocus: false, dedupingInterval: 60000 });
  return (module: string, action: string): boolean => {
    const entry = user?.permissions?.[module];
    if (Array.isArray(entry)) return entry.includes(action);
    if (entry && typeof entry === "object") return entry[action] === true;
    return false;
  };
}

export const inputCls =
  "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

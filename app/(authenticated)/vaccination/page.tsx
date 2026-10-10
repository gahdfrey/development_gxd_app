"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { EyeIcon, MagnifyingGlassIcon, PlusIcon, ShieldCheckIcon } from "@heroicons/react/24/outline";
import { fetcher } from "@/lib/fetcher";
import BookVaccinationModal from "../components/vaccination/BookVaccinationModal";
import CourseDetailModal, { type CourseSummary } from "../components/vaccination/CourseDetailModal";
import { StatusPill, formatDay, naira, useCan } from "../components/vaccination/shared";

type View = "today" | "upcoming" | "overdue" | "given" | "all";

interface CourseRow extends CourseSummary {
  status: string; // active | completed | cancelled
  doseCount: number;
  period: string;
  startDate: string;
  given: number;
  active: number;
  overdue: number;
  missed: number;
  nextDue: string | null;
  lastGivenAt: string | null;
  total: number;
  unpaid: number;
}

interface Worklist {
  courses: CourseRow[];
  counts: { today: number; upcoming: number; overdue: number };
}

const VIEWS: { key: View; label: string }[] = [
  { key: "today", label: "Due today" },
  { key: "overdue", label: "Overdue" },
  { key: "upcoming", label: "Upcoming" },
  { key: "given", label: "Given" },
  { key: "all", label: "All" },
];

/**
 * Vaccination clinic worklist: one row per patient's vaccine course — who's
 * due today, overdue or coming up. "View" opens the course dose by dose with
 * give / reschedule / missed / cancel and desk payment.
 */
export default function VaccinationPage() {
  const [view, setView] = useState<View>("today");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [booking, setBooking] = useState(false);
  const [viewing, setViewing] = useState<CourseSummary | null>(null);
  const can = useCan();

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const key = `/api/vaccinations?view=${view}${search ? `&search=${encodeURIComponent(search)}` : ""}`;
  const { data, isLoading, error, mutate } = useSWR<Worklist>(key, fetcher);
  const courses = data?.courses ?? [];
  const counts = data?.counts;

  const countFor = (v: View) => (v === "today" || v === "overdue" || v === "upcoming" ? counts?.[v] : undefined);

  return (
    <div className="p-3 sm:p-6 max-w-7xl mx-auto space-y-4 sm:space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Vaccination</h1>
          <p className="mt-1 text-sm text-gray-600">Book vaccinations, see who&apos;s due, and record doses given.</p>
        </div>
        {can("vaccination", "add") && (
          <button
            onClick={() => setBooking(true)}
            className="inline-flex items-center gap-2 self-start rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            <PlusIcon className="h-4 w-4" /> Book vaccination
          </button>
        )}
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <nav className="-mb-px flex gap-1 overflow-x-auto border-b border-gray-200" aria-label="Worklist views">
          {VIEWS.map((v) => {
            const active = view === v.key;
            const n = countFor(v.key);
            return (
              <button
                key={v.key}
                onClick={() => setView(v.key)}
                className={`inline-flex shrink-0 items-center gap-2 border-b-2 px-3.5 py-2.5 text-sm font-semibold transition-colors ${
                  active ? "border-blue-600 text-blue-700" : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                }`}
              >
                {v.label}
                {n != null && n > 0 && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                      v.key === "overdue" ? "bg-red-50 text-red-700" : active ? "bg-blue-50 text-blue-700" : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {n}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
        <div className="relative w-full lg:w-72">
          <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Patient, hospital no. or vaccine"
            className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error?.status === 403 ? "You don't have access to vaccinations." : "Failed to load vaccinations."}
        </p>
      ) : isLoading ? (
        <div className="flex h-48 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
        </div>
      ) : courses.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center">
          <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-blue-50">
            <ShieldCheckIcon className="h-6 w-6 text-blue-600" />
          </span>
          <p className="text-sm text-gray-500">
            {search ? "No vaccinations match your search." : view === "today" ? "No one is due for a vaccination today." : "Nothing here yet."}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {["Patient", "Vaccine", "Progress", "Next due", "Status", "Payment", ""].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {courses.map((c) => {
                const pct = c.active > 0 ? Math.round((c.given / c.active) * 100) : 0;
                const status = c.status === "active" && c.overdue > 0 ? "overdue" : c.status;
                return (
                  <tr key={c.courseId} className={c.status === "cancelled" ? "opacity-60" : ""}>
                    <td className="px-4 py-3">
                      <Link href={`/patients/${c.patientId}/history`} className="font-semibold text-gray-900 hover:text-blue-700">
                        {c.patientFirstname} {c.patientLastname}
                      </Link>
                      <p className="text-xs text-gray-500">
                        <span className="font-mono">{c.patientMrn ?? "—"}</span> · {c.patientCountryCode} {c.patientPhone}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{c.vaccineName}</p>
                      <p className="text-xs text-gray-500">{c.period}</p>
                    </td>
                    <td className="px-4 py-3 min-w-36">
                      <p className="text-xs font-semibold text-gray-700">
                        {c.given} of {c.active} given
                      </p>
                      <div className="mt-1.5 h-1.5 w-full rounded-full bg-gray-100">
                        <div className="h-1.5 rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-700">
                      {c.nextDue ? formatDay(c.nextDue) : "—"}
                      {c.missed > 0 && <p className="text-xs text-amber-700">{c.missed} missed</p>}
                    </td>
                    <td className="px-4 py-3"><StatusPill status={status} /></td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {c.unpaid > 0 ? (
                        <>
                          <p className="font-medium text-amber-700">{naira(c.unpaid)} unpaid</p>
                          <p className="text-xs text-gray-500">of {naira(c.total)}</p>
                        </>
                      ) : c.total > 0 ? (
                        <p className="font-medium text-emerald-700">Paid · {naira(c.total)}</p>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setViewing(c)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:border-blue-300 hover:text-blue-700"
                      >
                        <EyeIcon className="h-4 w-4" /> View
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <BookVaccinationModal isOpen={booking} onClose={() => setBooking(false)} onBooked={() => mutate()} />
      <CourseDetailModal summary={viewing} onClose={() => setViewing(null)} onChanged={() => mutate()} />
    </div>
  );
}

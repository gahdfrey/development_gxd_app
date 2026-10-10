"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import { EyeIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { fetcher } from "@/lib/fetcher";
import CourseDetailModal, { type CourseSummary } from "../../components/vaccination/CourseDetailModal";
import { naira } from "./billing";

type Filter = "unpaid" | "paid" | "all";

interface BillRow extends CourseSummary {
  status: string;
  period: string;
  startDate: string;
  billedDoses: number;
  paidDoses: number;
  total: number;
  paid: number;
  waived: number;
  outstanding: number;
}

export const VACCINATION_BILLS_KEY = "/api/vaccinations/bills";

/**
 * Finance → Vaccinations: one row per vaccination course (not per dose) with
 * its total, paid and outstanding. "View" opens the doses, where the cashier
 * collects one dose or everything outstanding at once.
 */
export default function VaccinationBillsTab({ onChanged }: { onChanged?: () => void }) {
  const [filter, setFilter] = useState<Filter>("unpaid");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [viewing, setViewing] = useState<CourseSummary | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const key = `${VACCINATION_BILLS_KEY}?status=${filter}${search ? `&search=${encodeURIComponent(search)}` : ""}`;
  const { data, isLoading, mutate } = useSWR<{ courses: BillRow[] }>(key, fetcher);
  const rows = data?.courses ?? [];
  const outstanding = rows.reduce((s, r) => s + r.outstanding, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex rounded-lg border border-gray-200 bg-white p-0.5">
          {(["unpaid", "paid", "all"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium capitalize transition-colors ${
                filter === f ? "bg-blue-600 text-white" : "text-gray-600 hover:text-gray-900"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-72">
          <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Patient, hospital no. or vaccine"
            className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {filter === "unpaid" && rows.length > 0 && (
        <p className="text-sm text-gray-600">
          <span className="font-semibold text-amber-700">{naira(outstanding)}</span> outstanding across {rows.length} vaccination
          {rows.length !== 1 ? "s" : ""}
        </p>
      )}

      {isLoading ? (
        <div className="flex h-40 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
        </div>
      ) : rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-gray-300 px-4 py-8 text-center text-sm text-gray-500">
          {search ? "No vaccinations match your search." : filter === "unpaid" ? "No unpaid vaccinations." : "No vaccination bills yet."}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {["Patient", "Vaccine", "Doses paid", "Total", "Paid", "Outstanding", ""].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((r) => (
                <tr key={r.courseId} className="hover:bg-gray-50/60">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <p className="font-semibold text-gray-900">{r.patientFirstname} {r.patientLastname}</p>
                    <p className="text-xs font-mono text-gray-500">{r.patientMrn ?? "—"}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{r.vaccineName}</p>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-700">
                    {r.paidDoses} of {r.billedDoses}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-900">{naira(r.total)}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-emerald-700">
                    {naira(r.paid)}
                    {r.waived > 0 && <span className="block text-xs text-gray-500">{naira(r.waived)} waived</span>}
                  </td>
                  <td className={`px-4 py-3 whitespace-nowrap font-semibold ${r.outstanding > 0 ? "text-amber-700" : "text-gray-400"}`}>
                    {naira(r.outstanding)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setViewing(r)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:border-blue-300 hover:text-blue-700"
                    >
                      <EyeIcon className="h-4 w-4" /> View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <CourseDetailModal
        context="finance"
        summary={viewing}
        onClose={() => setViewing(null)}
        onChanged={() => {
          mutate();
          onChanged?.();
        }}
      />
    </div>
  );
}

"use client";

import type { RequestRow } from "./RequestsTable";

export type ResultTab = "pending" | "sent";

/** A request's result has gone out once a file is uploaded or values are
 * entered — both mark the request "completed". */
export function isResultSent(row: RequestRow): boolean {
  return row.status === "completed" || row.hasResult || !!row.hasValues;
}

/** Lab / Radiology: switch between requests still awaiting a result and those whose result has been sent. */
export default function ResultStatusTabs({ rows, value, onChange }: { rows: RequestRow[]; value: ResultTab; onChange: (tab: ResultTab) => void }) {
  const sent = rows.filter(isResultSent).length;
  const tabs: { key: ResultTab; label: string; count: number }[] = [
    { key: "pending", label: "Awaiting result", count: rows.length - sent },
    { key: "sent", label: "Result sent", count: sent },
  ];
  return (
    <div className="mb-4 border-b border-gray-200">
      <nav className="-mb-px flex gap-1" aria-label="Result status">
        {tabs.map((t) => {
          const active = value === t.key;
          return (
            <button
              key={t.key}
              onClick={() => onChange(t.key)}
              aria-current={active ? "page" : undefined}
              className={`inline-flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors ${
                active ? "border-blue-600 text-blue-700" : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
              }`}
            >
              {t.label}
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${active ? "bg-blue-50 text-blue-700" : "bg-gray-100 text-gray-500"}`}>
                {t.count}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

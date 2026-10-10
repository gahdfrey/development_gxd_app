"use client";

export interface ResultValue {
  id: number;
  name: string;
  valueNumeric: number | null;
  valueText: string | null;
  unit: string | null;
  refLow: number | null;
  refHigh: number | null;
  flag: "normal" | "low" | "high" | "critical_low" | "critical_high" | "abnormal";
  comment: string | null;
  amendedAt?: string | null;
  critical?: { acknowledgedAt: string | null } | null;
}

const FLAG_STYLE: Record<ResultValue["flag"], { label: string; className: string }> = {
  normal: { label: "", className: "" },
  low: { label: "Low", className: "bg-amber-100 text-amber-800" },
  high: { label: "High", className: "bg-amber-100 text-amber-800" },
  abnormal: { label: "Abnormal", className: "bg-amber-100 text-amber-800" },
  critical_low: { label: "Critical low", className: "bg-red-600 text-white" },
  critical_high: { label: "Critical high", className: "bg-red-600 text-white" },
};

export function rangeLabel(low: number | null, high: number | null) {
  if (low != null && high != null) return `${low} – ${high}`;
  if (low != null) return `≥ ${low}`;
  if (high != null) return `≤ ${high}`;
  return "—";
}

/**
 * Structured lab results: value, unit, the reference range that applied and
 * a High/Low/Critical flag per field. compact hides the range column (for
 * narrow timeline cards).
 */
export default function ResultValuesTable({ values, compact = false }: { values: ResultValue[]; compact?: boolean }) {
  if (values.length === 0) return null;
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">Test</th>
            <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">Result</th>
            {!compact && <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">Normal range</th>}
            <th className="px-3 py-2" />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {values.map((v) => {
            const f = FLAG_STYLE[v.flag] ?? FLAG_STYLE.normal;
            const shown = v.valueNumeric != null ? String(v.valueNumeric) : v.valueText ?? "";
            return (
              <tr key={v.id} className={v.flag.startsWith("critical") ? "bg-red-50/60" : ""}>
                <td className="px-3 py-2 text-gray-800">
                  {v.name}
                  {v.comment && <span className="block text-xs text-gray-500">{v.comment}</span>}
                </td>
                <td className={`px-3 py-2 whitespace-nowrap ${v.flag === "normal" ? "text-gray-900" : "font-bold text-gray-900"}`}>
                  {shown}
                  {v.unit && v.valueNumeric != null && <span className="ml-1 text-xs font-normal text-gray-500">{v.unit}</span>}
                  {v.amendedAt && <span className="ml-1 text-[10px] font-normal text-gray-400">(corrected)</span>}
                </td>
                {!compact && (
                  <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500">
                    {v.valueNumeric != null || v.refLow != null || v.refHigh != null ? rangeLabel(v.refLow, v.refHigh) : "—"}
                    {v.unit && (v.refLow != null || v.refHigh != null) && ` ${v.unit}`}
                  </td>
                )}
                <td className="px-3 py-2 text-right whitespace-nowrap">
                  {f.label && <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold ${f.className}`}>{f.label}</span>}
                  {v.critical && (
                    <span className={`block mt-0.5 text-[10px] ${v.critical.acknowledgedAt ? "text-gray-500" : "font-semibold text-red-700"}`}>
                      {v.critical.acknowledgedAt ? "Acknowledged" : "Not yet acknowledged"}
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

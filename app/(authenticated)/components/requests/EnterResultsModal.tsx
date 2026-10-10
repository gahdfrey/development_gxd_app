"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import Modal from "@/app/components/ui/Modal";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import type { RequestRow } from "./RequestsTable";
import { rangeLabel, type ResultValue } from "./ResultValuesTable";

interface Parameter {
  id: number;
  name: string;
  unit: string | null;
  valueType: "numeric" | "choice" | "text";
  choices: string[] | null;
  abnormalChoices: string[] | null;
  criticalLow: number | null;
  criticalHigh: number | null;
  decimals: number | null;
  range: { low: number | null; high: number | null };
}

interface ValuesResponse {
  parameters: Parameter[];
  values: (ResultValue & { parameterId: number })[];
}

type Flag = ResultValue["flag"];

/** Mirrors lib/lab/flags.ts#flagValue for live feedback while typing. */
function liveFlag(p: Parameter, raw: string): Flag | null {
  const s = raw.trim();
  if (!s) return null;
  if (p.valueType === "numeric") {
    const v = Number(s.replace(/,/g, ""));
    if (!Number.isFinite(v)) return null;
    if (p.criticalLow != null && v < p.criticalLow) return "critical_low";
    if (p.criticalHigh != null && v > p.criticalHigh) return "critical_high";
    if (p.range.low != null && v < p.range.low) return "low";
    if (p.range.high != null && v > p.range.high) return "high";
    return "normal";
  }
  if (p.valueType === "choice") return (p.abnormalChoices ?? []).includes(s) ? "abnormal" : "normal";
  return "normal";
}

const FLAG_TEXT: Record<Flag, { label: string; className: string }> = {
  normal: { label: "Normal", className: "text-green-700" },
  low: { label: "Low", className: "text-amber-700 font-semibold" },
  high: { label: "High", className: "text-amber-700 font-semibold" },
  abnormal: { label: "Abnormal", className: "text-amber-700 font-semibold" },
  critical_low: { label: "CRITICAL LOW", className: "text-red-700 font-bold" },
  critical_high: { label: "CRITICAL HIGH", className: "text-red-700 font-bold" },
};

/**
 * Lab result entry for tests with result fields: one input per field with
 * the patient's normal range and a live High/Low/Critical flag. Saving a
 * critical value alerts the ordering doctor.
 */
export default function EnterResultsModal({
  isOpen,
  onClose,
  row,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  row: RequestRow | null;
  onSuccess?: () => void;
}) {
  const { data, isLoading } = useSWR<ValuesResponse>(isOpen && row ? `/api/requests/${row.id}/values` : null, fetcher);
  const [inputs, setInputs] = useState<Record<number, { value: string; comment: string }>>({});
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmCritical, setConfirmCritical] = useState(false);

  useEffect(() => {
    if (!data) return;
    const next: Record<number, { value: string; comment: string }> = {};
    for (const p of data.parameters) {
      const existing = data.values.find((v) => v.parameterId === p.id);
      next[p.id] = {
        value: existing ? (existing.valueNumeric != null ? String(existing.valueNumeric) : existing.valueText ?? "") : "",
        comment: existing?.comment ?? "",
      };
    }
    setInputs(next);
    setError("");
    setConfirmCritical(false);
  }, [data]);

  const criticals = useMemo(
    () => (data?.parameters ?? []).filter((p) => {
      const f = liveFlag(p, inputs[p.id]?.value ?? "");
      return f === "critical_low" || f === "critical_high";
    }),
    [data, inputs],
  );

  const save = async () => {
    if (!row || !data) return;
    if (criticals.length > 0 && !confirmCritical) {
      setConfirmCritical(true);
      return;
    }
    setError("");
    setSaving(true);
    try {
      const res = await fetch(`/api/requests/${row.id}/values`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          values: data.parameters.map((p) => ({ parameterId: p.id, value: inputs[p.id]?.value ?? "", comment: inputs[p.id]?.comment ?? "" })),
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error || "Failed to save results");
        return;
      }
      onSuccess?.();
      onClose();
    } catch {
      setError("Failed to save results");
    } finally {
      setSaving(false);
    }
  };

  const patientName = `${row?.patientFirstname ?? ""} ${row?.patientLastname ?? ""}`.trim();
  const inputClass = "w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Enter results — ${row?.testName ?? ""}`} size="large">
      {isLoading || !data ? (
        <div className="flex justify-center items-center h-40">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            {patientName}
            {row?.departmentName ? ` · ${row.departmentName}` : ""}
          </p>
          {error && <p className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</p>}

          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {["Field", "Result", "Unit", "Normal range", "", "Comment"].map((h, i) => (
                    <th key={i} className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.parameters.map((p) => {
                  const v = inputs[p.id] ?? { value: "", comment: "" };
                  const flag = liveFlag(p, v.value);
                  const setV = (patch: Partial<typeof v>) => setInputs((prev) => ({ ...prev, [p.id]: { ...v, ...patch } }));
                  return (
                    <tr key={p.id} className={flag?.startsWith("critical") ? "bg-red-50" : ""}>
                      <td className="px-3 py-2 font-medium text-gray-800 whitespace-nowrap">{p.name}</td>
                      <td className="px-3 py-2 min-w-[140px]">
                        {p.valueType === "choice" ? (
                          <select value={v.value} onChange={(e) => setV({ value: e.target.value })} className={inputClass}>
                            <option value="">—</option>
                            {(p.choices ?? []).map((c) => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type="text"
                            inputMode={p.valueType === "numeric" ? "decimal" : "text"}
                            value={v.value}
                            onChange={(e) => setV({ value: e.target.value })}
                            className={inputClass}
                          />
                        )}
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-500 whitespace-nowrap">{p.unit ?? ""}</td>
                      <td className="px-3 py-2 text-xs text-gray-500 whitespace-nowrap">
                        {p.valueType === "numeric" ? rangeLabel(p.range.low, p.range.high) : p.abnormalChoices?.length ? `Abnormal: ${p.abnormalChoices.join(", ")}` : "—"}
                      </td>
                      <td className="px-3 py-2 text-xs whitespace-nowrap">
                        {flag && <span className={FLAG_TEXT[flag].className}>{FLAG_TEXT[flag].label}</span>}
                      </td>
                      <td className="px-3 py-2 min-w-[160px]">
                        <input type="text" value={v.comment} onChange={(e) => setV({ comment: e.target.value })} className={inputClass} placeholder="Optional" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {criticals.length > 0 && (
            <div className="flex items-start gap-2 rounded-xl border-2 border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
              <ExclamationTriangleIcon className="h-5 w-5 shrink-0" />
              <div>
                <p className="font-bold">
                  {criticals.length} critical value{criticals.length === 1 ? "" : "s"}: {criticals.map((c) => c.name).join(", ")}
                </p>
                <p>
                  Saving sends an alert to the requesting doctor, who must acknowledge it. Also phone the ward or doctor now —
                  don&apos;t rely on the screen alone.
                </p>
                {confirmCritical && <p className="mt-1 font-semibold">Check the values, then press “Save &amp; send critical alert” again.</p>}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3">
            <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
              Cancel
            </button>
            <button
              onClick={save}
              disabled={saving}
              className={`px-4 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-50 ${criticals.length ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700"}`}
            >
              {saving ? "Saving..." : criticals.length ? "Save & send critical alert" : "Save results"}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}

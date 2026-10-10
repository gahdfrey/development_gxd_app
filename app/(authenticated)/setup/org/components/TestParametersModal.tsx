"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import Modal from "@/app/components/ui/Modal";
import { ArrowDownIcon, ArrowUpIcon, PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import type { TestRow } from "./types";

type RefRange = { sex?: "male" | "female"; minAgeYears?: number; maxAgeYears?: number; low?: number | null; high?: number | null };

interface ParamRow {
  id?: number;
  name: string;
  code: string | null;
  unit: string | null;
  valueType: "numeric" | "choice" | "text";
  choices: string[] | null;
  abnormalChoices: string[] | null;
  refLow: number | null;
  refHigh: number | null;
  refRanges: RefRange[] | null;
  criticalLow: number | null;
  criticalHigh: number | null;
  decimals: number | null;
}

interface Template {
  key: string;
  name: string;
  parameters: Omit<ParamRow, "id">[];
}

/** Form state keeps numbers as strings while editing. */
type Draft = Omit<ParamRow, "refLow" | "refHigh" | "criticalLow" | "criticalHigh" | "decimals" | "choices" | "abnormalChoices"> & {
  refLow: string;
  refHigh: string;
  criticalLow: string;
  criticalHigh: string;
  decimals: string;
  choices: string;
  abnormalChoices: string;
};

const str = (n: number | null | undefined) => (n == null ? "" : String(n));

function toDraft(p: Partial<ParamRow>): Draft {
  return {
    id: p.id,
    name: p.name ?? "",
    code: p.code ?? null,
    unit: p.unit ?? "",
    valueType: p.valueType ?? "numeric",
    refRanges: p.refRanges ?? null,
    refLow: str(p.refLow),
    refHigh: str(p.refHigh),
    criticalLow: str(p.criticalLow),
    criticalHigh: str(p.criticalHigh),
    decimals: str(p.decimals),
    choices: (p.choices ?? []).join(", "),
    abnormalChoices: (p.abnormalChoices ?? []).join(", "),
  };
}

function rangesText(ranges: RefRange[] | null) {
  return (ranges ?? [])
    .map((r) => `${r.sex === "male" ? "Men" : r.sex === "female" ? "Women" : "All"}${r.minAgeYears != null ? ` ${r.minAgeYears}+ yrs` : ""}: ${r.low ?? "—"}–${r.high ?? "—"}`)
    .join("; ");
}

/**
 * Setup → Tests → Result fields: what a test reports (e.g. FBC → Hb, WBC,
 * Platelets), with units, normal ranges and critical limits. Load a starter
 * template, then adjust to the lab's own analysers and methods.
 */
export default function TestParametersModal({ test, onClose }: { test: TestRow | null; onClose: () => void }) {
  const { data, mutate } = useSWR<{ parameters: ParamRow[] }>(test ? `/api/tests/${test.id}/parameters` : null, fetcher);
  const { data: templates } = useSWR<{ templates: Template[]; suggested: string[] }>(
    test ? `/api/lab-templates?testName=${encodeURIComponent(test.name)}` : null,
    fetcher,
  );
  const [rows, setRows] = useState<Draft[]>([]);
  const [templateKey, setTemplateKey] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data) setRows(data.parameters.map(toDraft));
  }, [data]);

  useEffect(() => {
    if (templates?.suggested?.[0]) setTemplateKey(templates.suggested[0]);
  }, [templates]);

  const update = (i: number, patch: Partial<Draft>) => setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const move = (i: number, d: -1 | 1) =>
    setRows((prev) => {
      const next = [...prev];
      const j = i + d;
      if (j < 0 || j >= next.length) return prev;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  const loadTemplate = () => {
    const t = templates?.templates.find((x) => x.key === templateKey);
    if (!t) return;
    if (rows.length > 0 && !confirm(`Replace the current ${rows.length} field(s) with the “${t.name}” template?`)) return;
    // Keep ids of same-named fields so past results stay linked.
    setRows(t.parameters.map((p) => ({ ...toDraft(p), id: rows.find((r) => r.name === p.name)?.id })));
  };

  const save = async () => {
    if (!test) return;
    setError("");
    setSaving(true);
    try {
      const split = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);
      const res = await fetch(`/api/tests/${test.id}/parameters`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parameters: rows.map((r) => ({
            id: r.id,
            name: r.name,
            code: r.code,
            unit: r.unit,
            valueType: r.valueType,
            refLow: r.refLow,
            refHigh: r.refHigh,
            criticalLow: r.criticalLow,
            criticalHigh: r.criticalHigh,
            decimals: r.decimals,
            refRanges: r.refRanges,
            choices: split(r.choices),
            abnormalChoices: split(r.abnormalChoices),
          })),
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error || "Failed to save");
        return;
      }
      mutate();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const input = "w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <Modal isOpen={test !== null} onClose={onClose} title={`Result fields — ${test?.name ?? ""}`} size="large">
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          Lab staff fill these in when reporting this test. Results outside the normal range are flagged High/Low;
          past a critical limit the requesting doctor gets an alert they must acknowledge. Leave empty to keep reporting
          this test as an uploaded file only.
        </p>

        <div className="flex flex-wrap items-end gap-2 rounded-xl border border-blue-100 bg-blue-50 p-3">
          <label className="block text-xs font-medium text-gray-700">
            Start from a template
            <select value={templateKey} onChange={(e) => setTemplateKey(e.target.value)} className={`mt-1 ${input} min-w-[260px]`}>
              <option value="">Choose…</option>
              {(templates?.templates ?? []).map((t) => (
                <option key={t.key} value={t.key}>
                  {t.name}
                  {templates?.suggested.includes(t.key) ? " (suggested)" : ""}
                </option>
              ))}
            </select>
          </label>
          <button onClick={loadTemplate} disabled={!templateKey} className="px-3 py-1.5 text-sm font-medium text-blue-700 bg-white border border-blue-200 rounded-lg hover:bg-blue-50 disabled:opacity-50">
            Load template
          </button>
          <p className="w-full text-xs text-blue-800">
            Template ranges and critical limits are typical adult values — your laboratory director should confirm them for
            your analysers before use.
          </p>
        </div>

        {error && <p className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</p>}

        <div className="space-y-3">
          {rows.map((r, i) => (
            <div key={r.id ?? `new-${i}`} className="rounded-xl border border-gray-200 p-3 space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                <label className="sm:col-span-4 text-xs font-medium text-gray-600">
                  Field name
                  <input value={r.name} onChange={(e) => update(i, { name: e.target.value })} className={`mt-1 ${input}`} placeholder="e.g. Haemoglobin" />
                </label>
                <label className="sm:col-span-3 text-xs font-medium text-gray-600">
                  Type
                  <select value={r.valueType} onChange={(e) => update(i, { valueType: e.target.value as Draft["valueType"] })} className={`mt-1 ${input}`}>
                    <option value="numeric">Number</option>
                    <option value="choice">Pick from options</option>
                    <option value="text">Free text</option>
                  </select>
                </label>
                {r.valueType === "numeric" && (
                  <>
                    <label className="sm:col-span-3 text-xs font-medium text-gray-600">
                      Unit
                      <input value={r.unit ?? ""} onChange={(e) => update(i, { unit: e.target.value })} className={`mt-1 ${input}`} placeholder="e.g. g/dL" />
                    </label>
                    <label className="sm:col-span-2 text-xs font-medium text-gray-600">
                      Decimals
                      <input value={r.decimals} onChange={(e) => update(i, { decimals: e.target.value })} className={`mt-1 ${input}`} inputMode="numeric" />
                    </label>
                  </>
                )}
              </div>
              {r.valueType === "numeric" && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <label className="text-xs font-medium text-gray-600">
                    Normal low
                    <input value={r.refLow} onChange={(e) => update(i, { refLow: e.target.value })} className={`mt-1 ${input}`} inputMode="decimal" />
                  </label>
                  <label className="text-xs font-medium text-gray-600">
                    Normal high
                    <input value={r.refHigh} onChange={(e) => update(i, { refHigh: e.target.value })} className={`mt-1 ${input}`} inputMode="decimal" />
                  </label>
                  <label className="text-xs font-medium text-red-700">
                    Critical below
                    <input value={r.criticalLow} onChange={(e) => update(i, { criticalLow: e.target.value })} className={`mt-1 ${input}`} inputMode="decimal" />
                  </label>
                  <label className="text-xs font-medium text-red-700">
                    Critical above
                    <input value={r.criticalHigh} onChange={(e) => update(i, { criticalHigh: e.target.value })} className={`mt-1 ${input}`} inputMode="decimal" />
                  </label>
                </div>
              )}
              {r.valueType === "numeric" && r.refRanges && r.refRanges.length > 0 && (
                <p className="text-xs text-gray-500">
                  Sex/age-specific normal ranges: {rangesText(r.refRanges)} (the normal low/high above apply to everyone else).{" "}
                  <button onClick={() => update(i, { refRanges: null })} className="font-medium text-blue-600 hover:underline">
                    Use one range for all
                  </button>
                </p>
              )}
              {r.valueType === "choice" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <label className="text-xs font-medium text-gray-600">
                    Options (comma-separated)
                    <input value={r.choices} onChange={(e) => update(i, { choices: e.target.value })} className={`mt-1 ${input}`} placeholder="Negative, Positive" />
                  </label>
                  <label className="text-xs font-medium text-gray-600">
                    Which options are abnormal
                    <input value={r.abnormalChoices} onChange={(e) => update(i, { abnormalChoices: e.target.value })} className={`mt-1 ${input}`} placeholder="Positive" />
                  </label>
                </div>
              )}
              <div className="flex justify-end gap-3 text-xs font-medium">
                <button onClick={() => move(i, -1)} disabled={i === 0} className="inline-flex items-center gap-1 text-gray-500 hover:text-gray-800 disabled:opacity-30">
                  <ArrowUpIcon className="h-3.5 w-3.5" /> Up
                </button>
                <button onClick={() => move(i, 1)} disabled={i === rows.length - 1} className="inline-flex items-center gap-1 text-gray-500 hover:text-gray-800 disabled:opacity-30">
                  <ArrowDownIcon className="h-3.5 w-3.5" /> Down
                </button>
                <button onClick={() => setRows((prev) => prev.filter((_, idx) => idx !== i))} className="inline-flex items-center gap-1 text-red-600 hover:text-red-800">
                  <TrashIcon className="h-3.5 w-3.5" /> Remove
                </button>
              </div>
            </div>
          ))}
          <button
            onClick={() => setRows((prev) => [...prev, toDraft({})])}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-600 hover:border-gray-400 hover:bg-gray-50"
          >
            <PlusIcon className="h-4 w-4" />
            Add field
          </button>
        </div>

        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
          <button onClick={save} disabled={saving} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">
            {saving ? "Saving..." : "Save result fields"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

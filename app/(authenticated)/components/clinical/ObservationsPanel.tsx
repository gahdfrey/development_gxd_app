"use client";

import { useMemo, useState } from "react";
import useSWR, { mutate as globalMutate } from "swr";
import { fetcher } from "@/lib/fetcher";
import { ExclamationTriangleIcon, PlusIcon, ClockIcon } from "@heroicons/react/24/outline";
import {
  BAND_LABEL,
  PARAM_LABEL,
  SCORE_LABEL,
  scoreObservations,
  type Band,
  type Consciousness,
  type ScoreType,
} from "@/lib/clinical/ews";

interface VitalRow {
  id: number;
  recordedAt: string;
  temperatureC: number | null;
  heartRate: number | null;
  respiratoryRate: number | null;
  systolicBp: number | null;
  diastolicBp: number | null;
  spo2: number | null;
  onOxygen: boolean;
  oxygenLpm: number | null;
  spo2Scale2: boolean;
  consciousness: Consciousness | null;
  painScore: number | null;
  bloodGlucose: number | null;
  scoreType: ScoreType | null;
  score: number | null;
  band: Band | null;
  triggers: string[] | null;
  nextDueAt: string | null;
  escalatedTo: string | null;
  notes: string | null;
  recordedByFirstname: string | null;
  recordedByLastname: string | null;
}

interface VitalsResponse {
  context: {
    ageYears: number | null;
    gender: string | null;
    pregnantFromProblems: boolean;
    defaultScoreType: ScoreType;
    currentAdmissionId: number | null;
  };
  items: VitalRow[];
  latest: VitalRow | null;
  overdue: boolean;
}

export const BAND_STYLE: Record<Band, string> = {
  low: "bg-green-100 text-green-800 border-green-200",
  low_medium: "bg-amber-100 text-amber-800 border-amber-200",
  medium: "bg-orange-100 text-orange-800 border-orange-300",
  high: "bg-red-600 text-white border-red-600",
};

const CELL_STYLE = ["", "bg-yellow-100", "bg-orange-200", "bg-red-300"];

const CONSCIOUSNESS: { key: Consciousness; label: string }[] = [
  { key: "A", label: "A — Alert" },
  { key: "C", label: "C — New confusion" },
  { key: "V", label: "V — Responds to voice" },
  { key: "P", label: "P — Responds to pain" },
  { key: "U", label: "U — Unresponsive" },
];

const EMPTY = {
  temperatureC: "",
  heartRate: "",
  respiratoryRate: "",
  systolicBp: "",
  diastolicBp: "",
  spo2: "",
  onOxygen: false,
  oxygenLpm: "",
  spo2Scale2: false,
  consciousness: "A" as Consciousness | "",
  painScore: "",
  bloodGlucose: "",
  escalatedTo: "",
  notes: "",
};

function relTime(iso: string) {
  const mins = Math.round((new Date(iso).getTime() - Date.now()) / 60_000);
  const abs = Math.abs(mins);
  const txt = abs < 60 ? `${abs} min` : abs < 48 * 60 ? `${Math.round(abs / 60)} h` : `${Math.round(abs / 1440)} days`;
  return mins >= 0 ? `in ${txt}` : `${txt} ago`;
}

const n = (s: string) => (s.trim() === "" ? null : Number(s));

/**
 * Observations chart with early-warning score: record a set (temperature,
 * pulse, respiration, BP, SpO₂, oxygen, consciousness), see the score and
 * the required action live, and review recent sets as a colour-coded chart.
 * admissionId ties the set to an inpatient stay (defaults to the current one).
 */
export default function ObservationsPanel({ patientId, admissionId }: { patientId: number; admissionId?: number | null }) {
  const key = `/api/patients/${patientId}/vitals`;
  const { data, isLoading, mutate } = useSWR<VitalsResponse>(key, fetcher, { refreshInterval: 120_000 });
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [scoreType, setScoreType] = useState<ScoreType | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const effectiveType: ScoreType = scoreType ?? data?.context.defaultScoreType ?? "news2";

  const live = useMemo(
    () =>
      scoreObservations(
        effectiveType,
        {
          temperatureC: n(form.temperatureC),
          heartRate: n(form.heartRate),
          respiratoryRate: n(form.respiratoryRate),
          systolicBp: n(form.systolicBp),
          diastolicBp: n(form.diastolicBp),
          spo2: n(form.spo2),
          onOxygen: form.onOxygen,
          spo2Scale2: form.spo2Scale2,
          consciousness: form.consciousness || null,
        },
        data?.context.ageYears ?? null,
      ),
    [form, effectiveType, data],
  );

  if (isLoading || !data) return <div className="h-32 rounded-xl bg-gray-50 animate-pulse" />;

  const { latest, items, context } = data;
  const chart = [...items].slice(0, 8).reverse();

  const save = async () => {
    setError("");
    setSaving(true);
    try {
      const res = await fetch(key, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, scoreType: effectiveType, admissionId: admissionId ?? undefined }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error || "Failed to save");
        return;
      }
      setAdding(false);
      setForm(EMPTY);
      mutate();
      globalMutate("/api/vitals/ward");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: number) => {
    if (!confirm("Remove this set of observations? Only if it was entered by mistake.")) return;
    const res = await fetch(`${key}/${id}`, { method: "DELETE" });
    if (!res.ok) alert((await res.json()).error || "Failed");
    else {
      mutate();
      globalMutate("/api/vitals/ward");
    }
  };

  const field = (k: keyof typeof EMPTY, label: string, unit: string, partKey?: string) => {
    const pts = partKey ? live.parts[partKey] : undefined;
    return (
      <label className="block text-xs font-medium text-gray-600">
        {label} <span className="font-normal text-gray-400">{unit}</span>
        <input
          type="text"
          inputMode="decimal"
          value={form[k] as string}
          onChange={(e) => setForm({ ...form, [k]: e.target.value })}
          className={`mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            pts != null && (form[k] as string) !== "" ? CELL_STYLE[Math.min(pts, 3)] : "bg-white"
          }`}
        />
      </label>
    );
  };

  const rowsDef: { key: keyof VitalRow; label: string; part: string; fmt?: (v: VitalRow) => string }[] = [
    { key: "respiratoryRate", label: "Resp. rate", part: "respiratoryRate" },
    { key: "spo2", label: "SpO₂ %", part: "spo2" },
    { key: "onOxygen", label: "Oxygen", part: "oxygen", fmt: (v) => (v.onOxygen ? `O₂${v.oxygenLpm ? ` ${v.oxygenLpm}L` : ""}` : "Air") },
    { key: "systolicBp", label: "BP", part: "systolicBp", fmt: (v) => (v.systolicBp != null ? `${v.systolicBp}/${v.diastolicBp ?? "–"}` : "") },
    { key: "heartRate", label: "Pulse", part: "heartRate" },
    { key: "consciousness", label: "ACVPU", part: "consciousness" },
    { key: "temperatureC", label: "Temp °C", part: "temperatureC" },
  ];

  // Recompute per-parameter points for chart colouring from stored values.
  const partsFor = (v: VitalRow) =>
    scoreObservations(v.scoreType ?? "news2", { ...v, consciousness: v.consciousness ?? null }, context.ageYears).parts;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {latest?.band && latest.scoreType ? (
            <span className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-bold ${BAND_STYLE[latest.band]}`}>
              {SCORE_LABEL[latest.scoreType]} {latest.score} · {BAND_LABEL[latest.band]}
            </span>
          ) : (
            <span className="text-sm text-gray-500">No observations recorded</span>
          )}
          {latest?.nextDueAt && (
            <span className={`inline-flex items-center gap-1 text-xs ${data.overdue ? "font-bold text-red-700" : "text-gray-600"}`}>
              <ClockIcon className="h-4 w-4" />
              Next obs {data.overdue ? `OVERDUE (${relTime(latest.nextDueAt)})` : `due ${relTime(latest.nextDueAt)}`}
            </span>
          )}
        </div>
        {!adding && (
          <button onClick={() => setAdding(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700">
            <PlusIcon className="h-4 w-4" />
            Record observations
          </button>
        )}
      </div>

      {adding && (
        <div className="space-y-3 rounded-xl border border-gray-200 bg-gray-50 p-4">
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600">
            <label className="inline-flex items-center gap-2">
              Score
              <select
                value={effectiveType}
                onChange={(e) => setScoreType(e.target.value as ScoreType)}
                className="rounded-lg border border-gray-300 bg-white px-2 py-1 text-xs"
              >
                <option value="news2">NEWS2 (adults)</option>
                <option value="meows">MEOWS (pregnant / ≤6 weeks postpartum)</option>
                <option value="paeds">Paediatric (under 16, interim)</option>
              </select>
            </label>
            {context.pregnantFromProblems && <span className="text-pink-700">Pregnancy on the problem list → MEOWS</span>}
            {context.ageYears != null && context.ageYears < 16 && <span>Child, {context.ageYears} yrs</span>}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {field("respiratoryRate", "Resp. rate", "/min", "respiratoryRate")}
            {field("spo2", "SpO₂", "%", "spo2")}
            {field("heartRate", "Pulse", "/min", "heartRate")}
            {field("temperatureC", "Temperature", "°C", "temperatureC")}
            {field("systolicBp", "Systolic BP", "mmHg", "systolicBp")}
            {field("diastolicBp", "Diastolic BP", "mmHg", "diastolicBp")}
            <label className="block text-xs font-medium text-gray-600">
              Consciousness
              <select
                value={form.consciousness}
                onChange={(e) => setForm({ ...form, consciousness: e.target.value as Consciousness })}
                className={`mt-1 w-full rounded-lg border border-gray-300 px-2 py-2 text-sm ${live.parts.consciousness ? CELL_STYLE[3] : "bg-white"}`}
              >
                {CONSCIOUSNESS.map((c) => (
                  <option key={c.key} value={c.key}>{c.label}</option>
                ))}
              </select>
            </label>
            {field("painScore", "Pain", "0–10")}
          </div>
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <label className="inline-flex items-center gap-2">
              <input type="checkbox" checked={form.onOxygen} onChange={(e) => setForm({ ...form, onOxygen: e.target.checked })} className="h-4 w-4 rounded border-gray-300 text-blue-600" />
              On oxygen
            </label>
            {form.onOxygen && (
              <input
                type="text"
                inputMode="decimal"
                value={form.oxygenLpm}
                onChange={(e) => setForm({ ...form, oxygenLpm: e.target.value })}
                placeholder="L/min"
                className="w-24 rounded-lg border border-gray-300 px-2 py-1 text-sm"
              />
            )}
            {effectiveType === "news2" && (
              <label className="inline-flex items-center gap-2 text-xs text-gray-600" title="Only for confirmed hypercapnic respiratory failure (e.g. COPD), when a doctor has set a target of 88–92%">
                <input type="checkbox" checked={form.spo2Scale2} onChange={(e) => setForm({ ...form, spo2Scale2: e.target.checked })} className="h-4 w-4 rounded border-gray-300 text-blue-600" />
                SpO₂ scale 2 (doctor-prescribed target 88–92%)
              </label>
            )}
            <label className="text-xs text-gray-600">
              Glucose{" "}
              <input type="text" inputMode="decimal" value={form.bloodGlucose} onChange={(e) => setForm({ ...form, bloodGlucose: e.target.value })} placeholder="mg/dL" className="w-24 rounded-lg border border-gray-300 px-2 py-1 text-sm" />
            </label>
          </div>

          <div className={`rounded-xl border px-4 py-3 ${BAND_STYLE[live.band]}`}>
            <p className="text-sm font-bold">
              {SCORE_LABEL[live.scoreType]} {live.score} — {BAND_LABEL[live.band]} risk
              {live.triggers.length > 0 && ` · ${live.triggers.map((t) => PARAM_LABEL[t] ?? t).join(", ")} severely abnormal`}
            </p>
            <p className="text-sm">{live.action}</p>
            {live.missing.length > 0 && (
              <p className="mt-1 text-xs opacity-90">Not recorded: {live.missing.map((m) => PARAM_LABEL[m] ?? m).join(", ")} — the score may under-estimate risk.</p>
            )}
          </div>

          {live.escalate && (
            <label className="block text-sm font-medium text-red-800">
              <span className="inline-flex items-center gap-1">
                <ExclamationTriangleIcon className="h-4 w-4" /> Who did you inform?
              </span>
              <input
                type="text"
                value={form.escalatedTo}
                onChange={(e) => setForm({ ...form, escalatedTo: e.target.value })}
                placeholder="e.g. Dr Okafor (on call), 14:20"
                className="mt-1 w-full rounded-lg border border-red-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </label>
          )}
          <label className="block text-xs font-medium text-gray-600">
            Notes <span className="font-normal text-gray-400">(optional)</span>
            <input type="text" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm" />
          </label>
          <div className="flex justify-end gap-2">
            <button onClick={() => { setAdding(false); setForm(EMPTY); }} className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
              Cancel
            </button>
            <button onClick={save} disabled={saving} className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {saving ? "Saving..." : "Save observations"}
            </button>
          </div>
        </div>
      )}

      {chart.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="min-w-full text-xs">
            <thead className="bg-gray-50">
              <tr>
                <th className="sticky left-0 bg-gray-50 px-3 py-2 text-left font-semibold text-gray-500">Time</th>
                {chart.map((v) => (
                  <th key={v.id} className="px-2 py-2 text-center font-medium text-gray-600 whitespace-nowrap">
                    {new Date(v.recordedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
                    <span className="block text-gray-400">{new Date(v.recordedAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rowsDef.map((r) => (
                <tr key={r.label}>
                  <td className="sticky left-0 bg-white px-3 py-1.5 font-medium text-gray-700 whitespace-nowrap">{r.label}</td>
                  {chart.map((v) => {
                    const pts = partsFor(v)[r.part] ?? 0;
                    const raw = r.fmt ? r.fmt(v) : (v[r.key] as string | number | null) ?? "";
                    return (
                      <td key={v.id} className={`px-2 py-1.5 text-center whitespace-nowrap ${raw !== "" ? CELL_STYLE[Math.min(pts, 3)] : ""}`}>
                        {raw === "" ? <span className="text-gray-300">–</span> : raw}
                      </td>
                    );
                  })}
                </tr>
              ))}
              <tr className="bg-gray-50">
                <td className="sticky left-0 bg-gray-50 px-3 py-2 font-bold text-gray-800">Score</td>
                {chart.map((v) => (
                  <td key={v.id} className="px-2 py-2 text-center">
                    {v.band && (
                      <span className={`inline-flex rounded-md border px-2 py-0.5 font-bold ${BAND_STYLE[v.band]}`}>{v.score}</span>
                    )}
                    {v.escalatedTo && <span className="block mt-0.5 text-[10px] text-gray-500" title={v.escalatedTo}>informed</span>}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="sticky left-0 bg-white px-3 py-1.5 text-gray-400">By</td>
                {chart.map((v) => (
                  <td key={v.id} className="px-2 py-1.5 text-center text-[10px] text-gray-500 whitespace-nowrap">
                    {v.recordedByFirstname ?? "—"}
                    <button onClick={() => remove(v.id)} className="block mx-auto text-red-500 hover:text-red-700" title="Entered in error">
                      remove
                    </button>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

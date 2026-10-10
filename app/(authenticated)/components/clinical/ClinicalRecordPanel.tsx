"use client";

import { useEffect, useRef, useState } from "react";
import useSWR, { mutate as globalMutate } from "swr";
import { fetcher } from "@/lib/fetcher";
import GenericSelect, { type GenericOption } from "@/app/components/ui/GenericSelect";
import {
  ExclamationTriangleIcon,
  HeartIcon,
  PlusIcon,
  ScaleIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";
import {
  activeAllergies,
  CATEGORY_LABEL,
  clinicalKey,
  problemLabel,
  SEVERITY_LABEL,
  type AllergyRow,
  type ClinicalSummary,
  type ProblemRow,
} from "./types";

interface DrugClassOption {
  id: number;
  name: string;
  isBuiltIn: boolean;
}

const inputClass =
  "mt-1 w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500";
const labelClass = "block text-xs font-medium text-gray-600";

async function send(url: string, method: string, body?: unknown): Promise<string | null> {
  try {
    const res = await fetch(url, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    if (res.ok) return null;
    const data = await res.json().catch(() => ({}));
    return data.error || "Something went wrong";
  } catch {
    return "Something went wrong";
  }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

const SEVERITY_STYLE: Record<AllergyRow["severity"], string> = {
  mild: "bg-gray-100 text-gray-700",
  moderate: "bg-amber-100 text-amber-800",
  severe: "bg-red-100 text-red-800",
  life_threatening: "bg-red-600 text-white",
};

/**
 * Full allergies / problem list / weight panel for a patient: record, edit,
 * confirm or rule out allergies (or "no known allergies"), manage ongoing
 * conditions, and log weight & height. readOnly shows the same information
 * without any controls.
 */
export default function ClinicalRecordPanel({ patientId, readOnly = false }: { patientId: number; readOnly?: boolean }) {
  const key = clinicalKey(patientId);
  const { data, isLoading, mutate } = useSWR<ClinicalSummary>(key, fetcher);

  const refresh = () => {
    mutate();
    globalMutate(key);
  };

  if (isLoading || !data) {
    return <div className="h-40 rounded-xl bg-gray-50 animate-pulse" />;
  }

  return (
    <div className="space-y-6">
      <AllergySection patientId={patientId} data={data} readOnly={readOnly} onChanged={refresh} />
      <ProblemSection patientId={patientId} problems={data.problems} readOnly={readOnly} onChanged={refresh} />
      <MeasurementSection patientId={patientId} data={data} readOnly={readOnly} onChanged={refresh} />
    </div>
  );
}

// ─── Allergies ────────────────────────────────────────────────────────────────

type AllergyForm = {
  category: AllergyRow["category"];
  generic: GenericOption | null;
  drugClassId: string;
  substance: string;
  type: AllergyRow["type"];
  reaction: string;
  severity: AllergyRow["severity"];
  verification: AllergyRow["verification"];
  onsetDate: string;
  notes: string;
};

const EMPTY_ALLERGY: AllergyForm = {
  category: "drug",
  generic: null,
  drugClassId: "",
  substance: "",
  type: "allergy",
  reaction: "",
  severity: "moderate",
  verification: "unconfirmed",
  onsetDate: "",
  notes: "",
};

function AllergySection({
  patientId,
  data,
  readOnly,
  onChanged,
}: {
  patientId: number;
  data: ClinicalSummary;
  readOnly: boolean;
  onChanged: () => void;
}) {
  const [editing, setEditing] = useState<"new" | number | null>(null);
  const [form, setForm] = useState<AllergyForm>(EMPTY_ALLERGY);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const { data: classes = [] } = useSWR<DrugClassOption[]>(editing !== null ? "/api/drug-classes" : null, fetcher);

  const active = activeAllergies(data.allergies);
  const refuted = data.allergies.filter((a) => a.verification === "refuted");
  const base = `/api/patients/${patientId}`;

  const openNew = () => {
    setForm(EMPTY_ALLERGY);
    setError("");
    setEditing("new");
  };
  const openEdit = (a: AllergyRow) => {
    setForm({
      category: a.category,
      generic: null,
      drugClassId: a.drugClassId ? String(a.drugClassId) : "",
      substance: a.substance,
      type: a.type,
      reaction: a.reaction ?? "",
      severity: a.severity,
      verification: a.verification,
      onsetDate: a.onsetDate ?? "",
      notes: a.notes ?? "",
    });
    setError("");
    setEditing(a.id);
  };

  const save = async () => {
    setError("");
    setBusy(true);
    const existing = typeof editing === "number" ? data.allergies.find((a) => a.id === editing) : null;
    const body = {
      category: form.category,
      // Editing a drug allergy without re-picking the drug keeps its link.
      genericId:
        form.category === "drug"
          ? form.generic?.id ?? (existing?.category === "drug" && form.substance.trim() === existing.substance ? existing.genericId : null)
          : null,
      drugClassId: form.category === "drug_class" ? Number(form.drugClassId) : null,
      substance: form.category === "drug" && form.generic ? form.generic.name : form.substance,
      type: form.type,
      reaction: form.reaction,
      severity: form.severity,
      verification: form.verification,
      onsetDate: form.onsetDate,
      notes: form.notes,
    };
    const err = editing === "new"
      ? await send(`${base}/allergies`, "POST", body)
      : await send(`${base}/allergies/${editing}`, "PATCH", body);
    setBusy(false);
    if (err) {
      setError(err);
      return;
    }
    setEditing(null);
    onChanged();
  };

  const quick = async (url: string, method: string, body?: unknown) => {
    setBusy(true);
    const err = await send(url, method, body);
    setBusy(false);
    if (err) alert(err);
    else onChanged();
  };

  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-bold text-gray-800">
          <ExclamationTriangleIcon className="h-4.5 w-4.5 text-red-600" />
          Allergies &amp; intolerances
        </h3>
        {!readOnly && editing === null && (
          <button onClick={openNew} className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-800">
            <PlusIcon className="h-4 w-4" />
            Add allergy
          </button>
        )}
      </div>

      {editing !== null && (
        <div className="mb-3 space-y-3 rounded-xl border border-gray-200 bg-gray-50 p-4">
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className={labelClass}>
              Allergic to
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value as AllergyForm["category"] })}
                className={inputClass}
              >
                <option value="drug">A specific drug</option>
                <option value="drug_class">A drug family (e.g. all penicillins)</option>
                <option value="food">A food</option>
                <option value="environment">Environment (latex, dust, insect stings…)</option>
                <option value="other">Other</option>
              </select>
            </label>
            <label className={labelClass}>
              Type
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as AllergyForm["type"] })} className={inputClass}>
                <option value="allergy">Allergy (immune reaction)</option>
                <option value="intolerance">Intolerance / side effect</option>
              </select>
            </label>
          </div>

          {form.category === "drug" && (
            <div className="space-y-2">
              <GenericSelect
                label="Drug (active ingredient)"
                value={form.generic}
                onChange={(g) => setForm({ ...form, generic: g, substance: g ? g.name : form.substance })}
                allowCreate={false}
              />
              <label className={labelClass}>
                …or type the drug name if it isn&apos;t in the list
                <input
                  type="text"
                  value={form.generic ? "" : form.substance}
                  disabled={!!form.generic}
                  onChange={(e) => setForm({ ...form, substance: e.target.value })}
                  placeholder="e.g. Amoxicillin"
                  className={inputClass}
                />
              </label>
            </div>
          )}
          {form.category === "drug_class" && (
            <label className={labelClass}>
              Drug family
              <select value={form.drugClassId} onChange={(e) => setForm({ ...form, drugClassId: e.target.value })} className={inputClass}>
                <option value="">Select…</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                    {c.isBuiltIn ? "" : " (this hospital)"}
                  </option>
                ))}
              </select>
            </label>
          )}
          {(form.category === "food" || form.category === "environment" || form.category === "other") && (
            <label className={labelClass}>
              Substance
              <input
                type="text"
                value={form.substance}
                onChange={(e) => setForm({ ...form, substance: e.target.value })}
                placeholder={form.category === "food" ? "e.g. Groundnuts, shellfish, eggs" : "e.g. Latex, bee stings"}
                className={inputClass}
              />
            </label>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label className={labelClass}>
              Severity
              <select value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value as AllergyForm["severity"] })} className={inputClass}>
                {(Object.keys(SEVERITY_LABEL) as AllergyRow["severity"][]).map((k) => (
                  <option key={k} value={k}>{SEVERITY_LABEL[k]}</option>
                ))}
              </select>
            </label>
            <label className={labelClass}>
              How sure
              <select
                value={form.verification}
                onChange={(e) => setForm({ ...form, verification: e.target.value as AllergyForm["verification"] })}
                className={inputClass}
              >
                <option value="unconfirmed">Reported by patient / unconfirmed</option>
                <option value="confirmed">Confirmed</option>
                <option value="refuted">Ruled out (tested — not allergic)</option>
              </select>
            </label>
            <label className={labelClass}>
              When it started <span className="font-normal text-gray-400">(year is fine)</span>
              <input type="text" value={form.onsetDate} onChange={(e) => setForm({ ...form, onsetDate: e.target.value })} placeholder="e.g. 2019" className={inputClass} />
            </label>
          </div>
          <label className={labelClass}>
            Reaction
            <input
              type="text"
              value={form.reaction}
              onChange={(e) => setForm({ ...form, reaction: e.target.value })}
              placeholder="e.g. Rash, swollen lips, difficulty breathing"
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            Notes <span className="font-normal text-gray-400">(optional)</span>
            <input type="text" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className={inputClass} />
          </label>
          <div className="flex justify-end gap-2">
            <button onClick={() => setEditing(null)} className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
              Cancel
            </button>
            <button onClick={save} disabled={busy} className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {busy ? "Saving..." : "Save allergy"}
            </button>
          </div>
        </div>
      )}

      {active.length === 0 ? (
        data.allergyStatus === "nkda" ? (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
            <span className="inline-flex items-center gap-2">
              <CheckCircleIcon className="h-5 w-5" />
              <span>
                <span className="font-semibold">No known allergies</span>
                {data.allergyStatusUpdatedAt && <span className="text-green-700"> · recorded {formatDate(data.allergyStatusUpdatedAt)}</span>}
              </span>
            </span>
            {!readOnly && (
              <button disabled={busy} onClick={() => quick(`/api/patients/${patientId}/allergy-status`, "PUT", { status: "not_assessed" })} className="text-xs font-medium text-green-700 hover:underline">
                Undo
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <span>
              <span className="font-semibold">Allergies not yet recorded.</span> Ask the patient (and check old notes).
            </span>
            {!readOnly && (
              <button
                disabled={busy}
                onClick={() => quick(`/api/patients/${patientId}/allergy-status`, "PUT", { status: "nkda" })}
                className="rounded-lg border border-green-300 bg-white px-3 py-1.5 text-xs font-semibold text-green-700 hover:bg-green-50"
              >
                Patient has no known allergies
              </button>
            )}
          </div>
        )
      ) : (
        <ul className="space-y-2">
          {active.map((a) =>
            editing === a.id ? null : (
              <li key={a.id} className="rounded-xl border border-red-200 bg-white px-4 py-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900">
                      {a.substance}
                      <span className="ml-2 text-xs font-normal text-gray-500">
                        {CATEGORY_LABEL[a.category]} {a.type === "intolerance" ? "intolerance" : "allergy"}
                      </span>
                    </p>
                    {a.reaction && <p className="text-sm text-gray-700">Reaction: {a.reaction}</p>}
                    <p className="text-xs text-gray-500">
                      {a.verification === "confirmed" ? "Confirmed" : "Unconfirmed (reported)"}
                      {a.onsetDate && ` · since ${a.onsetDate}`}
                      {a.recordedByFirstname && ` · recorded by ${a.recordedByFirstname} ${a.recordedByLastname ?? ""}`}
                      {` · ${formatDate(a.createdAt)}`}
                    </p>
                    {a.notes && <p className="text-xs text-gray-500">{a.notes}</p>}
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${SEVERITY_STYLE[a.severity]}`}>
                    {SEVERITY_LABEL[a.severity]}
                  </span>
                </div>
                {!readOnly && (
                  <div className="mt-2 flex flex-wrap gap-3 text-xs font-medium">
                    <button onClick={() => openEdit(a)} className="text-blue-600 hover:text-blue-800">Edit</button>
                    {a.verification !== "confirmed" && (
                      <button disabled={busy} onClick={() => quick(`/api/patients/${patientId}/allergies/${a.id}`, "PATCH", { verification: "confirmed" })} className="text-gray-600 hover:text-gray-900">
                        Mark confirmed
                      </button>
                    )}
                    <button
                      disabled={busy}
                      onClick={() => {
                        if (confirm(`Rule out the ${a.substance} allergy? Use this when testing shows the patient is not allergic.`)) {
                          quick(`/api/patients/${patientId}/allergies/${a.id}`, "PATCH", { verification: "refuted" });
                        }
                      }}
                      className="text-gray-600 hover:text-gray-900"
                    >
                      Rule out
                    </button>
                    <button
                      disabled={busy}
                      onClick={() => {
                        if (confirm(`Remove ${a.substance}? Only do this if it was entered by mistake.`)) {
                          quick(`/api/patients/${patientId}/allergies/${a.id}`, "DELETE");
                        }
                      }}
                      className="text-red-600 hover:text-red-800"
                    >
                      Entered in error
                    </button>
                  </div>
                )}
              </li>
            ),
          )}
        </ul>
      )}
      {refuted.length > 0 && (
        <p className="mt-2 text-xs text-gray-500">
          Ruled out: {refuted.map((a) => a.substance).join(", ")}
        </p>
      )}
    </section>
  );
}

// ─── Problem list ─────────────────────────────────────────────────────────────

interface Icd11Result {
  code: string;
  title: string;
}

function IcdSearch({ onPick }: { onPick: (r: Icd11Result) => void }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Icd11Result[]>([]);
  const [open, setOpen] = useState(false);
  const timer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    const term = q.trim();
    if (term.length < 2) return;
    timer.current = setTimeout(async () => {
      const res = await fetch(`/api/icd11?q=${encodeURIComponent(term)}`);
      if (res.ok) {
        setResults(await res.json());
        setOpen(true);
      }
    }, 250);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [q]);

  return (
    <div className="relative">
      <input
        type="text"
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          if (e.target.value.trim().length < 2) setResults([]);
        }}
        onFocus={() => results.length > 0 && setOpen(true)}
        placeholder="Search ICD-11, e.g. hypertension, diabetes, sickle cell"
        className={inputClass}
      />
      {open && results.length > 0 && (
        <ul className="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
          {results.slice(0, 12).map((r) => (
            <li key={r.code}>
              <button
                type="button"
                onClick={() => {
                  onPick(r);
                  setQ("");
                  setResults([]);
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50"
              >
                <span className="shrink-0 rounded bg-slate-900 px-1.5 py-0.5 font-mono text-[11px] font-bold text-white">{r.code}</span>
                <span className="text-gray-800">{r.title}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ProblemSection({
  patientId,
  problems,
  readOnly,
  onChanged,
}: {
  patientId: number;
  problems: ProblemRow[];
  readOnly: boolean;
  onChanged: () => void;
}) {
  const [adding, setAdding] = useState(false);
  const [picked, setPicked] = useState<Icd11Result | null>(null);
  const [freeText, setFreeText] = useState("");
  const [onsetDate, setOnsetDate] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [showResolved, setShowResolved] = useState(false);

  const current = problems.filter((p) => p.status !== "resolved");
  const resolved = problems.filter((p) => p.status === "resolved");
  const base = `/api/patients/${patientId}/problems`;

  const reset = () => {
    setAdding(false);
    setPicked(null);
    setFreeText("");
    setOnsetDate("");
    setNotes("");
    setError("");
  };

  const add = async () => {
    setError("");
    setBusy(true);
    const err = await send(base, "POST", {
      icdCode: picked?.code ?? null,
      clinicalText: picked ? null : freeText,
      onsetDate,
      notes,
    });
    setBusy(false);
    if (err) setError(err);
    else {
      reset();
      onChanged();
    }
  };

  const setStatus = async (p: ProblemRow, status: ProblemRow["status"]) => {
    setBusy(true);
    const err = await send(`${base}/${p.id}`, "PATCH", { status });
    setBusy(false);
    if (err) alert(err);
    else onChanged();
  };

  const remove = async (p: ProblemRow) => {
    if (!confirm(`Remove “${problemLabel(p)}”? Only do this if it was added by mistake — use Resolved if the patient no longer has it.`)) return;
    setBusy(true);
    const err = await send(`${base}/${p.id}`, "DELETE");
    setBusy(false);
    if (err) alert(err);
    else onChanged();
  };

  const row = (p: ProblemRow) => (
    <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5">
      <div className="min-w-0">
        <p className="text-sm font-medium text-gray-900">
          {p.icdCode && <span className="mr-2 rounded bg-slate-900 px-1.5 py-0.5 font-mono text-[11px] font-bold text-white">{p.icdCode}</span>}
          {problemLabel(p)}
          {p.status === "inactive" && <span className="ml-2 text-xs font-normal text-gray-500">(inactive)</span>}
        </p>
        <p className="text-xs text-gray-500">
          {p.onsetDate ? `Since ${p.onsetDate}` : "Onset not recorded"}
          {p.resolvedDate && ` · resolved ${p.resolvedDate}`}
          {p.sourceVisitId && " · from a consultation"}
          {p.notes && ` · ${p.notes}`}
        </p>
      </div>
      {!readOnly && (
        <div className="flex gap-3 text-xs font-medium">
          {p.status === "resolved" ? (
            <button disabled={busy} onClick={() => setStatus(p, "active")} className="text-blue-600 hover:text-blue-800">Reactivate</button>
          ) : (
            <button disabled={busy} onClick={() => setStatus(p, "resolved")} className="text-gray-600 hover:text-gray-900">Resolved</button>
          )}
          <button disabled={busy} onClick={() => remove(p)} className="text-red-600 hover:text-red-800">Entered in error</button>
        </div>
      )}
    </li>
  );

  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-bold text-gray-800">
          <HeartIcon className="h-4.5 w-4.5 text-blue-600" />
          Ongoing conditions (problem list)
        </h3>
        {!readOnly && !adding && (
          <button onClick={() => setAdding(true)} className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-800">
            <PlusIcon className="h-4 w-4" />
            Add condition
          </button>
        )}
      </div>

      {adding && (
        <div className="mb-3 space-y-3 rounded-xl border border-gray-200 bg-gray-50 p-4">
          {error && <p className="text-sm text-red-600">{error}</p>}
          {picked ? (
            <div className="flex items-center justify-between rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm">
              <span>
                <span className="mr-2 rounded bg-slate-900 px-1.5 py-0.5 font-mono text-[11px] font-bold text-white">{picked.code}</span>
                {picked.title}
              </span>
              <button onClick={() => setPicked(null)} className="text-xs font-medium text-blue-600">Change</button>
            </div>
          ) : (
            <>
              <IcdSearch onPick={setPicked} />
              <label className={labelClass}>
                …or describe it if you can&apos;t find the code
                <input type="text" value={freeText} onChange={(e) => setFreeText(e.target.value)} className={inputClass} />
              </label>
            </>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className={labelClass}>
              Since <span className="font-normal text-gray-400">(year is fine)</span>
              <input type="text" value={onsetDate} onChange={(e) => setOnsetDate(e.target.value)} placeholder="e.g. 2018" className={inputClass} />
            </label>
            <label className={labelClass}>
              Notes <span className="font-normal text-gray-400">(optional)</span>
              <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. On amlodipine, well controlled" className={inputClass} />
            </label>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={reset} className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
              Cancel
            </button>
            <button
              onClick={add}
              disabled={busy || (!picked && !freeText.trim())}
              className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {busy ? "Saving..." : "Add to problem list"}
            </button>
          </div>
        </div>
      )}

      {current.length === 0 ? (
        <p className="rounded-xl border border-dashed border-gray-300 px-4 py-3 text-sm text-gray-500">No ongoing conditions recorded.</p>
      ) : (
        <ul className="space-y-2">{current.map(row)}</ul>
      )}
      {resolved.length > 0 && (
        <div className="mt-2">
          <button onClick={() => setShowResolved((v) => !v)} className="text-xs font-medium text-gray-500 hover:text-gray-700">
            {showResolved ? "Hide" : "Show"} resolved ({resolved.length})
          </button>
          {showResolved && <ul className="mt-2 space-y-2">{resolved.map(row)}</ul>}
        </div>
      )}
    </section>
  );
}

// ─── Weight & height ──────────────────────────────────────────────────────────

function MeasurementSection({
  patientId,
  data,
  readOnly,
  onChanged,
}: {
  patientId: number;
  data: ClinicalSummary;
  readOnly: boolean;
  onChanged: () => void;
}) {
  const [adding, setAdding] = useState(false);
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [reported, setReported] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const base = `/api/patients/${patientId}/measurements`;

  const save = async () => {
    setError("");
    setBusy(true);
    const err = await send(base, "POST", { weightKg: weight, heightCm: height, source: reported ? "reported" : "measured" });
    setBusy(false);
    if (err) setError(err);
    else {
      setAdding(false);
      setWeight("");
      setHeight("");
      setReported(false);
      onChanged();
    }
  };

  const remove = async (id: number) => {
    if (!confirm("Remove this reading? Only do this if it was entered by mistake.")) return;
    const err = await send(`${base}/${id}`, "DELETE");
    if (err) alert(err);
    else onChanged();
  };

  const { latest } = data;

  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-bold text-gray-800">
          <ScaleIcon className="h-4.5 w-4.5 text-gray-600" />
          Weight &amp; height
        </h3>
        {!readOnly && !adding && (
          <button onClick={() => setAdding(true)} className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-800">
            <PlusIcon className="h-4 w-4" />
            Record
          </button>
        )}
      </div>

      {adding && (
        <div className="mb-3 space-y-3 rounded-xl border border-gray-200 bg-gray-50 p-4">
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="grid grid-cols-2 gap-3">
            <label className={labelClass}>
              Weight (kg)
              <input type="number" step="0.1" min={0} value={weight} onChange={(e) => setWeight(e.target.value)} className={inputClass} autoFocus />
            </label>
            <label className={labelClass}>
              Height (cm) <span className="font-normal text-gray-400">(optional)</span>
              <input type="number" step="0.5" min={0} value={height} onChange={(e) => setHeight(e.target.value)} className={inputClass} />
            </label>
          </div>
          <label className="inline-flex items-center gap-2 text-xs text-gray-600">
            <input type="checkbox" checked={reported} onChange={(e) => setReported(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-blue-600" />
            Reported by the patient (not weighed here)
          </label>
          <div className="flex justify-end gap-2">
            <button onClick={() => setAdding(false)} className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
              Cancel
            </button>
            <button onClick={save} disabled={busy || (!weight && !height)} className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {busy ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      )}

      {data.measurements.length === 0 ? (
        <p className="rounded-xl border border-dashed border-gray-300 px-4 py-3 text-sm text-gray-500">No weight recorded.</p>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white">
          <div className="flex flex-wrap gap-6 px-4 py-3">
            <div>
              <p className="text-xs text-gray-500">Weight</p>
              <p className="text-lg font-bold text-gray-900">{latest.weightKg != null ? `${latest.weightKg} kg` : "—"}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Height</p>
              <p className="text-lg font-bold text-gray-900">{latest.heightCm != null ? `${latest.heightCm} cm` : "—"}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">BMI</p>
              <p className="text-lg font-bold text-gray-900">{latest.bmi ?? "—"}</p>
            </div>
          </div>
          <ul className="divide-y divide-gray-100 border-t border-gray-100">
            {data.measurements.slice(0, 5).map((m) => (
              <li key={m.id} className="flex items-center justify-between px-4 py-2 text-xs text-gray-600">
                <span>
                  {formatDate(m.measuredAt)} ·{" "}
                  {[m.weightKg != null && `${m.weightKg} kg`, m.heightCm != null && `${m.heightCm} cm`].filter(Boolean).join(", ")}
                  {m.source === "reported" && " (reported)"}
                  {m.recordedByFirstname && ` · ${m.recordedByFirstname} ${m.recordedByLastname ?? ""}`}
                </span>
                {!readOnly && (
                  <button onClick={() => remove(m.id)} className="font-medium text-red-600 hover:text-red-800">Remove</button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

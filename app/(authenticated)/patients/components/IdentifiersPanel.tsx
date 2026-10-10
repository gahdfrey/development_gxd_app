"use client";

import { useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { PlusIcon } from "@heroicons/react/24/outline";

interface Identifier {
  id: number;
  system: string;
  value: string;
  assigner: string | null;
  notes: string | null;
  sourceMergeId: number | null;
}

const SYSTEM_LABEL: Record<string, string> = {
  legacy_mrn: "Previous hospital / MRN number",
  birth_certificate: "Birth certificate",
  passport: "Passport",
  nhia: "NHIA number",
  insurance: "Insurance number",
  voters_card: "Voter's card",
  drivers_licence: "Driver's licence",
  other: "Other",
};

/** Extra identifiers (previous MRNs incl. merged records, NHIA no., …) — all searchable. */
export default function IdentifiersPanel({ patientId }: { patientId: number }) {
  const key = `/api/patients/${patientId}/identifiers`;
  const { data: rows = [], mutate } = useSWR<Identifier[]>(key, fetcher);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ system: "legacy_mrn", value: "", assigner: "" });
  const [error, setError] = useState("");

  const save = async () => {
    setError("");
    const res = await fetch(key, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const body = await res.json();
    if (!res.ok) {
      setError(body.error || "Failed to save");
      return;
    }
    setAdding(false);
    setForm({ system: "legacy_mrn", value: "", assigner: "" });
    mutate();
  };

  const remove = async (id: number) => {
    if (!confirm("Remove this number? Only if it was entered by mistake.")) return;
    const res = await fetch(`${key}/${id}`, { method: "DELETE" });
    if (res.ok) mutate();
  };

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Other identifiers</h3>
        {!adding && (
          <button onClick={() => setAdding(true)} className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-800">
            <PlusIcon className="h-4 w-4" /> Add
          </button>
        )}
      </div>
      {adding && (
        <div className="mb-2 space-y-2 rounded-xl border border-gray-200 bg-gray-50 p-3">
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <select value={form.system} onChange={(e) => setForm({ ...form, system: e.target.value })} className="rounded-lg border border-gray-300 bg-white px-2 py-2 text-sm">
              {Object.entries(SYSTEM_LABEL).map(([k, l]) => (
                <option key={k} value={k}>{l}</option>
              ))}
            </select>
            <input value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} placeholder="Number" className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            <input value={form.assigner} onChange={(e) => setForm({ ...form, assigner: e.target.value })} placeholder="Issued by (optional)" className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setAdding(false)} className="px-3 py-1.5 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg">Cancel</button>
            <button onClick={save} disabled={!form.value.trim()} className="px-3 py-1.5 text-sm text-white bg-blue-600 rounded-lg disabled:opacity-50">Save</button>
          </div>
        </div>
      )}
      {rows.length === 0 ? (
        <p className="text-sm text-gray-400">None recorded.</p>
      ) : (
        <ul className="space-y-1">
          {rows.map((r) => (
            <li key={r.id} className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2 text-sm">
              <span>
                <span className="text-gray-500">{SYSTEM_LABEL[r.system] ?? r.system}:</span>{" "}
                <span className="font-medium text-gray-900">{r.value}</span>
                {r.assigner && <span className="text-gray-500"> · {r.assigner}</span>}
                {r.sourceMergeId && <span className="text-xs text-blue-700"> · from merged record</span>}
              </span>
              <button onClick={() => remove(r.id)} className="text-xs text-red-500 hover:text-red-700">remove</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

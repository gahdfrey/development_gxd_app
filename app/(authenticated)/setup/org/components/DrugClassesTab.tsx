"use client";

import { useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import Modal from "@/app/components/ui/Modal";
import { PlusIcon } from "@heroicons/react/24/outline";

interface DrugClassRow {
  id: number;
  name: string;
  description: string | null;
  members: string[];
  crossReactsWith: string[] | null;
  isBuiltIn: boolean;
}

/**
 * Drug families used to catch class-level allergies (e.g. a penicillin
 * allergy flagging Amoxicillin). Built-in families are shared and read-only;
 * the pharmacist can add hospital-specific ones by listing active
 * ingredient names.
 */
export default function DrugClassesTab() {
  const { data: classes = [], mutate, isLoading } = useSWR<DrugClassRow[]>("/api/drug-classes", fetcher);
  const [editing, setEditing] = useState<DrugClassRow | "new" | null>(null);
  const [form, setForm] = useState({ name: "", description: "", members: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const open = (c: DrugClassRow | "new") => {
    setForm(c === "new" ? { name: "", description: "", members: "" } : { name: c.name, description: c.description ?? "", members: c.members.join(", ") });
    setError("");
    setEditing(c);
  };

  const save = async () => {
    setError("");
    setBusy(true);
    try {
      const isNew = editing === "new";
      const res = await fetch(isNew ? "/api/drug-classes" : `/api/drug-classes/${(editing as DrugClassRow).id}`, {
        method: isNew ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to save");
        return;
      }
      setEditing(null);
      mutate();
    } finally {
      setBusy(false);
    }
  };

  const remove = async (c: DrugClassRow) => {
    if (!confirm(`Remove the drug family “${c.name}”? Allergies recorded against it will no longer match new prescriptions.`)) return;
    const res = await fetch(`/api/drug-classes/${c.id}`, { method: "DELETE" });
    if (!res.ok) alert((await res.json()).error || "Failed to remove");
    else mutate();
  };

  const own = classes.filter((c) => !c.isBuiltIn);
  const builtIn = classes.filter((c) => c.isBuiltIn);
  const inputClass = "mt-1 w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500";

  const card = (c: DrugClassRow) => (
    <li key={c.id} className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-gray-900">{c.name}</p>
          {c.description && <p className="text-xs text-gray-500">{c.description}</p>}
        </div>
        {!c.isBuiltIn && (
          <div className="flex shrink-0 gap-3 text-xs font-medium">
            <button onClick={() => open(c)} className="text-blue-600 hover:text-blue-800">Edit</button>
            <button onClick={() => remove(c)} className="text-red-600 hover:text-red-800">Remove</button>
          </div>
        )}
      </div>
      <p className="mt-2 text-xs text-gray-700">{c.members.join(", ")}</p>
      {c.crossReactsWith && c.crossReactsWith.length > 0 && (
        <p className="mt-1 text-xs text-amber-700">Can cross-react with: {c.crossReactsWith.map((k) => k.replace(/_/g, " ")).join(", ")}</p>
      )}
    </li>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <p className="text-sm text-gray-600 max-w-2xl">
          Drug families let one allergy cover a whole group — e.g. a penicillin allergy also warns on Amoxicillin and
          Ampiclox. Matching uses active-ingredient names, so list them as they appear in your drug list.
        </p>
        <button onClick={() => open("new")} className="inline-flex items-center gap-2 self-start px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">
          <PlusIcon className="h-4 w-4" />
          Add drug family
        </button>
      </div>

      {isLoading ? (
        <div className="h-32 rounded-xl bg-gray-50 animate-pulse" />
      ) : (
        <>
          <div>
            <h3 className="mb-2 text-sm font-bold text-gray-800">This hospital&apos;s families</h3>
            {own.length === 0 ? (
              <p className="rounded-xl border border-dashed border-gray-300 px-4 py-3 text-sm text-gray-500">None added yet.</p>
            ) : (
              <ul className="grid grid-cols-1 lg:grid-cols-2 gap-3">{own.map(card)}</ul>
            )}
          </div>
          <div>
            <h3 className="mb-2 text-sm font-bold text-gray-800">Built-in families ({builtIn.length})</h3>
            <ul className="grid grid-cols-1 lg:grid-cols-2 gap-3">{builtIn.map(card)}</ul>
          </div>
        </>
      )}

      <Modal isOpen={editing !== null} onClose={() => setEditing(null)} title={editing === "new" ? "Add drug family" : "Edit drug family"}>
        <div className="space-y-4">
          {error && <p className="text-sm text-red-600">{error}</p>}
          <label className="block text-sm font-medium text-gray-700">
            Name
            <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Antiretrovirals (NNRTIs)" className={inputClass} />
          </label>
          <label className="block text-sm font-medium text-gray-700">
            Active ingredients <span className="font-normal text-gray-400">(comma or one per line)</span>
            <textarea rows={4} value={form.members} onChange={(e) => setForm({ ...form, members: e.target.value })} placeholder="nevirapine, efavirenz" className={inputClass} />
          </label>
          <label className="block text-sm font-medium text-gray-700">
            Description <span className="font-normal text-gray-400">(optional)</span>
            <input type="text" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={inputClass} />
          </label>
          <div className="flex justify-end gap-3">
            <button onClick={() => setEditing(null)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
            <button onClick={save} disabled={busy} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {busy ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

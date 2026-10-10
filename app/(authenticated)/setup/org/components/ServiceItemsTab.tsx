"use client";

import { useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import Modal from "@/app/components/ui/Modal";
import { PlusIcon } from "@heroicons/react/24/outline";
import { SERVICE_CATEGORIES } from "@/lib/billing/serviceItems";
import { TAX_CODES, TAX_CODE_KEYS, DEFAULT_TAX_CODE } from "@/lib/billing/tax";

interface ServiceItem {
  id: number;
  name: string;
  category: keyof typeof SERVICE_CATEGORIES;
  price: number;
  taxCode: string;
  isActive: boolean;
}

const EMPTY = { name: "", category: "consultation", price: "", taxCode: DEFAULT_TAX_CODE, isActive: true };

/** Setup → Services: chargeable services that aren't a lab test or a product. */
export default function ServiceItemsTab() {
  const { data: rows = [], mutate } = useSWR<ServiceItem[]>("/api/service-items", fetcher);
  const [editing, setEditing] = useState<ServiceItem | "new" | null>(null);
  const [form, setForm] = useState<typeof EMPTY>(EMPTY);
  const [error, setError] = useState("");

  const open = (s: ServiceItem | "new") => {
    setForm(s === "new" ? EMPTY : { name: s.name, category: s.category, price: String(s.price), taxCode: s.taxCode as typeof DEFAULT_TAX_CODE, isActive: s.isActive });
    setError("");
    setEditing(s);
  };

  const save = async () => {
    setError("");
    const isNew = editing === "new";
    const res = await fetch(isNew ? "/api/service-items" : `/api/service-items/${(editing as ServiceItem).id}`, {
      method: isNew ? "POST" : "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, price: Number(form.price) }),
    });
    const body = await res.json();
    if (!res.ok) return setError(body.error || "Failed to save");
    setEditing(null);
    mutate();
  };

  const remove = async (s: ServiceItem) => {
    if (!confirm(`Remove “${s.name}”? It can no longer be charged; existing bills keep it.`)) return;
    const res = await fetch(`/api/service-items/${s.id}`, { method: "DELETE" });
    if (res.ok) mutate();
  };

  const input = "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <p className="text-sm text-gray-600 max-w-2xl">
          Services charged to a patient&apos;s bill that aren&apos;t a lab test or a drug — consultation, nursing care, procedures,
          theatre, registration, feeding. Bed charges are set per ward (Admission → Wards &amp; Beds).
        </p>
        <button onClick={() => open("new")} className="inline-flex items-center gap-2 self-start rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
          <PlusIcon className="h-4 w-4" /> Add service
        </button>
      </div>
      {rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-gray-300 px-4 py-6 text-center text-sm text-gray-500">No services yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {["Service", "Category", "Price", "VAT", ""].map((h) => (
                  <th key={h} className="px-4 py-2 text-left text-xs font-semibold uppercase text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((s) => (
                <tr key={s.id} className={s.isActive ? "" : "opacity-60"}>
                  <td className="px-4 py-2 font-medium text-gray-900">{s.name}{!s.isActive && <span className="ml-2 text-xs text-gray-500">(inactive)</span>}</td>
                  <td className="px-4 py-2 text-gray-600">{SERVICE_CATEGORIES[s.category] ?? s.category}</td>
                  <td className="px-4 py-2 text-gray-900">₦{s.price.toLocaleString()}</td>
                  <td className="px-4 py-2 text-xs text-gray-500">{TAX_CODES[s.taxCode as keyof typeof TAX_CODES]?.label ?? s.taxCode}</td>
                  <td className="px-4 py-2 text-right text-xs">
                    <button onClick={() => open(s)} className="font-medium text-blue-600">Edit</button>
                    <button onClick={() => remove(s)} className="ml-3 font-medium text-red-600">Remove</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Modal isOpen={editing !== null} onClose={() => setEditing(null)} title={editing === "new" ? "Add service" : "Edit service"}>
        <div className="space-y-3">
          {error && <p className="text-sm text-red-600">{error}</p>}
          <label className="block text-sm font-medium text-gray-700">
            Name
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Specialist consultation" className={input} />
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block text-sm font-medium text-gray-700">
              Category
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className={`${input} bg-white`}>
                {Object.entries(SERVICE_CATEGORIES).map(([k, l]) => (
                  <option key={k} value={k}>{l}</option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-medium text-gray-700">
              Price (₦)
              <input value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} inputMode="numeric" className={input} />
            </label>
          </div>
          <label className="block text-sm font-medium text-gray-700">
            VAT
            <select value={form.taxCode} onChange={(e) => setForm({ ...form, taxCode: e.target.value as typeof DEFAULT_TAX_CODE })} className={`${input} bg-white`}>
              {TAX_CODE_KEYS.map((k) => (
                <option key={k} value={k}>{TAX_CODES[k].label}</option>
              ))}
            </select>
          </label>
          <label className="inline-flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="h-4 w-4 rounded border-gray-300 text-blue-600" />
            Available to charge
          </label>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setEditing(null)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg">Cancel</button>
            <button onClick={save} disabled={!form.name.trim() || form.price === ""} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg disabled:opacity-50">Save</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

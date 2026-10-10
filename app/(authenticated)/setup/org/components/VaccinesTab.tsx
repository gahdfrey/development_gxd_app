"use client";

import { useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import Modal from "@/app/components/ui/Modal";
import { PlusIcon } from "@heroicons/react/24/outline";
import { TAX_CODES, TAX_CODE_KEYS, DEFAULT_TAX_CODE } from "@/lib/billing/tax";
import { INTERVAL_UNIT_OPTIONS, type Vaccine } from "../../../components/vaccination/shared";

const EMPTY = {
  name: "",
  description: "",
  doseCount: "1",
  intervalValue: "1",
  intervalUnit: "month",
  price: "",
  taxCode: DEFAULT_TAX_CODE as string,
  isActive: true,
};

function schedule(v: Vaccine): string {
  if (v.doseCount <= 1 || v.intervalValue <= 0) return "Single dose";
  return `${v.doseCount} doses · every ${v.intervalValue} ${v.intervalUnit}${v.intervalValue === 1 ? "" : "s"}`;
}

/** Setup → Vaccines: the vaccines this hospital gives, priced per dose. */
export default function VaccinesTab() {
  const { data: rows = [], mutate } = useSWR<Vaccine[]>("/api/vaccines", fetcher);
  const [editing, setEditing] = useState<Vaccine | "new" | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState("");

  const open = (v: Vaccine | "new") => {
    setForm(
      v === "new"
        ? EMPTY
        : {
            name: v.name,
            description: v.description ?? "",
            doseCount: String(v.doseCount),
            intervalValue: String(v.intervalValue || 1),
            intervalUnit: v.intervalUnit,
            price: String(v.price),
            taxCode: v.taxCode,
            isActive: v.isActive,
          },
    );
    setError("");
    setEditing(v);
  };

  const save = async () => {
    setError("");
    const isNew = editing === "new";
    const res = await fetch(isNew ? "/api/vaccines" : `/api/vaccines/${(editing as Vaccine).id}`, {
      method: isNew ? "POST" : "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        price: Number(form.price),
        doseCount: Number(form.doseCount),
        intervalValue: Number(form.intervalValue),
      }),
    });
    const body = await res.json();
    if (!res.ok) return setError(body.error || "Failed to save");
    setEditing(null);
    mutate();
  };

  const remove = async (v: Vaccine) => {
    if (!confirm(`Remove “${v.name}”? It can no longer be booked; existing vaccinations and bills keep it.`)) return;
    const res = await fetch(`/api/vaccines/${v.id}`, { method: "DELETE" });
    if (res.ok) mutate();
  };

  const input = "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";
  const multiDose = Number(form.doseCount) > 1;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <p className="text-sm text-gray-600 max-w-2xl">
          The vaccines you give and their price per dose. Each dose is added to the patient&apos;s bill when a vaccination is
          booked. The usual schedule fills in the booking form, and staff can change it for each patient.
        </p>
        <button onClick={() => open("new")} className="inline-flex items-center gap-2 self-start rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
          <PlusIcon className="h-4 w-4" /> Add vaccine
        </button>
      </div>
      {rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-gray-300 px-4 py-6 text-center text-sm text-gray-500">No vaccines yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {["Vaccine", "Usual schedule", "Price per dose", "VAT", ""].map((h) => (
                  <th key={h} className="px-4 py-2 text-left text-xs font-semibold uppercase text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((v) => (
                <tr key={v.id} className={v.isActive ? "" : "opacity-60"}>
                  <td className="px-4 py-2">
                    <p className="font-medium text-gray-900">
                      {v.name}
                      {!v.isActive && <span className="ml-2 text-xs text-gray-500">(inactive)</span>}
                    </p>
                    {v.description && <p className="text-xs text-gray-500">{v.description}</p>}
                  </td>
                  <td className="px-4 py-2 text-gray-600">{schedule(v)}</td>
                  <td className="px-4 py-2 text-gray-900">₦{v.price.toLocaleString()}</td>
                  <td className="px-4 py-2 text-xs text-gray-500">{TAX_CODES[v.taxCode as keyof typeof TAX_CODES]?.label ?? v.taxCode}</td>
                  <td className="px-4 py-2 text-right text-xs whitespace-nowrap">
                    <button onClick={() => open(v)} className="font-medium text-blue-600">Edit</button>
                    <button onClick={() => remove(v)} className="ml-3 font-medium text-red-600">Remove</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Modal isOpen={editing !== null} onClose={() => setEditing(null)} title={editing === "new" ? "Add vaccine" : "Edit vaccine"}>
        <div className="space-y-3">
          {error && <p className="text-sm text-red-600">{error}</p>}
          <label className="block text-sm font-medium text-gray-700">
            Name
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Hepatitis B" className={input} />
          </label>
          <label className="block text-sm font-medium text-gray-700">
            Protects against / notes <span className="font-normal text-gray-400">(optional)</span>
            <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="e.g. Hepatitis B virus — adult schedule" className={input} />
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block text-sm font-medium text-gray-700">
              Price per dose (₦)
              <input value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} inputMode="numeric" className={input} />
            </label>
            <label className="block text-sm font-medium text-gray-700">
              VAT
              <select value={form.taxCode} onChange={(e) => setForm({ ...form, taxCode: e.target.value })} className={`${input} bg-white`}>
                {TAX_CODE_KEYS.map((k) => (
                  <option key={k} value={k}>{TAX_CODES[k].label}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="rounded-lg border border-gray-200 p-3 space-y-3">
            <p className="text-sm font-semibold text-gray-800">Usual schedule</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <label className="block text-sm font-medium text-gray-700">
                Doses
                <input type="number" min={1} max={20} value={form.doseCount} onChange={(e) => setForm({ ...form, doseCount: e.target.value })} className={input} />
              </label>
              {multiDose && (
                <>
                  <label className="block text-sm font-medium text-gray-700">
                    Every
                    <input type="number" min={1} value={form.intervalValue} onChange={(e) => setForm({ ...form, intervalValue: e.target.value })} className={input} />
                  </label>
                  <label className="block text-sm font-medium text-gray-700">
                    Unit
                    <select value={form.intervalUnit} onChange={(e) => setForm({ ...form, intervalUnit: e.target.value })} className={`${input} bg-white`}>
                      {INTERVAL_UNIT_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </label>
                </>
              )}
            </div>
          </div>
          <label className="inline-flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="h-4 w-4 rounded border-gray-300 text-blue-600" />
            Available to book
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

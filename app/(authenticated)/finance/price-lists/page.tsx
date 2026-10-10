"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import Modal from "@/app/components/ui/Modal";
import PermissionDenied from "@/app/components/ui/PermissionDenied";
import { useToast } from "@/app/contexts/ToastContext";
import { ArrowLeftIcon, PlusIcon } from "@heroicons/react/24/outline";
import { PAYER_TYPE_LABEL } from "../components/billing";

interface PriceListRow {
  id: number;
  name: string;
  payerType: string;
  hmoId: number;
  hmoName: string | null;
  effectiveFrom: string;
  effectiveTo: string | null;
  isActive: boolean;
  itemCount: number;
  updatedAt: string;
}

interface HmoOption {
  id: number;
  name: string;
}

function today(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Lagos" });
}

function listState(l: PriceListRow): { label: string; className: string } {
  const t = today();
  if (!l.isActive) return { label: "Inactive", className: "bg-gray-100 text-gray-600 border-gray-300" };
  if (l.effectiveFrom > t) return { label: "Scheduled", className: "bg-blue-50 text-blue-700 border-blue-200" };
  if (l.effectiveTo && l.effectiveTo < t) return { label: "Expired", className: "bg-amber-50 text-amber-700 border-amber-200" };
  return { label: "In effect", className: "bg-green-50 text-green-700 border-green-200" };
}

const EMPTY_FORM = {
  name: "",
  hmoId: "",
  payerType: "hmo",
  effectiveFrom: today(),
  effectiveTo: "",
  seed: "base_prices",
  notes: "",
};

export default function PriceListsPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const { data: lists = [], error, isLoading } = useSWR<PriceListRow[]>("/api/price-lists", fetcher);
  const { data: hmoOptions = [] } = useSWR<HmoOption[]>("/api/hmo", fetcher);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  if (error && (error.message?.includes("Forbidden") || error.message?.includes("permission"))) {
    return <PermissionDenied moduleName="Finance" />;
  }

  const handleCreate = async () => {
    setFormError("");
    setIsSaving(true);
    try {
      const res = await fetch("/api/price-lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, hmoId: Number(form.hmoId) }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || "Failed to create price list");
        return;
      }
      showToast("Price list created", "success");
      setIsCreateOpen(false);
      setForm(EMPTY_FORM);
      router.push(`/finance/price-lists/${data.id}`);
    } catch {
      setFormError("Failed to create price list");
    } finally {
      setIsSaving(false);
    }
  };

  const inputClass =
    "w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <Link href="/finance" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeftIcon className="h-4 w-4" />
          Finance
        </Link>
        <div className="mt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">HMO Price Lists</h1>
            <p className="text-gray-600 text-sm mt-1">
              Negotiated tariffs per HMO. Patients on an HMO are billed from their HMO&apos;s list; everyone else pays
              the standard (self-pay) price.
            </p>
          </div>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex items-center gap-2 self-start px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 shadow-sm"
          >
            <PlusIcon className="h-5 w-5" />
            New price list
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-40">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : lists.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center">
          <p className="text-gray-700 font-medium">No price lists yet</p>
          <p className="text-gray-500 text-sm mt-1">
            Create one per HMO you have a contract with. Until then, HMO patients are billed the self-pay price.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {["Price list", "HMO / Scheme", "Effective", "Services", "Status"].map((h) => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {lists.map((l) => {
                  const state = listState(l);
                  return (
                    <tr key={l.id} className="hover:bg-gray-50/50">
                      <td className="px-5 py-4 text-sm whitespace-nowrap">
                        <Link href={`/finance/price-lists/${l.id}`} className="font-medium text-blue-600 hover:text-blue-800 hover:underline">
                          {l.name}
                        </Link>
                      </td>
                      <td className="px-5 py-4 text-sm whitespace-nowrap">
                        <span className="text-gray-900">{l.hmoName}</span>
                        <span className="block text-xs text-gray-500">{PAYER_TYPE_LABEL[l.payerType] ?? l.payerType}</span>
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-600 whitespace-nowrap">
                        {l.effectiveFrom} → {l.effectiveTo ?? "open-ended"}
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-600 whitespace-nowrap">{l.itemCount}</td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${state.className}`}>
                          {state.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="New price list">
        <div className="space-y-4">
          {formError && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{formError}</div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="block text-sm font-medium text-gray-700">
              HMO / Scheme
              <select
                value={form.hmoId}
                onChange={(e) => {
                  const hmo = hmoOptions.find((h) => String(h.id) === e.target.value);
                  setForm((f) => ({
                    ...f,
                    hmoId: e.target.value,
                    name: f.name || (hmo ? `${hmo.name} tariff ${new Date().getFullYear()}` : ""),
                  }));
                }}
                className={`mt-1 bg-white ${inputClass}`}
              >
                <option value="">Select…</option>
                {hmoOptions.map((h) => (
                  <option key={h.id} value={h.id}>{h.name}</option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-medium text-gray-700">
              Payer type
              <select
                value={form.payerType}
                onChange={(e) => setForm((f) => ({ ...f, payerType: e.target.value }))}
                className={`mt-1 bg-white ${inputClass}`}
              >
                {Object.entries(PAYER_TYPE_LABEL).map(([k, label]) => (
                  <option key={k} value={k}>{label}</option>
                ))}
              </select>
            </label>
          </div>
          <label className="block text-sm font-medium text-gray-700">
            Name
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Hygeia tariff 2026"
              className={`mt-1 ${inputClass}`}
            />
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="block text-sm font-medium text-gray-700">
              Effective from
              <input
                type="date"
                value={form.effectiveFrom}
                onChange={(e) => setForm((f) => ({ ...f, effectiveFrom: e.target.value }))}
                className={`mt-1 ${inputClass}`}
              />
            </label>
            <label className="block text-sm font-medium text-gray-700">
              Effective to <span className="text-gray-400 font-normal">(optional)</span>
              <input
                type="date"
                value={form.effectiveTo}
                onChange={(e) => setForm((f) => ({ ...f, effectiveTo: e.target.value }))}
                className={`mt-1 ${inputClass}`}
              />
            </label>
          </div>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-gray-700">Start from</legend>
            <label className="flex items-start gap-2 text-sm text-gray-700">
              <input
                type="radio"
                checked={form.seed === "base_prices"}
                onChange={() => setForm((f) => ({ ...f, seed: "base_prices" }))}
                className="mt-0.5"
              />
              <span>
                All services at current self-pay prices
                <span className="block text-xs text-gray-500">Then edit prices down to the HMO&apos;s agreed tariff.</span>
              </span>
            </label>
            <label className="flex items-start gap-2 text-sm text-gray-700">
              <input
                type="radio"
                checked={form.seed === "empty"}
                onChange={() => setForm((f) => ({ ...f, seed: "empty" }))}
                className="mt-0.5"
              />
              <span>
                Empty list
                <span className="block text-xs text-gray-500">Only the services you add will be covered.</span>
              </span>
            </label>
          </fieldset>
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => setIsCreateOpen(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={isSaving || !form.hmoId || !form.name.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {isSaving ? "Creating..." : "Create & edit tariff"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

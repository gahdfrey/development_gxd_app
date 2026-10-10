"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import Modal from "@/app/components/ui/Modal";
import PermissionDenied from "@/app/components/ui/PermissionDenied";
import { useToast } from "@/app/contexts/ToastContext";
import { ArrowLeftIcon, MagnifyingGlassIcon, TrashIcon } from "@heroicons/react/24/outline";
import { naira, PAYER_TYPE_LABEL } from "../../components/billing";

type CatalogType = "lab_test" | "product" | "service" | "ward_bed";

interface CatalogLine {
  itemType: CatalogType;
  itemId: number;
  name: string;
  group: string | null;
  basePrice: number;
  listed: boolean;
  price: number | null;
  coverage: "covered" | "excluded" | null;
  copayPercent: number;
  requiresAuthorization: boolean;
}

interface PriceListDetail {
  id: number;
  name: string;
  payerType: string;
  hmoId: number;
  hmoName: string | null;
  effectiveFrom: string;
  effectiveTo: string | null;
  isActive: boolean;
  notes: string | null;
  items: CatalogLine[];
}

/** Editable state for one catalog line. */
interface Draft {
  listed: boolean;
  price: string;
  coverage: "covered" | "excluded";
  copayPercent: string;
  requiresAuthorization: boolean;
}

const CATALOG_LABEL: Record<CatalogType, string> = {
  lab_test: "Lab",
  product: "Product",
  service: "Service",
  ward_bed: "Bed charge per day",
};

const lineKey = (l: { itemType: CatalogType; itemId: number }) => `${l.itemType}:${l.itemId}`;

function toDraft(l: CatalogLine): Draft {
  return {
    listed: l.listed,
    price: String(l.price ?? l.basePrice),
    coverage: l.coverage ?? "covered",
    copayPercent: String(l.copayPercent ?? 0),
    requiresAuthorization: l.requiresAuthorization,
  };
}

function sameDraft(a: Draft, b: Draft): boolean {
  if (!a.listed && !b.listed) return true;
  return (
    a.listed === b.listed &&
    a.price === b.price &&
    a.coverage === b.coverage &&
    a.copayPercent === b.copayPercent &&
    a.requiresAuthorization === b.requiresAuthorization
  );
}

export default function PriceListEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { showToast } = useToast();
  const { data, error, isLoading, mutate } = useSWR<PriceListDetail>(`/api/price-lists/${id}`, fetcher);

  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | CatalogType>("all");
  const [onlyListed, setOnlyListed] = useState(false);
  const [percent, setPercent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [headerOpen, setHeaderOpen] = useState(false);
  const [header, setHeader] = useState({ name: "", effectiveFrom: "", effectiveTo: "", isActive: true });
  const [headerError, setHeaderError] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);

  const original = useMemo(() => {
    const map: Record<string, Draft> = {};
    for (const l of data?.items ?? []) map[lineKey(l)] = toDraft(l);
    return map;
  }, [data]);

  useEffect(() => {
    setDrafts(original);
  }, [original]);

  const dirtyKeys = useMemo(
    () => Object.keys(drafts).filter((k) => original[k] && !sameDraft(drafts[k], original[k])),
    [drafts, original],
  );

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data?.items ?? []).filter((l) => {
      if (typeFilter !== "all" && l.itemType !== typeFilter) return false;
      if (onlyListed && !drafts[lineKey(l)]?.listed) return false;
      return !q || l.name.toLowerCase().includes(q) || (l.group ?? "").toLowerCase().includes(q);
    });
  }, [data, search, typeFilter, onlyListed, drafts]);

  if (error) {
    if (error.message?.includes("Forbidden") || error.message?.includes("permission")) {
      return <PermissionDenied moduleName="Finance" />;
    }
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <p className="text-gray-600">Price list not found.</p>
        <Link href="/finance/price-lists" className="text-blue-600 text-sm hover:underline">Back to price lists</Link>
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  const update = (k: string, patch: Partial<Draft>) =>
    setDrafts((prev) => ({ ...prev, [k]: { ...prev[k], ...patch } }));

  // Bulk: set every *visible, listed* line's tariff to N% of its self-pay price.
  const applyPercent = () => {
    const pct = Number(percent);
    if (!Number.isFinite(pct) || pct <= 0) return;
    setDrafts((prev) => {
      const next = { ...prev };
      for (const l of visible) {
        const k = lineKey(l);
        if (next[k]?.listed) next[k] = { ...next[k], price: String(Math.round((l.basePrice * pct) / 100)) };
      }
      return next;
    });
  };

  const invalid = dirtyKeys.some((k) => {
    const d = drafts[k];
    if (!d.listed) return false;
    const p = Number(d.price);
    const c = Number(d.copayPercent);
    return !Number.isInteger(p) || p < 0 || !Number.isInteger(c) || c < 0 || c > 100;
  });

  const handleSave = async () => {
    const byKey = new Map((data.items ?? []).map((l) => [lineKey(l), l]));
    const upsert = [];
    const remove = [];
    for (const k of dirtyKeys) {
      const d = drafts[k];
      const l = byKey.get(k)!;
      if (d.listed) {
        upsert.push({
          itemType: l.itemType,
          itemId: l.itemId,
          price: Number(d.price),
          coverage: d.coverage,
          copayPercent: Number(d.copayPercent),
          requiresAuthorization: d.requiresAuthorization,
        });
      } else if (l.listed) {
        remove.push({ itemType: l.itemType, itemId: l.itemId });
      }
    }
    setIsSaving(true);
    try {
      const res = await fetch(`/api/price-lists/${data.id}/items`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ upsert, remove }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Failed to save");
      showToast(`Saved ${upsert.length + remove.length} change(s)`, "success");
      mutate();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to save", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const openHeader = () => {
    setHeader({
      name: data.name,
      effectiveFrom: data.effectiveFrom,
      effectiveTo: data.effectiveTo ?? "",
      isActive: data.isActive,
    });
    setHeaderError("");
    setHeaderOpen(true);
  };

  const saveHeader = async () => {
    setHeaderError("");
    const res = await fetch(`/api/price-lists/${data.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(header),
    });
    const body = await res.json();
    if (!res.ok) {
      setHeaderError(body.error || "Failed to save");
      return;
    }
    setHeaderOpen(false);
    showToast("Price list updated", "success");
    mutate();
  };

  const handleDelete = async () => {
    const res = await fetch(`/api/price-lists/${data.id}`, { method: "DELETE" });
    if (!res.ok) {
      const body = await res.json();
      showToast(body.error || "Failed to delete", "error");
      return;
    }
    showToast("Price list deleted", "success");
    router.push("/finance/price-lists");
  };

  const listedCount = Object.values(drafts).filter((d) => d.listed).length;
  const inputClass =
    "px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400";

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 pb-28">
      <div>
        <Link href="/finance/price-lists" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeftIcon className="h-4 w-4" />
          Price lists
        </Link>
        <div className="mt-2 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{data.name}</h1>
            <p className="text-gray-600 text-sm mt-1">
              {data.hmoName} · {PAYER_TYPE_LABEL[data.payerType] ?? data.payerType} · {data.effectiveFrom} →{" "}
              {data.effectiveTo ?? "open-ended"}
              {!data.isActive && <span className="ml-2 font-medium text-gray-500">(inactive)</span>}
            </p>
            <p className="text-gray-500 text-xs mt-1">
              {listedCount} of {data.items.length} services on this tariff. Services not on it are billed to the patient
              at the self-pay price.
            </p>
          </div>
          <div className="flex gap-2 self-start">
            <button
              onClick={openHeader}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Edit details
            </button>
            <button
              onClick={() => setDeleteOpen(true)}
              className="p-2 text-red-600 bg-white border border-gray-300 rounded-lg hover:bg-red-50"
              title="Delete price list"
            >
              <TrashIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-3 lg:items-center">
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search services…"
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)}
          className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All services</option>
          <option value="lab_test">Lab & imaging</option>
          <option value="product">Drugs & products</option>
          <option value="service">Services</option>
          <option value="ward_bed">Bed charges (per day)</option>
        </select>
        <label className="inline-flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={onlyListed} onChange={(e) => setOnlyListed(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-blue-600" />
          On tariff only
        </label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={1}
            value={percent}
            onChange={(e) => setPercent(e.target.value)}
            placeholder="%"
            className="w-20 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Percent of self-pay price"
          />
          <button
            onClick={applyPercent}
            disabled={!percent}
            className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 whitespace-nowrap"
            title="Set the tariff of every listed service shown below to this percentage of its self-pay price"
          >
            Set to % of self-pay
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {["On tariff", "Service", "Self-pay", "HMO tariff (₦)", "Coverage", "Co-pay %", "Needs auth", "Patient pays"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {visible.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-sm text-gray-500">No services match.</td>
                </tr>
              )}
              {visible.map((l) => {
                const k = lineKey(l);
                const d = drafts[k];
                if (!d) return null;
                const isDirty = original[k] && !sameDraft(d, original[k]);
                const price = Number(d.price);
                const copay = Number(d.copayPercent);
                const patientPays = !d.listed || d.coverage === "excluded"
                  ? l.basePrice
                  : Number.isFinite(price) && Number.isFinite(copay) ? Math.round((price * copay) / 100) : null;
                return (
                  <tr key={k} className={isDirty ? "bg-amber-50/50" : "hover:bg-gray-50/50"}>
                    <td className="px-4 py-2.5">
                      <input
                        type="checkbox"
                        checked={d.listed}
                        onChange={(e) => update(k, { listed: e.target.checked })}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600"
                        aria-label={`Include ${l.name} on tariff`}
                      />
                    </td>
                    <td className="px-4 py-2.5 text-sm">
                      <span className="font-medium text-gray-900">{l.name}</span>
                      <span className="block text-xs text-gray-500 capitalize">
                        {l.group ?? CATALOG_LABEL[l.itemType]}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-sm text-gray-600 whitespace-nowrap">{naira(l.basePrice)}</td>
                    <td className="px-4 py-2.5">
                      <input
                        type="number"
                        min={0}
                        value={d.price}
                        disabled={!d.listed || d.coverage === "excluded"}
                        onChange={(e) => update(k, { price: e.target.value })}
                        className={`w-28 ${inputClass}`}
                      />
                    </td>
                    <td className="px-4 py-2.5">
                      <select
                        value={d.coverage}
                        disabled={!d.listed}
                        onChange={(e) => update(k, { coverage: e.target.value as Draft["coverage"] })}
                        className={`bg-white ${inputClass}`}
                      >
                        <option value="covered">Covered</option>
                        <option value="excluded">Excluded</option>
                      </select>
                    </td>
                    <td className="px-4 py-2.5">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={d.copayPercent}
                        disabled={!d.listed || d.coverage === "excluded"}
                        onChange={(e) => update(k, { copayPercent: e.target.value })}
                        className={`w-20 ${inputClass}`}
                      />
                    </td>
                    <td className="px-4 py-2.5">
                      <input
                        type="checkbox"
                        checked={d.requiresAuthorization}
                        disabled={!d.listed || d.coverage === "excluded"}
                        onChange={(e) => update(k, { requiresAuthorization: e.target.checked })}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 disabled:opacity-40"
                        aria-label={`${l.name} needs HMO authorization`}
                      />
                    </td>
                    <td className="px-4 py-2.5 text-sm whitespace-nowrap">
                      <span className={d.listed && d.coverage === "covered" ? "text-gray-900" : "text-amber-700"}>
                        {naira(patientPays)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {dirtyKeys.length > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2rem)] max-w-xl flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-lg">
          <span className="text-sm text-gray-700">
            {dirtyKeys.length} unsaved change{dirtyKeys.length !== 1 ? "s" : ""}
            {invalid && <span className="block text-xs text-red-600">Prices must be whole Naira; co-pay 0–100%.</span>}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setDrafts(original)}
              disabled={isSaving}
              className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Discard
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || invalid}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {isSaving ? "Saving..." : "Save tariff"}
            </button>
          </div>
        </div>
      )}

      <Modal isOpen={headerOpen} onClose={() => setHeaderOpen(false)} title="Price list details">
        <div className="space-y-4">
          {headerError && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{headerError}</div>
          )}
          <label className="block text-sm font-medium text-gray-700">
            Name
            <input
              type="text"
              value={header.name}
              onChange={(e) => setHeader((h) => ({ ...h, name: e.target.value }))}
              className="mt-1 w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="block text-sm font-medium text-gray-700">
              Effective from
              <input
                type="date"
                value={header.effectiveFrom}
                onChange={(e) => setHeader((h) => ({ ...h, effectiveFrom: e.target.value }))}
                className="mt-1 w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </label>
            <label className="block text-sm font-medium text-gray-700">
              Effective to <span className="text-gray-400 font-normal">(optional)</span>
              <input
                type="date"
                value={header.effectiveTo}
                onChange={(e) => setHeader((h) => ({ ...h, effectiveTo: e.target.value }))}
                className="mt-1 w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </label>
          </div>
          <label className="inline-flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={header.isActive}
              onChange={(e) => setHeader((h) => ({ ...h, isActive: e.target.checked }))}
              className="h-4 w-4 rounded border-gray-300 text-blue-600"
            />
            Active (used for billing within its dates)
          </label>
          <div className="flex justify-end gap-3">
            <button onClick={() => setHeaderOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
              Cancel
            </button>
            <button onClick={saveHeader} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">
              Save
            </button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={deleteOpen} onClose={() => setDeleteOpen(false)} title="Delete price list">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Delete <strong>{data.name}</strong>? {data.hmoName} patients will be billed the self-pay price until another
            price list is active. HMO charges already recorded keep their amounts.
          </p>
          <div className="flex justify-end gap-3">
            <button onClick={() => setDeleteOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
              Cancel
            </button>
            <button onClick={handleDelete} className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700">
              Delete
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

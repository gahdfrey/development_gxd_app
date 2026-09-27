"use client";

import { Fragment, useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { PlusIcon, TrashIcon, ChevronDownIcon, ChevronUpIcon } from "@heroicons/react/24/outline";
import type { BillingPlan } from "@/lib/db/schema";

const INTERVALS = ["weekly", "monthly", "yearly"] as const;

interface LabTestOption {
  id: number;
  name: string;
  price: number;
}

interface ProductOption {
  id: number;
  name: string;
  price: number;
}

interface PlanItem {
  id: number;
  itemType: "lab_test" | "product";
  itemId: number;
  name?: string;
  price?: number;
}

function PlanItemsPanel({ planId }: { planId: number }) {
  const { data: items, mutate } = useSWR<PlanItem[]>(`/api/billing-plans/${planId}/items`, fetcher);
  const { data: tests } = useSWR<LabTestOption[]>("/api/tests", fetcher);
  const { data: products } = useSWR<ProductOption[]>("/api/products", fetcher);
  const [itemType, setItemType] = useState<"lab_test" | "product">("lab_test");
  const [itemId, setItemId] = useState("");
  const [error, setError] = useState("");

  const options = itemType === "lab_test" ? (tests ?? []) : (products ?? []);
  const covered = new Set((items ?? []).map((i) => `${i.itemType}:${i.itemId}`));
  const selectable = options.filter((o) => !covered.has(`${itemType}:${o.id}`));

  const addItem = async () => {
    if (!itemId) return;
    setError("");
    try {
      const res = await fetch(`/api/billing-plans/${planId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemType, itemId: Number(itemId) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add service");
      setItemId("");
      mutate();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add service");
    }
  };

  const removeItem = async (rowId: number) => {
    await fetch(`/api/billing-plans/${planId}/items/${rowId}`, { method: "DELETE" });
    mutate();
  };

  return (
    <div className="bg-gray-50/70 px-5 py-4 space-y-3">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Services included in this plan</p>
      {error && <p className="text-xs text-red-600">{error}</p>}

      {items && items.length > 0 && (
        <ul className="space-y-1.5">
          {items.map((i) => (
            <li key={i.id} className="flex items-center justify-between gap-2 rounded-lg bg-white border border-gray-200 px-3 py-2">
              <span className="text-sm text-gray-800">
                {i.name ?? `#${i.itemId}`}
                <span className="ml-2 text-xs text-gray-400">
                  {i.itemType === "lab_test" ? "Lab test" : "Product"}
                  {i.price != null && ` · ₦${i.price.toLocaleString()}`}
                </span>
              </span>
              <button onClick={() => removeItem(i.id)} className="p-1 text-red-500 hover:text-red-700" title="Remove">
                <TrashIcon className="w-3.5 h-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
      {(!items || items.length === 0) && <p className="text-xs text-gray-400">No services attached yet — this plan is a flat recurring charge only.</p>}

      <div className="flex flex-wrap gap-2 pt-1">
        <select
          value={itemType}
          onChange={(e) => { setItemType(e.target.value as "lab_test" | "product"); setItemId(""); }}
          className="rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="lab_test">Lab test</option>
          <option value="product">Product</option>
        </select>
        <select
          value={itemId}
          onChange={(e) => setItemId(e.target.value)}
          className="min-w-[180px] rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Select a service…</option>
          {selectable.map((o) => (
            <option key={o.id} value={o.id}>{o.name} (₦{o.price.toLocaleString()})</option>
          ))}
        </select>
        <button
          onClick={addItem}
          disabled={!itemId}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white text-xs font-medium rounded-lg hover:bg-slate-800 disabled:opacity-50"
        >
          <PlusIcon className="w-3.5 h-3.5" />
          Add
        </button>
      </div>
    </div>
  );
}

export default function BillingPlansTab() {
  const { data: plans, mutate } = useSWR<BillingPlan[]>("/api/billing-plans", fetcher);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [billingInterval, setBillingInterval] = useState<(typeof INTERVALS)[number]>("monthly");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const handleCreate = async () => {
    if (!name.trim() || !amount) {
      setError("Name and amount are required");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/billing-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, amount: Number(amount), billingInterval }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create plan");
      setName("");
      setDescription("");
      setAmount("");
      mutate();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create plan");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleActive = async (plan: BillingPlan) => {
    await fetch(`/api/billing-plans/${plan.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !plan.isActive }),
    });
    mutate();
  };

  const remove = async (plan: BillingPlan) => {
    if (!confirm(`Delete "${plan.name}"?`)) return;
    await fetch(`/api/billing-plans/${plan.id}`, { method: "DELETE" });
    mutate();
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">New billing plan</h3>
        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <input
            type="text"
            placeholder="Plan name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="text"
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="number"
            min={1}
            placeholder="Amount (₦)"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={billingInterval}
            onChange={(e) => setBillingInterval(e.target.value as (typeof INTERVALS)[number])}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {INTERVALS.map((i) => (
              <option key={i} value={i}>{i}</option>
            ))}
          </select>
        </div>
        <button
          onClick={handleCreate}
          disabled={submitting}
          className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          <PlusIcon className="w-4 h-4" />
          {submitting ? "Creating…" : "Create Plan"}
        </button>
        <p className="mt-2 text-xs text-gray-400">
          After creating a plan, expand its row below to attach specific lab tests or products it covers for free.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {["Name", "Amount", "Interval", "Status", "Services", "Actions"].map((h) => (
                <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {(plans ?? []).map((plan) => (
              <Fragment key={plan.id}>
                <tr>
                  <td className="px-5 py-3 text-sm font-medium text-gray-900">
                    {plan.name}
                    {plan.description && <p className="text-xs text-gray-400">{plan.description}</p>}
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-700">₦{plan.amount.toLocaleString()}</td>
                  <td className="px-5 py-3 text-sm text-gray-700">{plan.billingInterval}</td>
                  <td className="px-5 py-3">
                    <button
                      onClick={() => toggleActive(plan)}
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                        plan.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {plan.isActive ? "Active" : "Inactive"}
                    </button>
                  </td>
                  <td className="px-5 py-3">
                    <button
                      onClick={() => setExpandedId(expandedId === plan.id ? null : plan.id)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800"
                    >
                      Manage
                      {expandedId === plan.id ? <ChevronUpIcon className="w-3.5 h-3.5" /> : <ChevronDownIcon className="w-3.5 h-3.5" />}
                    </button>
                  </td>
                  <td className="px-5 py-3">
                    <button onClick={() => remove(plan)} className="p-1 text-red-600 hover:text-red-800" title="Delete">
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
                {expandedId === plan.id && (
                  <tr>
                    <td colSpan={6} className="p-0">
                      <PlanItemsPanel planId={plan.id} />
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
            {(!plans || plans.length === 0) && (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-sm text-gray-500">
                  No billing plans yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

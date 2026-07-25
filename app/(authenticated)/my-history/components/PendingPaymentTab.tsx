"use client";

import { useMemo, useState } from "react";
import {
  BeakerIcon,
  ClipboardDocumentListIcon,
  CreditCardIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
} from "@heroicons/react/24/outline";
import type { UnpaidRequest, UnpaidPrescription } from "./types";

interface PendingPaymentTabProps {
  unpaidRequests: UnpaidRequest[];
  unpaidPrescriptions: UnpaidPrescription[];
  onPaid: () => void;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function naira(amount: number): string {
  return `₦${amount.toLocaleString()}`;
}

function key(itemType: "request" | "prescription", itemId: number): string {
  return `${itemType}:${itemId}`;
}

export default function PendingPaymentTab({
  unpaidRequests,
  unpaidPrescriptions,
  onPaid,
}: PendingPaymentTabProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isPaying, setIsPaying] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const rows = useMemo(
    () => [
      ...unpaidRequests
        .filter((r) => r.testPrice != null)
        .map((r) => ({
          key: key("request", r.id),
          itemType: "request" as const,
          itemId: r.id,
          label: r.testName ?? "Lab test",
          sublabel: r.departmentName,
          amount: r.testPrice as number,
          createdAt: r.createdAt,
          icon: BeakerIcon,
        })),
      ...unpaidPrescriptions
        .filter((p) => p.productPrice != null)
        .map((p) => ({
          key: key("prescription", p.id),
          itemType: "prescription" as const,
          itemId: p.id,
          label: p.productName ?? "Medication",
          sublabel: p.dosage,
          amount: p.productPrice as number,
          createdAt: p.createdAt,
          icon: ClipboardDocumentListIcon,
        })),
    ],
    [unpaidRequests, unpaidPrescriptions],
  );

  const total = rows
    .filter((r) => selected.has(r.key))
    .reduce((sum, r) => sum + r.amount, 0);

  const toggle = (k: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  };

  const toggleAll = () => {
    setSelected((prev) => (prev.size === rows.length ? new Set() : new Set(rows.map((r) => r.key))));
  };

  const handlePay = async () => {
    if (selected.size === 0) return;
    setIsPaying(true);
    setError("");
    setSuccess("");

    try {
      const items = rows
        .filter((r) => selected.has(r.key))
        .map((r) => ({ itemType: r.itemType, itemId: r.itemId }));

      const initRes = await fetch("/api/payments/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      const initData = await initRes.json();
      if (!initRes.ok) throw new Error(initData.error || "Failed to start payment");

      if (initData.provider === "mock") {
        // No real checkout page to redirect to — verify immediately.
        const verifyRes = await fetch(`/api/payments/verify?reference=${initData.reference}`);
        const verifyData = await verifyRes.json();
        if (!verifyRes.ok || verifyData.status !== "success") {
          throw new Error(verifyData.error || "Payment could not be confirmed");
        }
        setSuccess(`Payment of ${naira(initData.amount)} confirmed.`);
        setSelected(new Set());
        onPaid();
      } else {
        // Real gateway — leave the app for its hosted checkout page.
        window.location.href = initData.authorizationUrl;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to process payment");
    } finally {
      setIsPaying(false);
    }
  };

  if (rows.length === 0) {
    return (
      <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-200 p-10 sm:p-14 text-center">
        <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50">
          <CheckCircleIcon className="h-6 w-6 text-emerald-500" />
        </span>
        <p className="text-gray-500 text-sm">
          You're all caught up — nothing pending payment right now.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          <ExclamationCircleIcon className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700">
          <CheckCircleIcon className="h-4 w-4 shrink-0" />
          {success}
        </div>
      )}

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={toggleAll}
          className="text-xs font-semibold text-blue-600 hover:text-blue-800"
        >
          {selected.size === rows.length ? "Deselect all" : "Select all"}
        </button>
        <p className="text-xs text-gray-400">
          {rows.length} item{rows.length !== 1 ? "s" : ""} pending payment
        </p>
      </div>

      <div className="space-y-2">
        {rows.map((row) => {
          const checked = selected.has(row.key);
          const Icon = row.icon;
          return (
            <label
              key={row.key}
              className={`flex items-center gap-3 rounded-xl border px-3 sm:px-4 py-3 cursor-pointer transition-colors ${
                checked ? "border-blue-300 bg-blue-50/50" : "border-gray-200 bg-white hover:border-gray-300"
              }`}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggle(row.key)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100">
                <Icon className="h-4 w-4 text-slate-500" />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{row.label}</p>
                <p className="text-xs text-gray-500">
                  {row.sublabel ?? "—"} · {formatDate(row.createdAt)}
                </p>
              </div>
              <span className="text-sm font-semibold text-gray-800 shrink-0">
                {naira(row.amount)}
              </span>
            </label>
          );
        })}
      </div>

      <div className="sticky bottom-0 flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-4 sm:px-5 py-3 sm:py-4 shadow-sm">
        <div>
          <p className="text-xs text-gray-400">Total selected</p>
          <p className="text-lg font-bold text-gray-900">{naira(total)}</p>
        </div>
        <button
          type="button"
          onClick={handlePay}
          disabled={selected.size === 0 || isPaying}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 sm:px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <CreditCardIcon className="h-4 w-4" />
          {isPaying ? "Processing…" : `Pay ${selected.size > 0 ? naira(total) : ""}`}
        </button>
      </div>
    </div>
  );
}

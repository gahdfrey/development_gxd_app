"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BeakerIcon,
  ClipboardDocumentListIcon,
  CreditCardIcon,
  WalletIcon,
  BuildingLibraryIcon,
  SparklesIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
} from "@heroicons/react/24/outline";
import type { UnpaidRequest, UnpaidPrescription } from "./types";

type PaymentMethod = "gateway" | "wallet" | "bank_transfer" | "plan";

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
  const [method, setMethod] = useState<PaymentMethod>("gateway");
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [bankTransferInfo, setBankTransferInfo] = useState<{
    bankName: string;
    accountNumber: string;
    accountName: string;
    amount: number;
  } | null>(null);

  useEffect(() => {
    fetch("/api/wallet")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setWalletBalance(data?.wallet?.balance ?? null))
      .catch(() => setWalletBalance(null));
  }, []);

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
          coveredByPlan: r.coveredByPlan,
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
          coveredByPlan: p.coveredByPlan,
        })),
    ],
    [unpaidRequests, unpaidPrescriptions],
  );

  const selectedRows = rows.filter((r) => selected.has(r.key));
  const total = selectedRows.reduce((sum, r) => sum + r.amount, 0);
  const anyCovered = rows.some((r) => r.coveredByPlan != null);
  const allSelectedCovered = selectedRows.length > 0 && selectedRows.every((r) => r.coveredByPlan != null);

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
    setBankTransferInfo(null);

    try {
      const items = rows
        .filter((r) => selected.has(r.key))
        .map((r) => ({ itemType: r.itemType, itemId: r.itemId }));

      if (method === "plan") {
        const res = await fetch("/api/payments/pay-with-plan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to settle via plan coverage");
        setSuccess(`${naira(data.amount)} covered by your plan — no charge.`);
        setSelected(new Set());
        onPaid();
        return;
      }

      if (method === "wallet") {
        const res = await fetch("/api/payments/pay-with-wallet", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to pay with wallet");
        setSuccess(`Payment of ${naira(data.amount)} confirmed from your wallet.`);
        setWalletBalance((prev) => (prev != null ? prev - data.amount : prev));
        setSelected(new Set());
        onPaid();
        return;
      }

      if (method === "bank_transfer") {
        const res = await fetch("/api/payments/bank-transfer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to record bank transfer");
        setBankTransferInfo({ ...data.bankAccount, amount: data.amount });
        setSelected(new Set());
        onPaid();
        return;
      }

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

  const walletInsufficient = method === "wallet" && walletBalance != null && walletBalance < total;
  const planNotFullyCovered = method === "plan" && !allSelectedCovered;

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
      {bankTransferInfo && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800 space-y-1">
          <p className="font-semibold">
            Transfer {naira(bankTransferInfo.amount)} to the account below. A finance officer will confirm receipt
            and mark this paid.
          </p>
          <p>Bank: {bankTransferInfo.bankName}</p>
          <p>Account number: {bankTransferInfo.accountNumber}</p>
          <p>Account name: {bankTransferInfo.accountName}</p>
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
                {row.coveredByPlan && (
                  <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-semibold text-violet-700 ring-1 ring-violet-200">
                    <SparklesIcon className="h-3 w-3" />
                    Covered by {row.coveredByPlan}
                  </span>
                )}
              </div>
              <span className="text-sm font-semibold text-gray-800 shrink-0">
                {naira(row.amount)}
              </span>
            </label>
          );
        })}
      </div>

      <div className="sticky bottom-0 space-y-3 rounded-xl border border-gray-200 bg-white px-4 sm:px-5 py-3 sm:py-4 shadow-sm">
        <div className={`grid gap-2 ${anyCovered ? "grid-cols-4" : "grid-cols-3"}`}>
          {([
            { key: "gateway" as const, label: "Card", icon: CreditCardIcon },
            {
              key: "wallet" as const,
              label: walletBalance != null ? `Wallet (${naira(walletBalance)})` : "Wallet",
              icon: WalletIcon,
            },
            { key: "bank_transfer" as const, label: "Bank Transfer", icon: BuildingLibraryIcon },
            ...(anyCovered ? [{ key: "plan" as const, label: "Plan Coverage", icon: SparklesIcon }] : []),
          ]).map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => setMethod(opt.key)}
              className={`flex flex-col items-center gap-1 rounded-lg border px-2 py-2 text-xs font-medium transition-colors ${
                method === opt.key
                  ? "border-blue-400 bg-blue-50 text-blue-700"
                  : "border-gray-200 text-gray-600 hover:border-gray-300"
              }`}
            >
              <opt.icon className="h-4 w-4" />
              <span className="truncate w-full text-center">{opt.label}</span>
            </button>
          ))}
        </div>

        {walletInsufficient && (
          <p className="text-xs text-red-600">Your wallet balance is lower than the selected total.</p>
        )}
        {planNotFullyCovered && (
          <p className="text-xs text-red-600">
            Every selected item must be covered by your plan to use this option — deselect uncovered items or pick
            another payment method.
          </p>
        )}

        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs text-gray-400">Total selected</p>
            <p className="text-lg font-bold text-gray-900">{method === "plan" ? naira(0) : naira(total)}</p>
          </div>
          <button
            type="button"
            onClick={handlePay}
            disabled={selected.size === 0 || isPaying || walletInsufficient || planNotFullyCovered}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 sm:px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <CreditCardIcon className="h-4 w-4" />
            {isPaying
              ? "Processing…"
              : method === "plan"
                ? "Use Plan Coverage"
                : `Pay ${selected.size > 0 ? naira(total) : ""}`}
          </button>
        </div>
      </div>
    </div>
  );
}

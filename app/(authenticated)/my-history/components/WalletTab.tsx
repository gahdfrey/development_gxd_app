"use client";

import { useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import {
  WalletIcon,
  ArrowUpCircleIcon,
  ArrowDownCircleIcon,
  CreditCardIcon,
  BuildingLibraryIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
} from "@heroicons/react/24/outline";

interface Wallet {
  id: number;
  balance: number;
  currency: string;
}

interface WalletTransaction {
  id: number;
  type: "credit" | "debit";
  amount: number;
  balanceAfter: number;
  source: string;
  description: string | null;
  createdAt: string;
}

interface BillingPlan {
  id: number;
  name: string;
  description: string | null;
  amount: number;
  billingInterval: string;
  isActive: boolean;
  includedServices: string[];
}

interface PatientSubscription {
  id: number;
  status: string;
  nextChargeDate: string;
  lastChargedAt: string | null;
  planId: number;
  planName: string;
  planAmount: number;
  planInterval: string;
}

function naira(amount: number): string {
  return `₦${amount.toLocaleString()}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

const SOURCE_LABEL: Record<string, string> = {
  topup: "Wallet top-up",
  bill_payment: "Bill payment",
  subscription_charge: "Subscription charge",
  refund: "Refund",
  adjustment: "Adjustment",
};

export default function WalletTab() {
  const { data, mutate, isLoading } = useSWR<{ wallet: Wallet; transactions: WalletTransaction[] }>(
    "/api/wallet",
    fetcher,
  );
  const { data: plans } = useSWR<BillingPlan[]>("/api/billing-plans", fetcher);
  const { data: subscriptions, mutate: mutateSubs } = useSWR<PatientSubscription[]>("/api/subscriptions", fetcher);

  const [topupAmount, setTopupAmount] = useState("");
  const [topupMethod, setTopupMethod] = useState<"gateway" | "bank_transfer">("gateway");
  const [isToppingUp, setIsToppingUp] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [bankInfo, setBankInfo] = useState<{ bankName: string; accountNumber: string; accountName: string; amount: number } | null>(null);

  const handleTopup = async () => {
    const amount = Number(topupAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Enter a valid amount");
      return;
    }
    setIsToppingUp(true);
    setError("");
    setSuccess("");
    setBankInfo(null);
    try {
      const res = await fetch("/api/wallet/topup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, method: topupMethod }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to start top-up");

      if (topupMethod === "bank_transfer") {
        setBankInfo({ ...result.bankAccount, amount: result.amount });
        setTopupAmount("");
        return;
      }

      if (result.provider === "mock") {
        const verifyRes = await fetch(`/api/payments/verify?reference=${result.reference}`);
        const verifyData = await verifyRes.json();
        if (!verifyRes.ok || verifyData.status !== "success") {
          throw new Error(verifyData.error || "Top-up could not be confirmed");
        }
        setSuccess(`Wallet topped up by ${naira(result.amount)}.`);
        setTopupAmount("");
        mutate();
      } else {
        window.location.href = result.authorizationUrl;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to top up wallet");
    } finally {
      setIsToppingUp(false);
    }
  };

  const subscribe = async (planId: number) => {
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ billingPlanId: planId }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to subscribe");
      setSuccess("Subscribed successfully — you'll be auto-charged from your wallet each cycle.");
      mutateSubs();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to subscribe");
    }
  };

  const cancelSubscription = async (subId: number) => {
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`/api/subscriptions/${subId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "cancelled" }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to cancel subscription");
      setSuccess("Subscription cancelled.");
      mutateSubs();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to cancel subscription");
    }
  };

  const activeSubs = subscriptions?.filter((s) => s.status !== "cancelled") ?? [];
  const subscribedPlanIds = new Set(activeSubs.map((s) => s.planId));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-5">
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
      {bankInfo && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800 space-y-1">
          <p className="font-semibold">
            Transfer {naira(bankInfo.amount)} to the account below. A finance officer will confirm receipt and
            credit your wallet.
          </p>
          <p>Bank: {bankInfo.bankName}</p>
          <p>Account number: {bankInfo.accountNumber}</p>
          <p>Account name: {bankInfo.accountName}</p>
        </div>
      )}

      {/* Balance card */}
      <div className="rounded-2xl border border-gray-200 bg-blue-600 p-5 sm:p-6 text-white">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15">
            <WalletIcon className="h-6 w-6" />
          </span>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-blue-100">Wallet Balance</p>
            <p className="text-2xl sm:text-3xl font-bold tracking-tight">{naira(data?.wallet.balance ?? 0)}</p>
          </div>
        </div>
      </div>

      {/* Top-up */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
        <h3 className="text-sm font-bold text-gray-900">Top up your wallet</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          <input
            type="number"
            min={1}
            value={topupAmount}
            onChange={(e) => setTopupAmount(e.target.value)}
            placeholder="Amount (₦)"
            className="flex-1 min-w-[140px] rounded-xl border border-gray-200 bg-gray-50/60 px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setTopupMethod("gateway")}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2.5 text-xs font-semibold ring-1 transition-colors ${
                topupMethod === "gateway" ? "bg-blue-50 text-blue-700 ring-blue-200" : "bg-white text-gray-600 ring-gray-200"
              }`}
            >
              <CreditCardIcon className="h-4 w-4" /> Card
            </button>
            <button
              type="button"
              onClick={() => setTopupMethod("bank_transfer")}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2.5 text-xs font-semibold ring-1 transition-colors ${
                topupMethod === "bank_transfer" ? "bg-blue-50 text-blue-700 ring-blue-200" : "bg-white text-gray-600 ring-gray-200"
              }`}
            >
              <BuildingLibraryIcon className="h-4 w-4" /> Bank Transfer
            </button>
          </div>
          <button
            type="button"
            onClick={handleTopup}
            disabled={isToppingUp}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {isToppingUp ? "Processing…" : "Top up"}
          </button>
        </div>
      </div>

      {/* Subscriptions */}
      {plans && plans.length > 0 && (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
          <h3 className="text-sm font-bold text-gray-900">Billing plans</h3>
          <p className="mt-1 text-sm text-gray-500">
            Subscribe to auto-pay a recurring amount from your wallet each cycle.
          </p>
          <div className="mt-3 space-y-2">
            {plans.filter((p) => p.isActive).map((plan) => {
              const subscribed = subscribedPlanIds.has(plan.id);
              const sub = activeSubs.find((s) => s.planId === plan.id);
              return (
                <div
                  key={plan.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{plan.name}</p>
                    <p className="text-xs text-gray-500">
                      {naira(plan.amount)} / {plan.billingInterval}
                      {sub && sub.status === "past_due" && (
                        <span className="ml-2 text-red-600 font-medium">Past due</span>
                      )}
                      {sub && sub.status === "active" && (
                        <span className="ml-2 text-gray-400">Next charge {formatDate(sub.nextChargeDate)}</span>
                      )}
                    </p>
                    {plan.description && <p className="text-xs text-gray-400 mt-0.5">{plan.description}</p>}
                    {plan.includedServices.length > 0 && (
                      <p className="text-xs text-violet-600 mt-1">
                        Includes: {plan.includedServices.join(", ")}
                      </p>
                    )}
                  </div>
                  {subscribed ? (
                    <button
                      type="button"
                      onClick={() => sub && cancelSubscription(sub.id)}
                      className="shrink-0 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => subscribe(plan.id)}
                      className="shrink-0 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
                    >
                      Subscribe
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* History */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
        <h3 className="text-sm font-bold text-gray-900">Wallet history</h3>
        {!data || data.transactions.length === 0 ? (
          <p className="mt-2 text-sm text-gray-500">No wallet activity yet.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {data.transactions.map((t) => (
              <div key={t.id} className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 px-3 py-2.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  {t.type === "credit" ? (
                    <ArrowUpCircleIcon className="h-5 w-5 text-emerald-500 shrink-0" />
                  ) : (
                    <ArrowDownCircleIcon className="h-5 w-5 text-red-500 shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">
                      {t.description || SOURCE_LABEL[t.source] || t.source}
                    </p>
                    <p className="text-xs text-gray-400">{formatDate(t.createdAt)}</p>
                  </div>
                </div>
                <span className={`text-sm font-semibold shrink-0 ${t.type === "credit" ? "text-emerald-600" : "text-red-600"}`}>
                  {t.type === "credit" ? "+" : "-"}
                  {naira(t.amount)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

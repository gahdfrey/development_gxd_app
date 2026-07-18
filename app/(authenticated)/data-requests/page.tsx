"use client";

import { useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import {
  ShieldCheckIcon,
  ExclamationCircleIcon,
} from "@heroicons/react/24/outline";

interface DataRequest {
  id: number;
  patientId: number;
  patientFirstname: string | null;
  patientLastname: string | null;
  patientMrn: string | null;
  type: string;
  status: string;
  details: string;
  resolutionNote: string | null;
  resolvedAt: string | null;
  createdAt: string;
}

const TYPE_LABEL: Record<string, string> = {
  rectification: "Correction (Art. 16)",
  erasure: "Deletion (Art. 17)",
};

const STATUS_BADGE: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700 ring-amber-200",
  resolved: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  rejected: "bg-red-50 text-red-700 ring-red-200",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

type Tab = "pending" | "all";

export default function DataRequestsPage() {
  const { data, isLoading, mutate } = useSWR<DataRequest[]>(
    "/api/data-requests",
    fetcher,
  );
  const [tab, setTab] = useState<Tab>("pending");
  const [resolving, setResolving] = useState<DataRequest | null>(null);
  const [note, setNote] = useState("");
  const [decision, setDecision] = useState<"resolved" | "rejected">("resolved");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const requests = data ?? [];
  const pendingCount = requests.filter((r) => r.status === "pending").length;
  const shown =
    tab === "pending" ? requests.filter((r) => r.status === "pending") : requests;

  const openResolve = (r: DataRequest) => {
    setResolving(r);
    setDecision("resolved");
    setNote("");
    setError("");
  };

  const submitResolution = async () => {
    if (!resolving) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/data-requests/${resolving.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: decision, resolutionNote: note }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Failed to update request");
      setResolving(null);
      mutate();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update request");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Data Requests</h1>
        <p className="text-gray-500 text-sm mt-1">
          Patient requests to correct or delete their personal data (GDPR Art. 16 & 17)
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-1">
          {(["pending", "all"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`inline-flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors ${
                tab === t
                  ? "border-blue-600 text-blue-700"
                  : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
              }`}
            >
              {t === "pending" ? "Pending" : "All"}
              {t === "pending" && pendingCount > 0 && (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-700">
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : shown.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
            <ShieldCheckIcon className="h-6 w-6 text-gray-400" />
          </span>
          <p className="text-sm font-medium text-gray-600">
            No {tab === "pending" ? "pending " : ""}data requests
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {shown.map((r) => (
            <div
              key={r.id}
              className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-gray-900">
                      {r.patientFirstname} {r.patientLastname}
                    </span>
                    {r.patientMrn && (
                      <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-bold text-slate-600">
                        {r.patientMrn}
                      </span>
                    )}
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${STATUS_BADGE[r.status] ?? "bg-gray-100 text-gray-600 ring-gray-200"}`}
                    >
                      {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                    </span>
                  </div>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-blue-600">
                    {TYPE_LABEL[r.type] ?? r.type}
                  </p>
                  <p className="mt-2 text-sm text-gray-700">{r.details}</p>
                  {r.resolutionNote && (
                    <p className="mt-2 text-xs text-gray-500">
                      <span className="font-semibold">Response:</span>{" "}
                      {r.resolutionNote}
                    </p>
                  )}
                  <p className="mt-2 text-xs text-gray-400">
                    Submitted {formatDate(r.createdAt)}
                    {r.resolvedAt ? ` · Handled ${formatDate(r.resolvedAt)}` : ""}
                  </p>
                </div>
                {r.status === "pending" && (
                  <button
                    onClick={() => openResolve(r)}
                    className="shrink-0 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
                  >
                    Handle
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Resolve modal */}
      {resolving && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">
                Handle data request
              </h2>
              <p className="text-sm text-gray-500 mt-0.5">
                {resolving.patientFirstname} {resolving.patientLastname} ·{" "}
                {TYPE_LABEL[resolving.type] ?? resolving.type}
              </p>
            </div>
            <div className="px-6 py-5 space-y-4">
              {error && (
                <p className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                  <ExclamationCircleIcon className="h-4.5 w-4.5 shrink-0" />
                  {error}
                </p>
              )}
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
                Marking this handled records your decision. Perform the actual
                correction or deletion on the patient&apos;s record so that
                change is itself audited.
              </p>
              <div className="flex gap-2">
                {(["resolved", "rejected"] as const).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDecision(d)}
                    className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold ring-1 transition-colors ${
                      decision === d
                        ? d === "resolved"
                          ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                          : "bg-red-50 text-red-700 ring-red-200"
                        : "bg-white text-gray-600 ring-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    {d === "resolved" ? "Mark done" : "Reject"}
                  </button>
                ))}
              </div>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                placeholder="Note to the patient (optional)…"
                className="w-full resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-4 focus:ring-blue-500/10"
              />
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={() => setResolving(null)}
                disabled={saving}
                className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={submitResolution}
                disabled={saving}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? "Saving…" : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import Modal from "@/app/components/ui/Modal";
import { useToast } from "@/app/contexts/ToastContext";
import { ArrowDownTrayIcon, PencilSquareIcon } from "@heroicons/react/24/outline";
import { naira } from "./billing";

interface HmoChargeRow {
  id: number;
  hmoId: number;
  hmoName: string | null;
  patientId: number;
  patientFirstname: string | null;
  patientLastname: string | null;
  patientMrn: string | null;
  policyNumber: string | null;
  itemType: "request" | "prescription";
  itemId: number;
  description: string | null;
  tariffPrice: number;
  hmoAmount: number;
  patientAmount: number;
  requiresAuthorization: boolean;
  authorizationCode: string | null;
  status: "unclaimed" | "claimed" | "queried" | "paid" | "rejected";
  statusNote: string | null;
  serviceDate: string;
  paidAmount: number | null;
  claimBatchId: number | null;
  claimReference: string | null;
}

interface HmoOption {
  id: number;
  name: string;
}

const STATUS_STYLE: Record<HmoChargeRow["status"], string> = {
  unclaimed: "bg-gray-100 text-gray-700 border-gray-300",
  claimed: "bg-blue-50 text-blue-700 border-blue-200",
  queried: "bg-purple-50 text-purple-700 border-purple-200",
  paid: "bg-green-50 text-green-700 border-green-200",
  rejected: "bg-red-50 text-red-700 border-red-200",
};

const STATUS_LABEL: Record<HmoChargeRow["status"], string> = {
  unclaimed: "Unclaimed",
  claimed: "Claimed",
  queried: "Queried by HMO",
  paid: "Paid by HMO",
  rejected: "Rejected",
};

function currentMonth(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Lagos" }).slice(0, 7);
}

function csvCell(value: unknown): string {
  const s = value == null ? "" : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/**
 * HMO receivables: the HMO's share of every settled bill item, grouped by
 * HMO, filterable by claim month. Finance exports a month's unclaimed
 * charges as the HMO claim, marks them claimed, then paid/rejected as the
 * HMO responds.
 */
export default function HmoBillingTab() {
  const { showToast } = useToast();
  const [hmoId, setHmoId] = useState("");
  const [status, setStatus] = useState("");
  const [month, setMonth] = useState(currentMonth());
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [isUpdating, setIsUpdating] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [authEdit, setAuthEdit] = useState<{ id: number; code: string } | null>(null);

  const query = new URLSearchParams();
  if (hmoId) query.set("hmoId", hmoId);
  if (status) query.set("status", status);
  if (month) query.set("month", month);
  const { data: rows = [], isLoading, mutate } = useSWR<HmoChargeRow[]>(`/api/hmo-charges?${query}`, fetcher);
  const { data: hmoOptions = [] } = useSWR<HmoOption[]>("/api/hmo", fetcher);

  const summary = useMemo(() => {
    const byHmo = new Map<string, { name: string; count: number; unclaimed: number; claimed: number; queried: number; paid: number; rejected: number }>();
    for (const r of rows) {
      const name = r.hmoName ?? "Unknown HMO";
      const entry = byHmo.get(name) ?? { name, count: 0, unclaimed: 0, claimed: 0, queried: 0, paid: 0, rejected: 0 };
      entry.count += 1;
      entry[r.status] += r.status === "paid" ? r.paidAmount ?? r.hmoAmount : r.hmoAmount;
      byHmo.set(name, entry);
    }
    return [...byHmo.values()].sort((a, b) => b.unclaimed + b.claimed + b.queried - (a.unclaimed + a.claimed + a.queried));
  }, [rows]);

  const toggle = (id: number) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const allSelected = rows.length > 0 && rows.every((r) => selected.has(r.id));

  const patch = async (body: Record<string, unknown>, successMessage: string) => {
    setIsUpdating(true);
    try {
      const res = await fetch("/api/hmo-charges", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Update failed");
      showToast(successMessage, "success");
      setSelected(new Set());
      mutate();
      return true;
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Update failed", "error");
      return false;
    } finally {
      setIsUpdating(false);
    }
  };

  const setStatusFor = (next: HmoChargeRow["status"], statusNote?: string) =>
    patch({ ids: [...selected], status: next, statusNote }, `${selected.size} charge(s) marked ${STATUS_LABEL[next].toLowerCase()}`);

  const exportCsv = () => {
    const source = selected.size > 0 ? rows.filter((r) => selected.has(r.id)) : rows;
    const header = [
      "HMO", "Service date", "Patient", "MRN", "Policy number", "Service",
      "Tariff (NGN)", "Co-pay (NGN)", "Claim amount (NGN)", "Authorization code", "Status",
    ];
    const lines = source.map((r) => [
      r.hmoName,
      new Date(r.serviceDate).toLocaleDateString("en-CA", { timeZone: "Africa/Lagos" }),
      `${r.patientFirstname ?? ""} ${r.patientLastname ?? ""}`.trim(),
      r.patientMrn,
      r.policyNumber,
      r.description,
      r.tariffPrice,
      r.patientAmount,
      r.hmoAmount,
      r.authorizationCode,
      STATUS_LABEL[r.status],
    ].map(csvCell).join(","));
    const blob = new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `hmo-claims-${month || "all"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Claim month</label>
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">HMO</label>
          <select
            value={hmoId}
            onChange={(e) => setHmoId(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All HMOs</option>
            {hmoOptions.map((h) => (
              <option key={h.id} value={h.id}>{h.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All statuses</option>
            {Object.entries(STATUS_LABEL).map(([k, label]) => (
              <option key={k} value={k}>{label}</option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={exportCsv}
          disabled={rows.length === 0}
          className="sm:ml-auto inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
        >
          <ArrowDownTrayIcon className="h-4 w-4" />
          Export {selected.size > 0 ? `${selected.size} selected` : "claim"} (CSV)
        </button>
      </div>

      {summary.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {summary.map((s) => (
            <div key={s.name} className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="flex items-baseline justify-between">
                <p className="text-sm font-semibold text-gray-900 truncate">{s.name}</p>
                <p className="text-xs text-gray-400">{s.count} item{s.count !== 1 ? "s" : ""}</p>
              </div>
              <p className="mt-1 text-xl font-bold text-gray-900">{naira(s.unclaimed + s.claimed + s.queried)}</p>
              <p className="text-xs text-gray-500">outstanding from HMO</p>
              <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                <div><span className="block text-gray-400">Unclaimed</span>{naira(s.unclaimed)}</div>
                <div><span className="block text-gray-400">Claimed</span>{naira(s.claimed + s.queried)}</div>
                <div><span className="block text-gray-400">Paid</span>{naira(s.paid)}</div>
              </div>
              {s.rejected > 0 && <p className="mt-2 text-xs text-red-600">Rejected: {naira(s.rejected)}</p>}
            </div>
          ))}
        </div>
      )}

      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm">
          <span className="font-medium text-blue-800">{selected.size} selected</span>
          <span className="text-blue-300">·</span>
          <button disabled={isUpdating} onClick={() => setStatusFor("claimed")} className="font-medium text-blue-700 hover:text-blue-900 disabled:opacity-50">
            Mark claimed
          </button>
          <button disabled={isUpdating} onClick={() => setStatusFor("paid")} className="font-medium text-green-700 hover:text-green-900 disabled:opacity-50">
            Mark paid by HMO
          </button>
          <button disabled={isUpdating} onClick={() => setRejectOpen(true)} className="font-medium text-red-700 hover:text-red-900 disabled:opacity-50">
            Mark rejected
          </button>
          <button disabled={isUpdating} onClick={() => setStatusFor("unclaimed")} className="font-medium text-gray-600 hover:text-gray-800 disabled:opacity-50">
            Reset to unclaimed
          </button>
          <span className="w-full text-xs text-blue-700/80">
            Monthly claims are best built on the Claims tab; these buttons only change charges that aren&apos;t in a claim yet.
          </span>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center items-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : rows.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
          <p className="text-gray-500 text-sm">
            No HMO charges for this period. Charges appear here when an HMO patient&apos;s covered item is settled.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 w-10">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={() => setSelected(allSelected ? new Set() : new Set(rows.map((r) => r.id)))}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600"
                      aria-label="Select all"
                    />
                  </th>
                  {["Date", "Patient", "HMO / Policy", "Service", "Claim (₦)", "Auth code", "Status"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((r) => (
                  <tr key={r.id} className={selected.has(r.id) ? "bg-blue-50/40" : "hover:bg-gray-50/50"}>
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selected.has(r.id)}
                        onChange={() => toggle(r.id)}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600"
                        aria-label={`Select charge ${r.id}`}
                      />
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                      {new Date(r.serviceDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                    </td>
                    <td className="px-4 py-3 text-sm whitespace-nowrap">
                      <span className="font-medium text-gray-900">{r.patientFirstname} {r.patientLastname}</span>
                      {r.patientMrn && <span className="block text-xs text-gray-500">{r.patientMrn}</span>}
                    </td>
                    <td className="px-4 py-3 text-sm whitespace-nowrap">
                      <span className="text-gray-900">{r.hmoName}</span>
                      <span className="block text-xs text-gray-500">{r.policyNumber ?? "No policy no."}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{r.description ?? "—"}</td>
                    <td className="px-4 py-3 text-sm whitespace-nowrap">
                      <span className="font-medium text-gray-900">{naira(r.hmoAmount)}</span>
                      {r.patientAmount > 0 && (
                        <span className="block text-xs text-gray-500">co-pay {naira(r.patientAmount)}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => setAuthEdit({ id: r.id, code: r.authorizationCode ?? "" })}
                        className={`inline-flex items-center gap-1 ${
                          r.authorizationCode
                            ? "text-gray-800"
                            : r.requiresAuthorization
                              ? "text-amber-700 font-medium"
                              : "text-gray-400"
                        } hover:text-blue-700`}
                      >
                        {r.authorizationCode ?? (r.requiresAuthorization ? "Missing — add" : "Add")}
                        <PencilSquareIcon className="h-3.5 w-3.5" />
                      </button>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${STATUS_STYLE[r.status]}`}>
                        {STATUS_LABEL[r.status]}
                      </span>
                      {r.claimReference && <span className="block mt-1 text-xs text-gray-500">{r.claimReference}</span>}
                      {r.status === "rejected" && r.statusNote && (
                        <span className="block mt-1 text-xs text-red-600 max-w-[200px] whitespace-normal">{r.statusNote}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal isOpen={rejectOpen} onClose={() => setRejectOpen(false)} title="Mark as rejected by HMO">
        <div className="space-y-4">
          <label className="block text-sm font-medium text-gray-700">
            HMO&apos;s rejection reason
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              placeholder="e.g. Authorization code expired; diagnosis doesn't match service"
              className="mt-1 w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </label>
          <div className="flex justify-end gap-3">
            <button onClick={() => setRejectOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
              Cancel
            </button>
            <button
              disabled={isUpdating || !rejectReason.trim()}
              onClick={async () => {
                if (await setStatusFor("rejected", rejectReason)) {
                  setRejectOpen(false);
                  setRejectReason("");
                }
              }}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
            >
              Mark rejected
            </button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={authEdit !== null} onClose={() => setAuthEdit(null)} title="HMO authorization code">
        {authEdit && (
          <div className="space-y-4">
            <input
              type="text"
              value={authEdit.code}
              onChange={(e) => setAuthEdit({ ...authEdit, code: e.target.value })}
              placeholder="e.g. AUTH-2026-004512"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
            <div className="flex justify-end gap-3">
              <button onClick={() => setAuthEdit(null)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
                Cancel
              </button>
              <button
                disabled={isUpdating}
                onClick={async () => {
                  if (await patch({ ids: [authEdit.id], authorizationCode: authEdit.code }, "Authorization code saved")) {
                    setAuthEdit(null);
                  }
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                Save
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

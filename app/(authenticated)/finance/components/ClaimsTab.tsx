"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import Modal from "@/app/components/ui/Modal";
import { useToast } from "@/app/contexts/ToastContext";
import {
  ArrowDownTrayIcon,
  ArrowLeftIcon,
  ExclamationTriangleIcon,
  PlusIcon,
  PrinterIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
import { naira } from "./billing";

interface BatchRow {
  id: number;
  hmoId: number;
  hmoName: string | null;
  periodMonth: string;
  reference: string;
  status: "draft" | "submitted" | "closed";
  submittedAt: string | null;
  hmoReference: string | null;
  totalClaimed: number | null;
  lineCount: number;
  lineTotal: number;
  paidTotal: number;
  rejectedTotal: number;
  queriedCount: number;
}

interface AgeingRow {
  hmoId: number;
  hmoName: string | null;
  total: number;
  d0_30: number;
  d31_60: number;
  d61_90: number;
  d90_plus: number;
}

interface ClaimsList {
  batches: BatchRow[];
  ageing: AgeingRow[];
  buckets: { key: "d0_30" | "d31_60" | "d61_90" | "d90_plus"; label: string }[];
}

interface ClaimIssue {
  code: string;
  severity: "error" | "warning";
  message: string;
}

interface ClaimLine {
  id: number;
  patientFirstname: string | null;
  patientLastname: string | null;
  patientMrn: string | null;
  policyNumber: string | null;
  description: string | null;
  tariffPrice: number;
  hmoAmount: number;
  patientAmount: number;
  authorizationCode: string | null;
  status: "unclaimed" | "claimed" | "queried" | "paid" | "rejected";
  statusNote: string | null;
  paidAmount: number | null;
  serviceDate: string;
  diagnosis: string | null;
  issues: ClaimIssue[];
}

interface ClaimDetail {
  id: number;
  hmoName: string | null;
  hmoEmail: string | null;
  periodMonth: string;
  reference: string;
  status: "draft" | "submitted" | "closed";
  submittedAt: string | null;
  submissionChannel: string | null;
  hmoReference: string | null;
  totalClaimed: number | null;
  notes: string | null;
  submittedByFirstname: string | null;
  submittedByLastname: string | null;
  unbatchedCount: number;
  lines: ClaimLine[];
}

interface HmoOption {
  id: number;
  name: string;
}

const BATCH_STATUS: Record<BatchRow["status"], { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-gray-100 text-gray-700 border-gray-300" },
  submitted: { label: "Submitted", className: "bg-blue-50 text-blue-700 border-blue-200" },
  closed: { label: "Closed", className: "bg-green-50 text-green-700 border-green-200" },
};

const LINE_STATUS: Record<ClaimLine["status"], { label: string; className: string }> = {
  unclaimed: { label: "Not submitted", className: "bg-gray-100 text-gray-700 border-gray-300" },
  claimed: { label: "Awaiting HMO", className: "bg-blue-50 text-blue-700 border-blue-200" },
  queried: { label: "Queried", className: "bg-purple-50 text-purple-700 border-purple-200" },
  paid: { label: "Paid", className: "bg-green-50 text-green-700 border-green-200" },
  rejected: { label: "Rejected", className: "bg-red-50 text-red-700 border-red-200" },
};

const SUBMISSION_CHANNELS = [
  { key: "email", label: "Email" },
  { key: "hmo_portal", label: "HMO portal" },
  { key: "hand_delivery", label: "Hand delivery" },
  { key: "other", label: "Other" },
];

function previousMonth(): string {
  const [y, m] = new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Lagos" }).slice(0, 7).split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 2, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
}

function lagosDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-CA", { timeZone: "Africa/Lagos" });
}

function csvCell(value: unknown): string {
  const s = value == null ? "" : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

/**
 * Monthly HMO claims: build a batch from the month's unclaimed HMO charges,
 * fix what the pre-submission checks flag, export/print and submit it, then
 * post the HMO's remittance line by line. The ageing table shows what each
 * HMO still owes on submitted claims.
 */
export default function ClaimsTab() {
  const { showToast } = useToast();
  const [openBatchId, setOpenBatchId] = useState<number | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [newForm, setNewForm] = useState({ hmoId: "", month: previousMonth() });
  const [newError, setNewError] = useState("");
  const [creating, setCreating] = useState(false);

  const { data, isLoading, mutate } = useSWR<ClaimsList>("/api/claims", fetcher);
  const { data: hmoOptions = [] } = useSWR<HmoOption[]>("/api/hmo", fetcher);

  const createBatch = async () => {
    setNewError("");
    setCreating(true);
    try {
      const res = await fetch("/api/claims", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hmoId: Number(newForm.hmoId), month: newForm.month }),
      });
      const body = await res.json();
      if (!res.ok) {
        setNewError(body.error || "Failed to create claim");
        return;
      }
      showToast(`Draft claim ${body.reference} created with ${body.lineCount} line(s)`, "success");
      setNewOpen(false);
      mutate();
      setOpenBatchId(body.id);
    } catch {
      setNewError("Failed to create claim");
    } finally {
      setCreating(false);
    }
  };

  if (openBatchId != null) {
    return (
      <ClaimDetailView
        batchId={openBatchId}
        onBack={() => {
          setOpenBatchId(null);
          mutate();
        }}
      />
    );
  }

  const inputClass =
    "mt-1 w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <p className="text-sm text-gray-600">
          Build each month&apos;s claim per HMO from settled HMO charges, then post what the HMO pays.
        </p>
        <button
          onClick={() => {
            setNewError("");
            setNewOpen(true);
          }}
          className="inline-flex items-center gap-2 self-start px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
        >
          <PlusIcon className="h-4 w-4" />
          New claim
        </button>
      </div>

      {data && data.ageing.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900">Outstanding from HMOs (submitted claims)</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-5 py-2 text-left text-xs font-semibold text-gray-600 uppercase">HMO</th>
                  {data.buckets.map((b) => (
                    <th key={b.key} className="px-5 py-2 text-right text-xs font-semibold text-gray-600 uppercase whitespace-nowrap">{b.label}</th>
                  ))}
                  <th className="px-5 py-2 text-right text-xs font-semibold text-gray-600 uppercase">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.ageing.map((a) => (
                  <tr key={a.hmoId}>
                    <td className="px-5 py-2.5 font-medium text-gray-900">{a.hmoName}</td>
                    {data.buckets.map((b) => (
                      <td
                        key={b.key}
                        className={`px-5 py-2.5 text-right whitespace-nowrap ${
                          a[b.key] > 0 && (b.key === "d61_90" || b.key === "d90_plus") ? "text-red-700 font-medium" : "text-gray-700"
                        }`}
                      >
                        {a[b.key] > 0 ? naira(a[b.key]) : "—"}
                      </td>
                    ))}
                    <td className="px-5 py-2.5 text-right font-semibold text-gray-900 whitespace-nowrap">{naira(a.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center items-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : !data || data.batches.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
          <p className="text-gray-700 font-medium">No claims yet</p>
          <p className="text-gray-500 text-sm mt-1">
            Start one per HMO each month — it collects the month&apos;s settled HMO charges and checks them before you submit.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {["Claim", "HMO", "Service month", "Lines", "Claimed", "Paid", "Status"].map((h) => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.batches.map((b) => {
                  const days = b.submittedAt ? Math.floor((Date.now() - new Date(b.submittedAt).getTime()) / 86_400_000) : null;
                  return (
                    <tr key={b.id} className="hover:bg-gray-50/50">
                      <td className="px-5 py-3 text-sm whitespace-nowrap">
                        <button onClick={() => setOpenBatchId(b.id)} className="font-medium text-blue-600 hover:text-blue-800 hover:underline">
                          {b.reference}
                        </button>
                        {b.hmoReference && <span className="block text-xs text-gray-500">HMO ref {b.hmoReference}</span>}
                      </td>
                      <td className="px-5 py-3 text-sm text-gray-900 whitespace-nowrap">{b.hmoName}</td>
                      <td className="px-5 py-3 text-sm text-gray-600 whitespace-nowrap">{monthLabel(b.periodMonth)}</td>
                      <td className="px-5 py-3 text-sm text-gray-600">{b.lineCount}</td>
                      <td className="px-5 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">{naira(b.totalClaimed ?? b.lineTotal)}</td>
                      <td className="px-5 py-3 text-sm whitespace-nowrap">
                        <span className="text-gray-900">{naira(b.paidTotal)}</span>
                        {b.rejectedTotal > 0 && <span className="block text-xs text-red-600">rejected {naira(b.rejectedTotal)}</span>}
                      </td>
                      <td className="px-5 py-3 whitespace-nowrap">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold border ${BATCH_STATUS[b.status].className}`}>
                          {BATCH_STATUS[b.status].label}
                        </span>
                        {b.status === "submitted" && days != null && (
                          <span className={`block mt-1 text-xs ${days > 60 ? "text-red-600" : "text-gray-500"}`}>{days} days ago</span>
                        )}
                        {b.queriedCount > 0 && <span className="block text-xs text-purple-700">{b.queriedCount} queried</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal isOpen={newOpen} onClose={() => setNewOpen(false)} title="New HMO claim">
        <div className="space-y-4">
          {newError && <p className="text-sm text-red-600">{newError}</p>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="block text-sm font-medium text-gray-700">
              HMO
              <select value={newForm.hmoId} onChange={(e) => setNewForm({ ...newForm, hmoId: e.target.value })} className={inputClass}>
                <option value="">Select…</option>
                {hmoOptions.map((h) => (
                  <option key={h.id} value={h.id}>{h.name}</option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-medium text-gray-700">
              Service month
              <input type="month" value={newForm.month} onChange={(e) => setNewForm({ ...newForm, month: e.target.value })} className={inputClass} />
            </label>
          </div>
          <p className="text-xs text-gray-500">
            The draft collects every settled, unclaimed charge for this HMO in that month. You can review the checks, remove
            lines and add late ones before submitting.
          </p>
          <div className="flex justify-end gap-3">
            <button onClick={() => setNewOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
              Cancel
            </button>
            <button
              onClick={createBatch}
              disabled={creating || !newForm.hmoId || !newForm.month}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {creating ? "Creating..." : "Create draft"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

type LineAction = "paid_full" | "paid_partial" | "rejected" | "queried" | "claimed";

function ClaimDetailView({ batchId, onBack }: { batchId: number; onBack: () => void }) {
  const { showToast } = useToast();
  const { data: claim, isLoading, mutate } = useSWR<ClaimDetail>(`/api/claims/${batchId}`, fetcher);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [onlyIssues, setOnlyIssues] = useState(false);
  const [busy, setBusy] = useState(false);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [submitForm, setSubmitForm] = useState({ channel: "email", hmoReference: "", allowErrors: false });
  const [submitError, setSubmitError] = useState("");
  const [lineAction, setLineAction] = useState<LineAction | null>(null);
  const [lineForm, setLineForm] = useState({ amount: "", note: "" });
  const [lineError, setLineError] = useState("");
  const [cancelOpen, setCancelOpen] = useState(false);

  const counts = useMemo(() => {
    const lines = claim?.lines ?? [];
    return {
      errorLines: lines.filter((l) => l.issues.some((i) => i.severity === "error")).length,
      warningLines: lines.filter((l) => l.issues.some((i) => i.severity === "warning") && !l.issues.some((i) => i.severity === "error")).length,
      total: lines.reduce((s, l) => s + l.hmoAmount, 0),
      paid: lines.filter((l) => l.status === "paid").reduce((s, l) => s + (l.paidAmount ?? 0), 0),
      rejected: lines.filter((l) => l.status === "rejected").reduce((s, l) => s + l.hmoAmount, 0),
      outstanding: lines.filter((l) => l.status === "claimed" || l.status === "queried").reduce((s, l) => s + l.hmoAmount, 0),
    };
  }, [claim]);

  if (isLoading || !claim) {
    return (
      <div className="flex justify-center items-center h-40">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  const isDraft = claim.status === "draft";
  const visible = onlyIssues ? claim.lines.filter((l) => l.issues.length > 0) : claim.lines;
  const allSelected = visible.length > 0 && visible.every((l) => selected.has(l.id));

  const patchBatch = async (body: Record<string, unknown>, success: string) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/claims/${batchId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) return data.error || "Failed";
      showToast(success, "success");
      setSelected(new Set());
      mutate();
      return null;
    } catch {
      return "Failed";
    } finally {
      setBusy(false);
    }
  };

  const submitLineAction = async () => {
    if (!lineAction) return;
    setLineError("");
    const ids = [...selected];
    const body: Record<string, unknown> = { chargeIds: ids, note: lineForm.note };
    if (lineAction === "paid_full") body.outcome = "paid";
    if (lineAction === "paid_partial") {
      body.outcome = "paid";
      body.paidAmount = lineForm.amount;
    }
    if (lineAction === "rejected" || lineAction === "queried" || lineAction === "claimed") body.outcome = lineAction;
    setBusy(true);
    try {
      const res = await fetch(`/api/claims/${batchId}/lines`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setLineError(data.error || "Failed");
        return;
      }
      showToast(`${data.updated} line(s) updated`, "success");
      setLineAction(null);
      setSelected(new Set());
      mutate();
    } catch {
      setLineError("Failed");
    } finally {
      setBusy(false);
    }
  };

  const exportCsv = () => {
    const header = [
      "Claim", "HMO", "Service date", "Patient", "MRN", "Membership no.", "Diagnosis (ICD-11)", "Service",
      "Authorization code", "Tariff (NGN)", "Co-pay (NGN)", "Claim amount (NGN)", "Status", "Paid (NGN)", "HMO note",
    ];
    const lines = claim.lines.map((l) => [
      claim.reference,
      claim.hmoName,
      lagosDate(l.serviceDate),
      `${l.patientFirstname ?? ""} ${l.patientLastname ?? ""}`.trim(),
      l.patientMrn,
      l.policyNumber,
      l.diagnosis,
      l.description,
      l.authorizationCode,
      l.tariffPrice,
      l.patientAmount,
      l.hmoAmount,
      LINE_STATUS[l.status].label,
      l.paidAmount,
      l.statusNote,
    ].map(csvCell).join(","));
    const blob = new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${claim.reference}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const printClaim = () => {
    const rows = claim.lines
      .map(
        (l, i) => `<tr>
          <td>${i + 1}</td><td>${lagosDate(l.serviceDate)}</td>
          <td>${escapeHtml(`${l.patientFirstname ?? ""} ${l.patientLastname ?? ""}`.trim())}<br/><small>${escapeHtml(l.patientMrn ?? "")}</small></td>
          <td>${escapeHtml(l.policyNumber ?? "")}</td>
          <td>${escapeHtml(l.diagnosis ?? "")}</td>
          <td>${escapeHtml(l.description ?? "")}</td>
          <td>${escapeHtml(l.authorizationCode ?? "")}</td>
          <td class="num">${l.hmoAmount.toLocaleString()}</td>
        </tr>`,
      )
      .join("");
    const html = `<!doctype html><html><head><title>${escapeHtml(claim.reference)}</title>
      <style>
        body{font-family:system-ui,sans-serif;font-size:12px;color:#111;margin:24px}
        h1{font-size:18px;margin:0 0 4px} p{margin:2px 0}
        table{width:100%;border-collapse:collapse;margin-top:16px}
        th,td{border:1px solid #ccc;padding:6px;text-align:left;vertical-align:top}
        th{background:#f3f4f6} .num{text-align:right} tfoot td{font-weight:600}
      </style></head><body>
      <h1>HMO claim ${escapeHtml(claim.reference)}</h1>
      <p><strong>HMO:</strong> ${escapeHtml(claim.hmoName ?? "")}</p>
      <p><strong>Service month:</strong> ${escapeHtml(monthLabel(claim.periodMonth))}</p>
      <p><strong>Lines:</strong> ${claim.lines.length} &nbsp; <strong>Total claimed:</strong> NGN ${counts.total.toLocaleString()}</p>
      <table><thead><tr><th>#</th><th>Date</th><th>Patient</th><th>Membership no.</th><th>Diagnosis</th><th>Service</th><th>Auth code</th><th class="num">Amount (NGN)</th></tr></thead>
      <tbody>${rows}</tbody>
      <tfoot><tr><td colspan="7">Total</td><td class="num">${counts.total.toLocaleString()}</td></tr></tfoot></table>
      </body></html>`;
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.focus();
    w.print();
  };

  const inputClass =
    "mt-1 w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500";
  const selectedLines = claim.lines.filter((l) => selected.has(l.id));

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeftIcon className="h-4 w-4" />
        All claims
      </button>

      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-gray-900">{claim.reference}</h2>
            <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold border ${BATCH_STATUS[claim.status].className}`}>
              {BATCH_STATUS[claim.status].label}
            </span>
          </div>
          <p className="text-sm text-gray-600">
            {claim.hmoName} · services in {monthLabel(claim.periodMonth)}
            {claim.submittedAt &&
              ` · submitted ${new Date(claim.submittedAt).toLocaleDateString("en-GB", { dateStyle: "medium" })} via ${
                SUBMISSION_CHANNELS.find((c) => c.key === claim.submissionChannel)?.label ?? claim.submissionChannel
              }${claim.submittedByFirstname ? ` by ${claim.submittedByFirstname} ${claim.submittedByLastname ?? ""}` : ""}`}
            {claim.hmoReference && ` · HMO ref ${claim.hmoReference}`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={exportCsv} className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
            <ArrowDownTrayIcon className="h-4 w-4" />
            Export CSV
          </button>
          <button onClick={printClaim} className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
            <PrinterIcon className="h-4 w-4" />
            Print claim form
          </button>
          {isDraft && (
            <>
              <button onClick={() => setCancelOpen(true)} className="px-3 py-2 text-sm font-medium text-red-700 bg-white border border-red-200 rounded-lg hover:bg-red-50">
                Discard draft
              </button>
              <button
                onClick={() => {
                  setSubmitError("");
                  setSubmitForm({ channel: "email", hmoReference: "", allowErrors: false });
                  setSubmitOpen(true);
                }}
                disabled={claim.lines.length === 0}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                Submit claim
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500">{claim.lines.length} lines claimed</p>
          <p className="text-xl font-bold text-gray-900">{naira(claim.totalClaimed ?? counts.total)}</p>
        </div>
        {isDraft ? (
          <>
            <div className={`rounded-xl border p-4 ${counts.errorLines ? "border-red-200 bg-red-50" : "border-gray-200 bg-white"}`}>
              <p className={`text-xs ${counts.errorLines ? "text-red-700" : "text-gray-500"}`}>Lines with errors</p>
              <p className={`text-xl font-bold ${counts.errorLines ? "text-red-700" : "text-gray-900"}`}>{counts.errorLines}</p>
            </div>
            <div className={`rounded-xl border p-4 ${counts.warningLines ? "border-amber-200 bg-amber-50" : "border-gray-200 bg-white"}`}>
              <p className={`text-xs ${counts.warningLines ? "text-amber-800" : "text-gray-500"}`}>Lines with warnings only</p>
              <p className={`text-xl font-bold ${counts.warningLines ? "text-amber-800" : "text-gray-900"}`}>{counts.warningLines}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <p className="text-xs text-gray-500">New charges not in this claim</p>
              <p className="text-xl font-bold text-gray-900">{claim.unbatchedCount}</p>
              {claim.unbatchedCount > 0 && (
                <button
                  disabled={busy}
                  onClick={async () => {
                    const err = await patchBatch({ action: "add_unbatched" }, "Charges added");
                    if (err) showToast(err, "error");
                  }}
                  className="mt-1 text-xs font-semibold text-blue-600 hover:text-blue-800"
                >
                  Add them
                </button>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <p className="text-xs text-gray-500">Paid by HMO</p>
              <p className="text-xl font-bold text-green-700">{naira(counts.paid)}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <p className="text-xs text-gray-500">Still outstanding</p>
              <p className="text-xl font-bold text-gray-900">{naira(counts.outstanding)}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <p className="text-xs text-gray-500">Rejected</p>
              <p className="text-xl font-bold text-red-700">{naira(counts.rejected)}</p>
            </div>
          </>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label className="inline-flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={onlyIssues} onChange={(e) => setOnlyIssues(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-blue-600" />
          Only lines with issues
        </label>
        {selected.size > 0 && (
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm">
            <span className="font-medium text-blue-800">{selected.size} selected</span>
            {isDraft ? (
              <button
                disabled={busy}
                onClick={async () => {
                  const err = await patchBatch({ action: "remove_lines", chargeIds: [...selected] }, "Lines removed from the claim");
                  if (err) showToast(err, "error");
                }}
                className="font-medium text-red-700 hover:text-red-900"
              >
                Remove from claim
              </button>
            ) : (
              <>
                {(["paid_full", "paid_partial", "queried", "rejected", "claimed"] as LineAction[]).map((a) => (
                  <button
                    key={a}
                    disabled={busy || (a === "paid_partial" && selected.size !== 1)}
                    onClick={() => {
                      setLineError("");
                      setLineForm({ amount: a === "paid_partial" ? String(selectedLines[0]?.hmoAmount ?? "") : "", note: "" });
                      setLineAction(a);
                    }}
                    className="font-medium text-blue-700 hover:text-blue-900 disabled:text-gray-400"
                  >
                    {a === "paid_full" ? "Paid in full" : a === "paid_partial" ? "Part-paid" : a === "queried" ? "Queried" : a === "rejected" ? "Rejected" : "Query answered"}
                  </button>
                ))}
              </>
            )}
          </div>
        )}
      </div>

      {claim.lines.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center text-sm text-gray-500">This claim has no lines.</div>
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
                      onChange={() => setSelected(allSelected ? new Set() : new Set(visible.map((l) => l.id)))}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600"
                      aria-label="Select all lines"
                    />
                  </th>
                  {["Date", "Patient", "Service / diagnosis", "Auth code", "Claim (₦)", isDraft ? "Checks" : "HMO response"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {visible.map((l) => (
                  <tr key={l.id} className={selected.has(l.id) ? "bg-blue-50/40" : "hover:bg-gray-50/50"}>
                    <td className="px-4 py-3 align-top">
                      <input
                        type="checkbox"
                        checked={selected.has(l.id)}
                        onChange={() =>
                          setSelected((prev) => {
                            const next = new Set(prev);
                            if (next.has(l.id)) next.delete(l.id);
                            else next.add(l.id);
                            return next;
                          })
                        }
                        className="h-4 w-4 rounded border-gray-300 text-blue-600"
                        aria-label={`Select line ${l.id}`}
                      />
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap align-top">
                      {new Date(l.serviceDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
                    </td>
                    <td className="px-4 py-3 text-sm whitespace-nowrap align-top">
                      <span className="font-medium text-gray-900">{l.patientFirstname} {l.patientLastname}</span>
                      <span className="block text-xs text-gray-500">{l.patientMrn} · No. {l.policyNumber ?? "—"}</span>
                    </td>
                    <td className="px-4 py-3 text-sm align-top">
                      <span className="text-gray-900">{l.description}</span>
                      <span className="block text-xs text-gray-500">{l.diagnosis ?? "No diagnosis"}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap align-top">{l.authorizationCode ?? "—"}</td>
                    <td className="px-4 py-3 text-sm whitespace-nowrap align-top">
                      <span className="font-medium text-gray-900">{naira(l.hmoAmount)}</span>
                      {l.patientAmount > 0 && <span className="block text-xs text-gray-500">co-pay {naira(l.patientAmount)}</span>}
                    </td>
                    <td className="px-4 py-3 text-sm align-top">
                      {isDraft ? (
                        l.issues.length === 0 ? (
                          <span className="text-xs font-medium text-green-700">Ready</span>
                        ) : (
                          <ul className="space-y-0.5">
                            {l.issues.map((i) => (
                              <li key={i.code} className={`flex items-start gap-1 text-xs ${i.severity === "error" ? "text-red-700" : "text-amber-700"}`}>
                                {i.severity === "error" ? (
                                  <XCircleIcon className="h-3.5 w-3.5 mt-px shrink-0" />
                                ) : (
                                  <ExclamationTriangleIcon className="h-3.5 w-3.5 mt-px shrink-0" />
                                )}
                                {i.message}
                              </li>
                            ))}
                          </ul>
                        )
                      ) : (
                        <div>
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold border ${LINE_STATUS[l.status].className}`}>
                            {LINE_STATUS[l.status].label}
                          </span>
                          {l.status === "paid" && l.paidAmount != null && l.paidAmount !== l.hmoAmount && (
                            <span className="block text-xs text-amber-700">paid {naira(l.paidAmount)} (short {naira(l.hmoAmount - l.paidAmount)})</span>
                          )}
                          {l.statusNote && <span className="block text-xs text-gray-600 max-w-[220px]">{l.statusNote}</span>}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal isOpen={submitOpen} onClose={() => setSubmitOpen(false)} title={`Submit ${claim.reference}`}>
        <div className="space-y-4">
          {submitError && <p className="text-sm text-red-600">{submitError}</p>}
          <p className="text-sm text-gray-600">
            {claim.lines.length} lines · {naira(counts.total)} to {claim.hmoName}. After submitting, lines can&apos;t be added or
            removed; you&apos;ll post the HMO&apos;s payments and queries line by line.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block text-sm font-medium text-gray-700">
              Submitted via
              <select value={submitForm.channel} onChange={(e) => setSubmitForm({ ...submitForm, channel: e.target.value })} className={inputClass}>
                {SUBMISSION_CHANNELS.map((c) => (
                  <option key={c.key} value={c.key}>{c.label}</option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-medium text-gray-700">
              HMO acknowledgement no. <span className="font-normal text-gray-400">(optional)</span>
              <input type="text" value={submitForm.hmoReference} onChange={(e) => setSubmitForm({ ...submitForm, hmoReference: e.target.value })} className={inputClass} />
            </label>
          </div>
          {counts.errorLines > 0 && (
            <label className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              <input
                type="checkbox"
                checked={submitForm.allowErrors}
                onChange={(e) => setSubmitForm({ ...submitForm, allowErrors: e.target.checked })}
                className="mt-0.5 h-4 w-4 rounded border-red-300 text-red-600"
              />
              {counts.errorLines} line{counts.errorLines === 1 ? " has" : "s have"} errors the HMO is likely to reject (e.g. missing
              authorization code). Submit anyway?
            </label>
          )}
          <div className="flex justify-end gap-3">
            <button onClick={() => setSubmitOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
              Cancel
            </button>
            <button
              disabled={busy || (counts.errorLines > 0 && !submitForm.allowErrors)}
              onClick={async () => {
                setSubmitError("");
                const err = await patchBatch(
                  { action: "submit", submissionChannel: submitForm.channel, hmoReference: submitForm.hmoReference, allowErrors: submitForm.allowErrors },
                  "Claim submitted",
                );
                if (err) setSubmitError(err);
                else setSubmitOpen(false);
              }}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {busy ? "Submitting..." : "Mark as submitted"}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={lineAction !== null}
        onClose={() => setLineAction(null)}
        title={
          lineAction === "paid_full" ? "Paid in full"
          : lineAction === "paid_partial" ? "Part-payment"
          : lineAction === "rejected" ? "Rejected by HMO"
          : lineAction === "queried" ? "Queried by HMO"
          : "Query answered"
        }
      >
        {lineAction && (
          <div className="space-y-4">
            {lineError && <p className="text-sm text-red-600">{lineError}</p>}
            <p className="text-sm text-gray-600">
              {selected.size} line{selected.size !== 1 ? "s" : ""} · {naira(selectedLines.reduce((s, l) => s + l.hmoAmount, 0))} claimed
            </p>
            {lineAction === "paid_partial" && (
              <label className="block text-sm font-medium text-gray-700">
                Amount the HMO paid (₦)
                <input type="number" min={0} value={lineForm.amount} onChange={(e) => setLineForm({ ...lineForm, amount: e.target.value })} className={inputClass} />
              </label>
            )}
            <label className="block text-sm font-medium text-gray-700">
              {lineAction === "rejected" ? "HMO's reason" : lineAction === "queried" ? "HMO's query" : "Note"}{" "}
              {lineAction !== "rejected" && lineAction !== "queried" && <span className="font-normal text-gray-400">(optional)</span>}
              <textarea
                value={lineForm.note}
                onChange={(e) => setLineForm({ ...lineForm, note: e.target.value })}
                rows={3}
                className={inputClass}
                placeholder={lineAction === "rejected" ? "e.g. Authorization code expired" : lineAction === "queried" ? "e.g. Send lab result to support the claim" : lineAction === "paid_partial" ? "e.g. HMO paid its old tariff" : ""}
              />
            </label>
            <div className="flex justify-end gap-3">
              <button onClick={() => setLineAction(null)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={submitLineAction} disabled={busy} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {busy ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Modal isOpen={cancelOpen} onClose={() => setCancelOpen(false)} title="Discard draft claim">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Discard {claim.reference}? Its {claim.lines.length} lines go back to unclaimed and can be put in a new claim.
          </p>
          <div className="flex justify-end gap-3">
            <button onClick={() => setCancelOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
              Keep
            </button>
            <button
              disabled={busy}
              onClick={async () => {
                const err = await patchBatch({ action: "cancel" }, "Draft discarded");
                if (err) showToast(err, "error");
                else {
                  setCancelOpen(false);
                  onBack();
                }
              }}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
            >
              Discard
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

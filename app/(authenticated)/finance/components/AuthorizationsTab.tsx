"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import Modal from "@/app/components/ui/Modal";
import { useToast } from "@/app/contexts/ToastContext";
import { ArrowDownTrayIcon, ClockIcon, PhoneIcon, PlusIcon } from "@heroicons/react/24/outline";
import { naira, AUTH_SLA_MINUTES, todayInLagos } from "./billing";

interface AuthItem {
  id: number;
  itemType: "request" | "prescription";
  itemId: number;
  description: string | null;
  tariffPrice: number | null;
}

interface AuthRow {
  id: number;
  status: "pending" | "approved" | "denied" | "cancelled";
  source: "auto" | "manual";
  channel: string | null;
  isEmergency: boolean;
  requestedAt: string;
  sentAt: string | null;
  respondedAt: string | null;
  code: string | null;
  validUntil: string | null;
  denialReason: string | null;
  escalatedAt: string | null;
  escalationNote: string | null;
  notes: string | null;
  patientId: number;
  patientFirstname: string | null;
  patientLastname: string | null;
  patientMrn: string | null;
  hmoId: number;
  hmoName: string | null;
  hmoPhone: string | null;
  hmoEmail: string | null;
  membershipNumber: string | null;
  requestedByFirstname: string | null;
  requestedByLastname: string | null;
  sla: { minutes: number; breached: boolean } | null;
  items: AuthItem[];
}

interface HmoOption {
  id: number;
  name: string;
}

const CHANNELS = [
  { key: "phone", label: "Phone call" },
  { key: "whatsapp", label: "WhatsApp" },
  { key: "hmo_portal", label: "HMO portal" },
  { key: "email", label: "Email" },
  { key: "other", label: "Other" },
];
const CHANNEL_LABEL = Object.fromEntries(CHANNELS.map((c) => [c.key, c.label]));

const STATUS_STYLE: Record<AuthRow["status"], string> = {
  pending: "bg-amber-50 text-amber-800 border-amber-200",
  approved: "bg-green-50 text-green-700 border-green-200",
  denied: "bg-red-50 text-red-700 border-red-200",
  cancelled: "bg-gray-100 text-gray-600 border-gray-300",
};

type ActionKind = "send" | "approve" | "deny" | "escalate" | "cancel" | "update";

function minutesSince(iso: string, now: number) {
  return Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60_000));
}

function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

function formatTime(iso: string | null) {
  return iso ? new Date(iso).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }) : "—";
}

function csvCell(value: unknown): string {
  const s = value == null ? "" : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/**
 * HMO pre-authorization worklist and log. Pending requests show a live
 * clock against NHIA's one-hour response rule; the full log (with sent /
 * responded times and escalations) exports as evidence for escalating slow
 * HMOs to the NHIA state office.
 */
export default function AuthorizationsTab() {
  const { showToast } = useToast();
  const [status, setStatus] = useState("pending");
  const [hmoId, setHmoId] = useState("");
  const [month, setMonth] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const [action, setAction] = useState<{ kind: ActionKind; row: AuthRow } | null>(null);
  const [form, setForm] = useState({ channel: "phone", code: "", validUntil: "", reason: "" });
  const [actionError, setActionError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [newOpen, setNewOpen] = useState(false);

  // Re-render the pending timers every 30s.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  const query = new URLSearchParams();
  if (status) query.set("status", status);
  if (hmoId) query.set("hmoId", hmoId);
  if (month) query.set("month", month);
  const { data: rows = [], isLoading, mutate } = useSWR<AuthRow[]>(`/api/hmo-authorizations?${query}`, fetcher, {
    refreshInterval: 60_000,
  });
  const { data: hmoOptions = [] } = useSWR<HmoOption[]>("/api/hmo", fetcher);

  const stats = useMemo(() => {
    const pending = rows.filter((r) => r.status === "pending");
    const responded = rows.filter((r) => r.sla && r.respondedAt);
    const avg = responded.length
      ? Math.round(responded.reduce((s, r) => s + (r.sla?.minutes ?? 0), 0) / responded.length)
      : null;
    return {
      unsent: pending.filter((r) => !r.sentAt).length,
      waiting: pending.filter((r) => r.sentAt).length,
      breached: pending.filter((r) => r.sentAt && minutesSince(r.sentAt, now) > AUTH_SLA_MINUTES).length,
      avgResponse: avg,
      lateResponses: responded.filter((r) => r.sla?.breached).length,
      respondedCount: responded.length,
    };
  }, [rows, now]);

  const openAction = (kind: ActionKind, row: AuthRow) => {
    setForm({
      channel: row.channel ?? "phone",
      code: kind === "update" ? row.code ?? "" : "",
      validUntil: kind === "update" ? row.validUntil ?? "" : "",
      reason:
        kind === "escalate"
          ? `No response from ${row.hmoName ?? "HMO"} within ${AUTH_SLA_MINUTES} minutes — escalated to NHIA state office`
          : "",
    });
    setActionError("");
    setAction({ kind, row });
  };

  const submitAction = async () => {
    if (!action) return;
    setActionError("");
    setIsSaving(true);
    const body: Record<string, unknown> = { action: action.kind };
    if (action.kind === "send") body.channel = form.channel;
    if (action.kind === "approve" || action.kind === "update") {
      body.code = form.code;
      body.validUntil = form.validUntil;
    }
    if (action.kind === "deny") body.denialReason = form.reason;
    if (action.kind === "escalate") body.escalationNote = form.reason;
    if (action.kind === "cancel") body.notes = form.reason;
    try {
      const res = await fetch(`/api/hmo-authorizations/${action.row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setActionError(data.error || "Failed to save");
        return;
      }
      showToast("Authorization updated", "success");
      setAction(null);
      mutate();
    } catch {
      setActionError("Failed to save");
    } finally {
      setIsSaving(false);
    }
  };

  const exportCsv = () => {
    const header = [
      "Authorization ID", "Patient", "MRN", "Membership no.", "HMO", "Services", "Emergency",
      "Raised at", "Sent at", "Channel", "Responded at", "HMO response (min)", "Over 1-hour limit",
      "Status", "Code", "Valid until", "Denial reason", "Escalated at", "Escalation note",
    ];
    const lines = rows.map((r) => [
      r.id,
      `${r.patientFirstname ?? ""} ${r.patientLastname ?? ""}`.trim(),
      r.patientMrn,
      r.membershipNumber,
      r.hmoName,
      r.items.map((i) => i.description).join("; "),
      r.isEmergency ? "Yes" : "No",
      r.requestedAt,
      r.sentAt,
      r.channel ? CHANNEL_LABEL[r.channel] ?? r.channel : "",
      r.respondedAt,
      r.sla?.minutes,
      r.sla ? (r.sla.breached ? "Yes" : "No") : "",
      r.status,
      r.code,
      r.validUntil,
      r.denialReason,
      r.escalatedAt,
      r.escalationNote,
    ].map(csvCell).join(","));
    const blob = new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `hmo-authorizations-${month || todayInLagos()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const today = todayInLagos();
  const inputClass =
    "mt-1 w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500">Not yet sent</p>
          <p className="text-2xl font-bold text-gray-900">{stats.unsent}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500">Waiting on HMO</p>
          <p className="text-2xl font-bold text-gray-900">{stats.waiting}</p>
        </div>
        <div className={`rounded-xl border p-4 ${stats.breached > 0 ? "border-red-200 bg-red-50" : "border-gray-200 bg-white"}`}>
          <p className={`text-xs ${stats.breached > 0 ? "text-red-700" : "text-gray-500"}`}>Over {AUTH_SLA_MINUTES} min</p>
          <p className={`text-2xl font-bold ${stats.breached > 0 ? "text-red-700" : "text-gray-900"}`}>{stats.breached}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500">Avg HMO response</p>
          <p className="text-2xl font-bold text-gray-900">{stats.avgResponse != null ? formatDuration(stats.avgResponse) : "—"}</p>
          {stats.respondedCount > 0 && (
            <p className="text-xs text-gray-500">{stats.lateResponses} of {stats.respondedCount} late</p>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="denied">Declined</option>
            <option value="cancelled">Cancelled</option>
            <option value="">All</option>
          </select>
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
          <label className="block text-xs font-medium text-gray-600 mb-1">Month raised</label>
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="sm:ml-auto flex gap-2">
          <button
            onClick={exportCsv}
            disabled={rows.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            <ArrowDownTrayIcon className="h-4 w-4" />
            Export log
          </button>
          <button
            onClick={() => setNewOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            <PlusIcon className="h-4 w-4" />
            New request
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : rows.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
          <p className="text-gray-500 text-sm">
            {status === "pending"
              ? "No pending authorizations. Requests appear here automatically when a doctor orders a service the HMO's price list marks “needs authorization”."
              : "No authorizations match these filters."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => {
            const waiting = r.status === "pending" && r.sentAt ? minutesSince(r.sentAt, now) : null;
            const breached = waiting != null && waiting > AUTH_SLA_MINUTES;
            const expired = r.status === "approved" && r.validUntil != null && r.validUntil < today;
            const total = r.items.reduce((s, i) => s + (i.tariffPrice ?? 0), 0);
            return (
              <div
                key={r.id}
                className={`rounded-xl border bg-white p-4 ${breached ? "border-red-300" : "border-gray-200"}`}
              >
                <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-gray-900">
                        {r.patientFirstname} {r.patientLastname}
                      </span>
                      {r.patientMrn && <span className="text-xs text-gray-500">{r.patientMrn}</span>}
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold border ${STATUS_STYLE[r.status]}`}>
                        {r.status === "pending" ? (r.sentAt ? "Waiting on HMO" : "Not sent") : r.status === "denied" ? "Declined" : r.status[0].toUpperCase() + r.status.slice(1)}
                      </span>
                      {r.isEmergency && (
                        <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold border bg-red-50 text-red-700 border-red-200">Emergency</span>
                      )}
                      {r.escalatedAt && (
                        <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold border bg-purple-50 text-purple-700 border-purple-200">Escalated</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-700">
                      {r.hmoName} · No. {r.membershipNumber ?? "—"}
                      {r.hmoPhone && (
                        <a href={`tel:${r.hmoPhone}`} className="ml-2 inline-flex items-center gap-1 text-blue-600 hover:underline">
                          <PhoneIcon className="h-3.5 w-3.5" />
                          {r.hmoPhone}
                        </a>
                      )}
                    </p>
                    <ul className="text-sm text-gray-600">
                      {r.items.map((i) => (
                        <li key={i.id}>
                          {i.description ?? (i.itemType === "request" ? "Test" : "Medication")}
                          {i.tariffPrice != null && <span className="text-gray-400"> · {naira(i.tariffPrice)}</span>}
                        </li>
                      ))}
                    </ul>
                    <p className="text-xs text-gray-500">
                      Raised {formatTime(r.requestedAt)}
                      {r.source === "auto" ? " automatically from the doctor's order" : r.requestedByFirstname ? ` by ${r.requestedByFirstname} ${r.requestedByLastname ?? ""}` : ""}
                      {r.sentAt && ` · sent ${formatTime(r.sentAt)} via ${CHANNEL_LABEL[r.channel ?? ""] ?? r.channel}`}
                      {r.respondedAt && ` · answered ${formatTime(r.respondedAt)}`}
                      {r.sla && r.respondedAt && ` (${formatDuration(r.sla.minutes)}${r.sla.breached ? ", over the limit" : ""})`}
                    </p>
                    {r.status === "approved" && (
                      <p className={`text-sm font-medium ${expired ? "text-red-700" : "text-green-700"}`}>
                        Code {r.code}
                        {r.validUntil && ` · valid until ${r.validUntil}`}
                        {expired && " — expired"}
                      </p>
                    )}
                    {r.status === "denied" && <p className="text-sm text-red-700">Declined: {r.denialReason}</p>}
                    {r.escalationNote && <p className="text-xs text-purple-700">{formatTime(r.escalatedAt)} — {r.escalationNote}</p>}
                  </div>

                  <div className="lg:w-64 shrink-0 space-y-2">
                    {r.status === "pending" && (
                      <div className={`flex items-center gap-2 text-sm font-semibold ${breached ? "text-red-700" : r.sentAt ? "text-amber-700" : "text-gray-500"}`}>
                        <ClockIcon className="h-4 w-4" />
                        {r.sentAt
                          ? `${formatDuration(waiting ?? 0)} waiting${breached ? ` · over ${AUTH_SLA_MINUTES} min` : ""}`
                          : `Raised ${formatDuration(minutesSince(r.requestedAt, now))} ago — send to HMO`}
                      </div>
                    )}
                    {total > 0 && <p className="text-xs text-gray-500">Tariff total {naira(total)}</p>}
                    <div className="flex flex-wrap gap-2">
                      {r.status === "pending" && !r.sentAt && (
                        <button onClick={() => openAction("send", r)} className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">
                          Mark sent
                        </button>
                      )}
                      {r.status === "pending" && (
                        <>
                          <button onClick={() => openAction("approve", r)} className="px-3 py-1.5 text-xs font-medium text-white bg-green-600 rounded-lg hover:bg-green-700">
                            Record code
                          </button>
                          <button onClick={() => openAction("deny", r)} className="px-3 py-1.5 text-xs font-medium text-red-700 bg-white border border-red-200 rounded-lg hover:bg-red-50">
                            Declined
                          </button>
                          {r.sentAt && !r.escalatedAt && (
                            <button
                              onClick={() => openAction("escalate", r)}
                              className={`px-3 py-1.5 text-xs font-medium rounded-lg border ${breached ? "text-white bg-purple-600 border-purple-600 hover:bg-purple-700" : "text-purple-700 bg-white border-purple-200 hover:bg-purple-50"}`}
                            >
                              Escalate
                            </button>
                          )}
                          <button onClick={() => openAction("cancel", r)} className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
                            Cancel
                          </button>
                        </>
                      )}
                      {r.status === "approved" && (
                        <button onClick={() => openAction("update", r)} className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
                          Edit code / validity
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal
        isOpen={action !== null}
        onClose={() => setAction(null)}
        title={
          action?.kind === "send" ? "Mark as sent to HMO"
          : action?.kind === "approve" ? "Record authorization code"
          : action?.kind === "update" ? "Edit authorization"
          : action?.kind === "deny" ? "HMO declined"
          : action?.kind === "escalate" ? "Escalate to NHIA"
          : "Cancel authorization request"
        }
      >
        {action && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              {action.row.patientFirstname} {action.row.patientLastname} · {action.row.hmoName} ·{" "}
              {action.row.items.map((i) => i.description).join(", ")}
            </p>
            {actionError && <p className="text-sm text-red-600">{actionError}</p>}

            {action.kind === "send" && (
              <label className="block text-sm font-medium text-gray-700">
                Sent via
                <select value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value })} className={inputClass}>
                  {CHANNELS.map((c) => (
                    <option key={c.key} value={c.key}>{c.label}</option>
                  ))}
                </select>
                <span className="mt-1 block text-xs font-normal text-gray-500">
                  The {AUTH_SLA_MINUTES}-minute NHIA response clock starts now.
                </span>
              </label>
            )}

            {(action.kind === "approve" || action.kind === "update") && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="block text-sm font-medium text-gray-700">
                  Authorization code
                  <input type="text" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} className={inputClass} autoFocus />
                </label>
                <label className="block text-sm font-medium text-gray-700">
                  Valid until <span className="font-normal text-gray-400">(optional)</span>
                  <input type="date" value={form.validUntil} onChange={(e) => setForm({ ...form, validUntil: e.target.value })} className={inputClass} />
                </label>
              </div>
            )}

            {(action.kind === "deny" || action.kind === "escalate" || action.kind === "cancel") && (
              <label className="block text-sm font-medium text-gray-700">
                {action.kind === "deny" ? "HMO's reason" : action.kind === "escalate" ? "Escalation note" : "Reason (optional)"}
                <textarea
                  value={form.reason}
                  onChange={(e) => setForm({ ...form, reason: e.target.value })}
                  rows={3}
                  className={inputClass}
                  placeholder={action.kind === "deny" ? "e.g. Service not covered under the enrollee's plan" : ""}
                />
                {action.kind === "escalate" && (
                  <span className="mt-1 block text-xs font-normal text-gray-500">
                    NHIA requires HMOs to respond to authorization requests within one hour. Record who you contacted at the
                    NHIA state office; the exported log is your evidence.
                  </span>
                )}
              </label>
            )}

            <div className="flex justify-end gap-3">
              <button onClick={() => setAction(null)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
                Close
              </button>
              <button
                onClick={submitAction}
                disabled={isSaving}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {isSaving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        )}
      </Modal>

      <NewAuthorizationModal
        isOpen={newOpen}
        onClose={() => setNewOpen(false)}
        onCreated={() => {
          setNewOpen(false);
          setStatus("pending");
          mutate();
          showToast("Authorization request logged", "success");
        }}
      />
    </div>
  );
}

interface PatientOption {
  id: number;
  firstname: string;
  lastname: string;
  mrn: string | null;
  insuranceType: string;
}

interface Candidate {
  itemType: "request" | "prescription";
  itemId: number;
  description: string | null;
  price: number | null;
  requiresAuthorization: boolean;
  previouslyDeclined: boolean;
}

/** Log a request made by the desk: pick the patient and their unpaid HMO-covered services. */
function NewAuthorizationModal({ isOpen, onClose, onCreated }: { isOpen: boolean; onClose: () => void; onCreated: () => void }) {
  const [search, setSearch] = useState("");
  const [patient, setPatient] = useState<PatientOption | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [channel, setChannel] = useState("phone");
  const [isEmergency, setIsEmergency] = useState(false);
  const [code, setCode] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const { data: matches = [] } = useSWR<PatientOption[]>(
    isOpen && !patient && search.trim().length >= 2 ? `/api/patients?search=${encodeURIComponent(search.trim())}` : null,
    fetcher,
  );
  const { data: candidates } = useSWR<{ hmoName: string | null; items: Candidate[] }>(
    patient ? `/api/hmo-authorizations/candidates?patientId=${patient.id}` : null,
    fetcher,
  );

  const reset = () => {
    setSearch("");
    setPatient(null);
    setSelected(new Set());
    setChannel("phone");
    setIsEmergency(false);
    setCode("");
    setValidUntil("");
    setError("");
  };

  const k = (c: Candidate) => `${c.itemType}:${c.itemId}`;

  const save = async () => {
    if (!patient || !candidates) return;
    setError("");
    setIsSaving(true);
    try {
      const res = await fetch("/api/hmo-authorizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: patient.id,
          items: candidates.items.filter((c) => selected.has(k(c))).map((c) => ({ itemType: c.itemType, itemId: c.itemId })),
          channel,
          isEmergency,
          code,
          validUntil,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to save");
        return;
      }
      reset();
      onCreated();
    } catch {
      setError("Failed to save");
    } finally {
      setIsSaving(false);
    }
  };

  const inputClass =
    "mt-1 w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <Modal isOpen={isOpen} onClose={() => { reset(); onClose(); }} title="New authorization request">
      <div className="space-y-4">
        {error && <p className="text-sm text-red-600">{error}</p>}
        {!patient ? (
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Patient
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, MRN or NIN"
                className={inputClass}
                autoFocus
              />
            </label>
            {matches.length > 0 && (
              <ul className="mt-2 max-h-56 overflow-y-auto divide-y divide-gray-100 rounded-lg border border-gray-200">
                {matches.slice(0, 10).map((p) => (
                  <li key={p.id}>
                    <button
                      onClick={() => setPatient(p)}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
                    >
                      <span className="font-medium text-gray-900">{p.firstname} {p.lastname}</span>
                      <span className="text-gray-500"> · {p.mrn ?? "—"}</span>
                      {p.insuranceType !== "hmo" && <span className="text-xs text-gray-400"> · no HMO</span>}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-sm">
              <span>
                <span className="font-medium text-gray-900">{patient.firstname} {patient.lastname}</span>
                {candidates?.hmoName && <span className="text-gray-500"> · {candidates.hmoName}</span>}
              </span>
              <button onClick={() => { setPatient(null); setSelected(new Set()); }} className="text-xs font-medium text-blue-600 hover:text-blue-800">
                Change
              </button>
            </div>
            {!candidates ? (
              <div className="h-16 rounded-lg bg-gray-50 animate-pulse" />
            ) : candidates.items.length === 0 ? (
              <p className="text-sm text-gray-500">
                No unpaid HMO-covered services without an authorization for this patient.
              </p>
            ) : (
              <fieldset className="space-y-1">
                <legend className="text-sm font-medium text-gray-700 mb-1">Services to authorize</legend>
                {candidates.items.map((c) => (
                  <label key={k(c)} className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={selected.has(k(c))}
                      onChange={() =>
                        setSelected((prev) => {
                          const next = new Set(prev);
                          if (next.has(k(c))) next.delete(k(c));
                          else next.add(k(c));
                          return next;
                        })
                      }
                      className="h-4 w-4 rounded border-gray-300 text-blue-600"
                    />
                    {c.description ?? "Service"} <span className="text-gray-400">· {naira(c.price)}</span>
                    {c.requiresAuthorization && <span className="text-xs text-amber-700">needs auth</span>}
                    {c.previouslyDeclined && <span className="text-xs text-red-700">declined before — re-request</span>}
                  </label>
                ))}
              </fieldset>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="block text-sm font-medium text-gray-700">
                Sent via
                <select value={channel} onChange={(e) => setChannel(e.target.value)} className={inputClass}>
                  {CHANNELS.map((c) => (
                    <option key={c.key} value={c.key}>{c.label}</option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700 sm:mt-6">
                <input type="checkbox" checked={isEmergency} onChange={(e) => setIsEmergency(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-blue-600" />
                Emergency — treating before the code arrives
              </label>
              <label className="block text-sm font-medium text-gray-700">
                Code, if already given <span className="font-normal text-gray-400">(optional)</span>
                <input type="text" value={code} onChange={(e) => setCode(e.target.value)} className={inputClass} />
              </label>
              <label className="block text-sm font-medium text-gray-700">
                Valid until <span className="font-normal text-gray-400">(optional)</span>
                <input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} className={inputClass} />
              </label>
            </div>
          </>
        )}
        <div className="flex justify-end gap-3">
          <button onClick={() => { reset(); onClose(); }} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
            Cancel
          </button>
          <button
            onClick={save}
            disabled={isSaving || !patient || selected.size === 0}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {isSaving ? "Saving..." : code.trim() ? "Log approved authorization" : "Log request"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

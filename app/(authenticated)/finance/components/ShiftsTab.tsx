"use client";

import { useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import Modal from "@/app/components/ui/Modal";
import { PrinterIcon } from "@heroicons/react/24/outline";
import { DESK_CHANNELS, SHIFT_STATUS_LABEL } from "@/lib/billing/deskChannels";
import { naira, todayInLagos } from "./billing";
import { CloseShiftModal, type ShiftTotals } from "./MyShift";

interface ShiftRow {
  id: number;
  userId: number;
  cashierName: string;
  status: "open" | "closed" | "pending_review" | "reviewed";
  openedAt: string;
  closedAt: string | null;
  openingFloat: number;
  expectedCash: number | null;
  expectedPos: number | null;
  expectedTransfer: number | null;
  countedCash: number | null;
  countedPos: number | null;
  countedTransfer: number | null;
  variance: number | null;
  closeNote: string | null;
  reviewNote: string | null;
  isMine: boolean;
  running: ShiftTotals | null;
}

interface ShiftDetail extends ShiftRow {
  reviewerName: string | null;
  reviewedAt: string | null;
  canReview: boolean;
  totals: ShiftTotals;
  payments: {
    id: number;
    amount: number;
    channel: keyof typeof DESK_CHANNELS | null;
    posReference: string | null;
    createdAt: string;
    patientName: string;
    patientMrn: string | null;
    items: number;
  }[];
}

const STATUS_CLS: Record<ShiftRow["status"], string> = {
  open: "bg-blue-50 text-blue-700 ring-blue-200",
  closed: "bg-green-50 text-green-700 ring-green-200",
  pending_review: "bg-amber-50 text-amber-800 ring-amber-200",
  reviewed: "bg-gray-100 text-gray-700 ring-gray-200",
};

const fmtTime = (d: string | null) =>
  d ? new Date(d).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—";

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

const varianceLabel = (v: number | null) =>
  v == null ? "—" : v === 0 ? "Balanced" : v < 0 ? `Short ${naira(-v)}` : `Over ${naira(v)}`;

/**
 * Finance → Shifts: every cashier shift with its takings and cash-up result.
 * Supervisors (finance edit) see all cashiers and sign off differences;
 * cashiers see their own shifts.
 */
export default function ShiftsTab() {
  const [from, setFrom] = useState(() => new Date(Date.now() - 6 * 86_400_000).toLocaleDateString("en-CA", { timeZone: "Africa/Lagos" }));
  const [to, setTo] = useState(todayInLagos());
  const [status, setStatus] = useState("");
  const [openId, setOpenId] = useState<number | null>(null);

  const qs = new URLSearchParams({ from, to, ...(status && { status }) }).toString();
  const { data, mutate, isLoading } = useSWR<{ shifts: ShiftRow[]; canReview: boolean }>(`/api/cashier-shifts?${qs}`, fetcher);
  const shifts = data?.shifts ?? [];

  const sum = (f: (s: ShiftRow) => number) => shifts.reduce((t, s) => t + f(s), 0);
  const taken = (s: ShiftRow) =>
    s.running
      ? s.running.cash + s.running.pos + s.running.transfer
      : (s.expectedCash ?? 0) - s.openingFloat + (s.expectedPos ?? 0) + (s.expectedTransfer ?? 0);
  const awaiting = shifts.filter((s) => s.status === "pending_review").length;

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-end gap-3">
        <label className="text-sm text-gray-700">
          From
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="mt-1 block rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        </label>
        <label className="text-sm text-gray-700">
          To
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="mt-1 block rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        </label>
        <label className="text-sm text-gray-700">
          Status
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="mt-1 block rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm">
            <option value="">All</option>
            {Object.entries(SHIFT_STATUS_LABEL).map(([k, l]) => (
              <option key={k} value={k}>{l}</option>
            ))}
          </select>
        </label>
        <div className="md:ml-auto grid grid-cols-3 gap-2 text-sm">
          <div className="rounded-lg border border-gray-200 bg-white px-3 py-2">
            <p className="text-xs text-gray-500">Shifts</p>
            <p className="font-semibold text-gray-900">{shifts.length}</p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white px-3 py-2">
            <p className="text-xs text-gray-500">Taken</p>
            <p className="font-semibold text-gray-900">{naira(sum(taken))}</p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white px-3 py-2">
            <p className="text-xs text-gray-500">Net difference</p>
            <p className={`font-semibold ${sum((s) => s.variance ?? 0) < 0 ? "text-red-700" : "text-gray-900"}`}>
              {varianceLabel(sum((s) => s.variance ?? 0))}
            </p>
          </div>
        </div>
      </div>

      {data?.canReview && awaiting > 0 && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
          {awaiting} shift{awaiting === 1 ? "" : "s"} with a cash difference {awaiting === 1 ? "is" : "are"} waiting for your sign-off.
        </p>
      )}

      {isLoading ? (
        <div className="flex h-32 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
        </div>
      ) : shifts.length === 0 ? (
        <p className="rounded-xl border border-dashed border-gray-300 px-4 py-8 text-center text-sm text-gray-500">No shifts in this period.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {["Cashier", "Opened", "Closed", "Cash", "POS", "Transfer", "Difference", "Status"].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold uppercase text-gray-500 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {shifts.map((s) => (
                <tr key={s.id} onClick={() => setOpenId(s.id)} className="cursor-pointer hover:bg-gray-50">
                  <td className="px-4 py-2.5 font-medium text-gray-900 whitespace-nowrap">
                    {s.cashierName}
                    {s.isMine && <span className="ml-1 text-xs font-normal text-gray-500">(you)</span>}
                  </td>
                  <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">{fmtTime(s.openedAt)}</td>
                  <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">{fmtTime(s.closedAt)}</td>
                  <td className="px-4 py-2.5 whitespace-nowrap">{naira(s.running ? s.running.cash : (s.expectedCash ?? 0) - s.openingFloat)}</td>
                  <td className="px-4 py-2.5 whitespace-nowrap">{naira(s.running ? s.running.pos : s.expectedPos)}</td>
                  <td className="px-4 py-2.5 whitespace-nowrap">{naira(s.running ? s.running.transfer : s.expectedTransfer)}</td>
                  <td className={`px-4 py-2.5 whitespace-nowrap font-medium ${(s.variance ?? 0) < 0 ? "text-red-700" : (s.variance ?? 0) > 0 ? "text-amber-700" : "text-gray-700"}`}>
                    {s.status === "open" ? "—" : varianceLabel(s.variance)}
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ${STATUS_CLS[s.status]}`}>
                      {SHIFT_STATUS_LABEL[s.status]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {openId != null && (
        <ShiftDetailModal key={openId} shiftId={openId} onClose={() => setOpenId(null)} onChanged={() => mutate()} />
      )}
    </div>
  );
}

function ShiftDetailModal({ shiftId, onClose, onChanged }: { shiftId: number; onClose: () => void; onChanged: () => void }) {
  const { data: s, mutate } = useSWR<ShiftDetail>(`/api/cashier-shifts/${shiftId}`, fetcher);
  const [reviewNote, setReviewNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [closing, setClosing] = useState(false);

  const refresh = () => {
    mutate();
    onChanged();
  };

  const review = async () => {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/cashier-shifts/${shiftId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: reviewNote }),
      });
      if (!res.ok) return setError((await res.json()).error || "Failed to sign off");
      refresh();
    } finally {
      setBusy(false);
    }
  };

  const print = () => {
    if (!s) return;
    const rows = s.payments
      .map(
        (p) => `<tr><td>${fmtTime(p.createdAt)}</td><td>${escapeHtml(p.patientName)} ${escapeHtml(p.patientMrn ?? "")}</td>
          <td>${p.channel ? DESK_CHANNELS[p.channel] : ""}</td><td>${escapeHtml(p.posReference ?? "")}</td><td class="n">${p.amount.toLocaleString()}</td></tr>`,
      )
      .join("");
    const line = (l: string, e: number | null, c: number | null) =>
      `<tr><td>${l}</td><td class="n">${(e ?? 0).toLocaleString()}</td><td class="n">${c == null ? "" : c.toLocaleString()}</td><td class="n">${c == null ? "" : (c - (e ?? 0)).toLocaleString()}</td></tr>`;
    const html = `<!doctype html><html><head><title>Cash-up — ${escapeHtml(s.cashierName)}</title>
      <style>body{font-family:system-ui,sans-serif;font-size:12px;margin:24px;color:#111}table{width:100%;border-collapse:collapse;margin-top:12px}
      th,td{border:1px solid #ccc;padding:5px;text-align:left}th{background:#f3f4f6}.n{text-align:right}.sig{margin-top:40px;display:flex;gap:80px}</style></head><body>
      <h2>Cashier shift cash-up</h2>
      <p><b>${escapeHtml(s.cashierName)}</b> · opened ${fmtTime(s.openedAt)} · closed ${fmtTime(s.closedAt)} · float ${s.openingFloat.toLocaleString()} NGN<br/>
      Status: ${SHIFT_STATUS_LABEL[s.status]}${s.closeNote ? ` · Cashier note: ${escapeHtml(s.closeNote)}` : ""}${s.reviewNote ? ` · Sign-off: ${escapeHtml(s.reviewNote)} (${escapeHtml(s.reviewerName ?? "")})` : ""}</p>
      <table><thead><tr><th></th><th class="n">Expected (NGN)</th><th class="n">Counted (NGN)</th><th class="n">Difference</th></tr></thead><tbody>
      ${line("Cash", s.expectedCash ?? s.openingFloat + s.totals.cash, s.countedCash)}${line("POS", s.expectedPos ?? s.totals.pos, s.countedPos)}${line("Transfer", s.expectedTransfer ?? s.totals.transfer, s.countedTransfer)}
      </tbody></table>
      <table><thead><tr><th>Time</th><th>Patient</th><th>Channel</th><th>POS ref</th><th class="n">Amount (NGN)</th></tr></thead><tbody>${rows}</tbody></table>
      <div class="sig"><p>Cashier: ____________________</p><p>Supervisor: ____________________</p></div></body></html>`;
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.print();
  };

  const recon = s
    ? ([
        ["Cash", s.expectedCash ?? s.openingFloat + s.totals.cash, s.countedCash],
        ["POS", s.expectedPos ?? s.totals.pos, s.countedPos],
        ["Transfer", s.expectedTransfer ?? s.totals.transfer, s.countedTransfer],
      ] as const)
    : [];

  return (
    <Modal isOpen onClose={onClose} title={s ? `Shift — ${s.cashierName}` : "Shift"} size="large">
      {!s ? (
        <div className="flex h-32 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
        </div>
      ) : (
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div className="text-sm text-gray-600">
              <p>
                Opened {fmtTime(s.openedAt)} · Closed {fmtTime(s.closedAt)} · Float {naira(s.openingFloat)}
              </p>
              <span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ${STATUS_CLS[s.status]}`}>
                {SHIFT_STATUS_LABEL[s.status]}
              </span>
            </div>
            <div className="flex gap-2">
              {s.status === "open" && (s.isMine || s.canReview) && (
                <button onClick={() => setClosing(true)} className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
                  Close shift
                </button>
              )}
              <button onClick={print} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
                <PrinterIcon className="h-4 w-4" /> Print cash-up
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {["", "Expected", "Counted", "Difference"].map((h) => (
                    <th key={h} className="px-3 py-2 text-left text-xs font-semibold uppercase text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recon.map(([label, expected, counted]) => {
                  const d = counted == null ? null : counted - expected;
                  return (
                    <tr key={label}>
                      <td className="px-3 py-2 font-medium text-gray-900">{label}</td>
                      <td className="px-3 py-2">{naira(expected)}</td>
                      <td className="px-3 py-2">{naira(counted)}</td>
                      <td className={`px-3 py-2 font-medium ${d == null ? "text-gray-400" : d === 0 ? "text-green-700" : "text-red-700"}`}>
                        {varianceLabel(d)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {s.closeNote && (
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm">
              <p className="text-xs font-semibold uppercase text-gray-500">Cashier&apos;s explanation</p>
              <p className="mt-1 text-gray-800">{s.closeNote}</p>
            </div>
          )}
          {s.status === "reviewed" && (
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm">
              <p className="text-xs font-semibold uppercase text-gray-500">
                Signed off by {s.reviewerName} · {fmtTime(s.reviewedAt)}
              </p>
              <p className="mt-1 text-gray-800">{s.reviewNote}</p>
            </div>
          )}
          {s.status === "pending_review" &&
            (s.canReview ? (
              <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                <label className="block text-sm font-medium text-amber-900">
                  Sign off this difference
                  <textarea
                    value={reviewNote}
                    onChange={(e) => setReviewNote(e.target.value)}
                    rows={2}
                    placeholder="What was decided, e.g. shortfall recovered from cashier; POS reversal confirmed"
                    className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-normal focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </label>
                {error && <p className="text-sm text-red-600">{error}</p>}
                <button
                  onClick={review}
                  disabled={busy || !reviewNote.trim()}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {busy ? "Saving…" : "Sign off"}
                </button>
              </div>
            ) : (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
                Waiting for a finance supervisor to sign off the difference{s.isMine ? " — you can't sign off your own shift" : ""}.
              </p>
            ))}

          <div>
            <h3 className="mb-2 text-sm font-semibold text-gray-900">Payments taken ({s.payments.length})</h3>
            {s.payments.length === 0 ? (
              <p className="text-sm text-gray-500">No desk payments in this shift.</p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      {["Time", "Patient", "Channel", "POS ref", "Items", "Amount"].map((h) => (
                        <th key={h} className="px-3 py-2 text-left text-xs font-semibold uppercase text-gray-500 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {s.payments.map((p) => (
                      <tr key={p.id}>
                        <td className="px-3 py-2 whitespace-nowrap text-gray-600">{fmtTime(p.createdAt)}</td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <span className="font-medium text-gray-900">{p.patientName}</span>
                          {p.patientMrn && <span className="block text-xs text-gray-500">{p.patientMrn}</span>}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">{p.channel ? DESK_CHANNELS[p.channel] : "—"}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-gray-600">{p.posReference ?? "—"}</td>
                        <td className="px-3 py-2 text-gray-600">{p.items}</td>
                        <td className="px-3 py-2 whitespace-nowrap font-medium text-gray-900">{naira(p.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {s.status === "open" && (
            <CloseShiftModal
              key={closing ? "c" : "x"}
              isOpen={closing}
              shiftId={s.id}
              openingFloat={s.openingFloat}
              totals={s.totals}
              title={s.isMine ? "Close shift — cash-up" : `Close ${s.cashierName}'s shift`}
              onClose={() => setClosing(false)}
              onClosed={() => {
                setClosing(false);
                refresh();
              }}
            />
          )}
        </div>
      )}
    </Modal>
  );
}

"use client";

import { useState } from "react";
import useSWR, { mutate as globalMutate } from "swr";
import { fetcher } from "@/lib/fetcher";
import Modal from "@/app/components/ui/Modal";
import { useToast } from "@/app/contexts/ToastContext";
import { PlusIcon, PrinterIcon, WalletIcon } from "@heroicons/react/24/outline";
import BillingCell from "../../finance/components/BillingCell";
import SettleBillModal, { type DeskPayment } from "../../finance/components/SettleBillModal";
import { CURRENT_SHIFT_KEY } from "../../finance/components/MyShift";
import { naira, type BillingSummary, type SettleTarget } from "../../finance/components/billing";

interface Line {
  itemType: "request" | "prescription" | "charge";
  itemId: number;
  date: string;
  category: "bed" | "service" | "test" | "drug";
  description: string;
  quantity: number;
  paymentStatus: "not_paid" | "paid" | "waived";
  priced: (BillingSummary & { basePrice: number | null; patientId: number }) | null;
}

interface Bill {
  admission: {
    id: number;
    patientId: number;
    status: string;
    admittedAt: string | null;
    dischargedAt: string | null;
    dischargeBalance: number | null;
    dischargeBalanceNote: string | null;
    patientFirstname: string | null;
    patientLastname: string | null;
    patientMrn: string | null;
  };
  lines: Line[];
  totals: { gross: number; hmo: number; patient: number; paid: number; waived: number; outstanding: number; unpricedLines: number; openLines: number };
  walletBalance: number;
}

interface ServiceItem {
  id: number;
  name: string;
  category: string;
  price: number;
}

const CATEGORY: Record<Line["category"], { label: string; className: string }> = {
  bed: { label: "Bed", className: "bg-indigo-50 text-indigo-700" },
  service: { label: "Service", className: "bg-teal-50 text-teal-700" },
  test: { label: "Test", className: "bg-violet-50 text-violet-700" },
  drug: { label: "Drug", className: "bg-emerald-50 text-emerald-700" },
};

const STATUS: Record<Line["paymentStatus"], { label: string; className: string }> = {
  not_paid: { label: "Unpaid", className: "bg-red-50 text-red-700 border-red-200" },
  paid: { label: "Paid", className: "bg-green-50 text-green-700 border-green-200" },
  waived: { label: "Waived", className: "bg-gray-100 text-gray-600 border-gray-300" },
};

function fmt(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12)).toLocaleDateString("en-GB", { day: "2-digit", month: "short", timeZone: "UTC" });
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

/**
 * The running inpatient bill: bed days (from the ward's daily rate), services
 * added by staff, and the tests and drugs ordered during the stay — each with
 * its HMO / patient split and payment status. Finance can settle lines,
 * waive or void charges, settle everything from the wallet, and print it.
 */
export default function AdmissionBillPanel({ admissionId, canManage = true }: { admissionId: number; canManage?: boolean }) {
  const { showToast } = useToast();
  const key = `/api/admissions/${admissionId}/bill`;
  const { data: bill, isLoading, mutate } = useSWR<Bill>(key, fetcher);
  const { data: services = [] } = useSWR<ServiceItem[]>("/api/service-items?active=1", fetcher);
  const [adding, setAdding] = useState(false);
  const [svcId, setSvcId] = useState("");
  const [qty, setQty] = useState("1");
  const [settleTarget, setSettleTarget] = useState<SettleTarget | null>(null);
  const [busy, setBusy] = useState(false);
  const [walletConfirm, setWalletConfirm] = useState(false);

  const refresh = () => {
    mutate();
    globalMutate("/api/admissions/bills");
  };

  if (isLoading || !bill) return <div className="h-32 rounded-xl bg-gray-50 animate-pulse" />;
  const { totals, lines } = bill;

  const addService = async () => {
    setBusy(true);
    try {
      const res = await fetch(`/api/admissions/${admissionId}/charges`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceItemId: Number(svcId), quantity: qty }),
      });
      const body = await res.json();
      if (!res.ok) return showToast(body.error || "Failed to add", "error");
      setAdding(false);
      setSvcId("");
      setQty("1");
      refresh();
    } finally {
      setBusy(false);
    }
  };

  const settle = async (code: string, payment: DeskPayment) => {
    if (!settleTarget) return;
    setBusy(true);
    try {
      const url =
        settleTarget.itemType === "charge" ? `/api/charges/${settleTarget.itemId}`
        : settleTarget.itemType === "request" ? `/api/requests/${settleTarget.itemId}`
        : `/api/prescriptions/${settleTarget.itemId}`;
      const res = await fetch(url, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ paymentStatus: "paid", authorizationCode: code, ...payment }) });
      const body = await res.json();
      if (!res.ok) return showToast(body.error || "Failed", "error");
      globalMutate(CURRENT_SHIFT_KEY);
      setSettleTarget(null);
      refresh();
    } finally {
      setBusy(false);
    }
  };

  const chargeAction = async (line: Line, action: "waive" | "void") => {
    const reason = prompt(action === "waive" ? "Reason for the waiver, and who approved it:" : "Why remove this charge? (e.g. charged in error)");
    if (!reason?.trim()) return;
    const res = await fetch(`/api/charges/${line.itemId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, reason }) });
    if (!res.ok) showToast((await res.json()).error || "Failed", "error");
    else refresh();
  };

  const payWallet = async () => {
    setBusy(true);
    try {
      const res = await fetch(`/api/admissions/${admissionId}/bill/pay-wallet`, { method: "POST" });
      const body = await res.json();
      if (!res.ok) return showToast(body.error || "Failed", "error");
      showToast(`₦${body.amount.toLocaleString()} taken from wallet — ${body.lines} line(s) settled`, "success");
      setWalletConfirm(false);
      refresh();
    } finally {
      setBusy(false);
    }
  };

  const print = () => {
    const rows = lines
      .map(
        (l) => `<tr><td>${fmt(l.date)}</td><td>${escapeHtml(l.description)}${l.quantity > 1 ? ` × ${l.quantity}` : ""}</td>
          <td class="n">${(l.priced?.price ?? 0).toLocaleString()}</td><td class="n">${(l.priced?.hmoAmount ?? 0).toLocaleString()}</td>
          <td class="n">${(l.priced?.patientAmount ?? 0).toLocaleString()}</td><td>${STATUS[l.paymentStatus].label}</td></tr>`,
      )
      .join("");
    const a = bill.admission;
    const html = `<!doctype html><html><head><title>Bill — ${escapeHtml(`${a.patientFirstname} ${a.patientLastname}`)}</title>
      <style>body{font-family:system-ui,sans-serif;font-size:12px;margin:24px;color:#111}table{width:100%;border-collapse:collapse;margin-top:12px}
      th,td{border:1px solid #ccc;padding:5px;text-align:left}th{background:#f3f4f6}.n{text-align:right}tfoot td{font-weight:600}</style></head><body>
      <h2>Inpatient bill</h2>
      <p><b>${escapeHtml(`${a.patientFirstname} ${a.patientLastname}`)}</b> · ${escapeHtml(a.patientMrn ?? "")}<br/>
      Admitted ${a.admittedAt ? new Date(a.admittedAt).toLocaleString("en-GB") : "—"}${a.dischargedAt ? ` · Discharged ${new Date(a.dischargedAt).toLocaleString("en-GB")}` : ""}</p>
      <table><thead><tr><th>Date</th><th>Item</th><th class="n">Amount (NGN)</th><th class="n">HMO (NGN)</th><th class="n">Patient (NGN)</th><th>Status</th></tr></thead>
      <tbody>${rows}</tbody>
      <tfoot><tr><td colspan="2">Totals</td><td class="n">${totals.gross.toLocaleString()}</td><td class="n">${totals.hmo.toLocaleString()}</td><td class="n">${totals.patient.toLocaleString()}</td><td></td></tr>
      <tr><td colspan="4">Paid by patient</td><td class="n">${totals.paid.toLocaleString()}</td><td></td></tr>
      <tr><td colspan="4">Outstanding</td><td class="n">${totals.outstanding.toLocaleString()}</td><td></td></tr></tfoot></table></body></html>`;
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.print();
  };

  const card = (label: string, value: number, cls = "text-gray-900") => (
    <div className="rounded-xl border border-gray-200 bg-white p-3">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`text-lg font-bold ${cls}`}>{naira(value)}</p>
    </div>
  );

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {card("Total bill", totals.gross)}
        {card("HMO covers", totals.hmo, "text-teal-700")}
        {card("Patient's share", totals.patient)}
        {card("Paid", totals.paid, "text-green-700")}
        {card("Outstanding", totals.outstanding, totals.outstanding > 0 ? "text-red-700" : "text-gray-900")}
      </div>
      {bill.admission.dischargeBalanceNote && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          Discharged with a balance of {naira(bill.admission.dischargeBalance)} — {bill.admission.dischargeBalanceNote}
        </p>
      )}
      {totals.unpricedLines > 0 && (
        <p className="text-xs text-amber-700">{totals.unpricedLines} line(s) have no price yet (e.g. a drug with no brand chosen) and aren&apos;t in the totals.</p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          {canManage && !adding && (
            <button onClick={() => setAdding(true)} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
              <PlusIcon className="h-4 w-4" /> Add service
            </button>
          )}
          <button onClick={print} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
            <PrinterIcon className="h-4 w-4" /> Print bill
          </button>
        </div>
        {canManage && totals.openLines > 0 && (
          <button
            onClick={() => setWalletConfirm(true)}
            disabled={bill.walletBalance < totals.outstanding}
            title={bill.walletBalance < totals.outstanding ? "Wallet balance is too low — top up first" : ""}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            <WalletIcon className="h-4 w-4" /> Settle from wallet ({naira(bill.walletBalance)})
          </button>
        )}
      </div>

      {adding && (
        <div className="flex flex-wrap items-end gap-2 rounded-xl border border-gray-200 bg-gray-50 p-3">
          <label className="text-xs font-medium text-gray-600">
            Service
            <select value={svcId} onChange={(e) => setSvcId(e.target.value)} className="mt-1 block min-w-[240px] rounded-lg border border-gray-300 bg-white px-2 py-2 text-sm">
              <option value="">Select…</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>{s.name} — {naira(s.price)}</option>
              ))}
            </select>
          </label>
          <label className="text-xs font-medium text-gray-600">
            Qty
            <input value={qty} onChange={(e) => setQty(e.target.value)} inputMode="numeric" className="mt-1 block w-20 rounded-lg border border-gray-300 px-2 py-2 text-sm" />
          </label>
          <button onClick={addService} disabled={busy || !svcId} className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50">Add to bill</button>
          <button onClick={() => setAdding(false)} className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700">Cancel</button>
          {services.length === 0 && <p className="w-full text-xs text-gray-500">No services set up yet — add them in Setup → Services.</p>}
        </div>
      )}

      {lines.length === 0 ? (
        <p className="rounded-xl border border-dashed border-gray-300 px-4 py-3 text-sm text-gray-500">
          Nothing on the bill yet. Bed days appear automatically when the ward has a daily rate (Admission → Wards &amp; Beds).
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {["Date", "Item", "Amount", "Status", ""].map((h) => (
                  <th key={h} className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {lines.map((l) => (
                <tr key={`${l.itemType}-${l.itemId}`}>
                  <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500">{fmt(l.date)}</td>
                  <td className="px-3 py-2">
                    <span className={`mr-2 rounded px-1.5 py-0.5 text-[10px] font-semibold ${CATEGORY[l.category].className}`}>{CATEGORY[l.category].label}</span>
                    <span className="text-gray-900">{l.description}</span>
                    {l.quantity > 1 && <span className="text-gray-500"> × {l.quantity}</span>}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <BillingCell basePrice={l.priced?.basePrice ?? null} billing={l.priced} />
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${STATUS[l.paymentStatus].className}`}>{STATUS[l.paymentStatus].label}</span>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-right text-xs">
                    {canManage && l.paymentStatus === "not_paid" && l.priced?.price != null && (
                      <button
                        onClick={() =>
                          setSettleTarget({
                            itemType: l.itemType,
                            itemId: l.itemId,
                            label: l.description,
                            patientId: bill.admission.patientId,
                            patientName: `${bill.admission.patientFirstname ?? ""} ${bill.admission.patientLastname ?? ""}`.trim(),
                            basePrice: l.priced?.basePrice ?? null,
                            billing: l.priced,
                          })
                        }
                        className="font-medium text-blue-600 hover:underline"
                      >
                        Mark paid
                      </button>
                    )}
                    {canManage && l.itemType === "charge" && l.paymentStatus === "not_paid" && (
                      <>
                        <button onClick={() => chargeAction(l, "waive")} className="ml-3 font-medium text-gray-600 hover:underline">Waive</button>
                        <button onClick={() => chargeAction(l, "void")} className="ml-3 font-medium text-red-600 hover:underline">Remove</button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <SettleBillModal
        key={settleTarget ? `${settleTarget.itemType}:${settleTarget.itemId}` : "none"}
        target={settleTarget}
        isSubmitting={busy}
        onClose={() => setSettleTarget(null)}
        onConfirm={settle}
        onEligibilityLogged={() => mutate()}
      />

      <Modal isOpen={walletConfirm} onClose={() => setWalletConfirm(false)} title="Settle bill from wallet">
        <div className="space-y-4">
          <p className="text-sm text-gray-700">
            Take <strong>{naira(totals.outstanding)}</strong> from {bill.admission.patientFirstname}&apos;s wallet (balance {naira(bill.walletBalance)}) to settle {totals.openLines} open line(s)?
            The HMO&apos;s share is recorded for claiming.
          </p>
          <div className="flex justify-end gap-3">
            <button onClick={() => setWalletConfirm(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg">Cancel</button>
            <button onClick={payWallet} disabled={busy} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg disabled:opacity-50">
              {busy ? "Settling..." : "Settle from wallet"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

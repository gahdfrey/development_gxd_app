"use client";

import { useState } from "react";
import useSWR, { mutate as globalMutate } from "swr";
import { fetcher } from "@/lib/fetcher";
import Modal from "@/app/components/ui/Modal";
import AdmissionBillPanel from "../../components/billing/AdmissionBillPanel";
import RecordBillPaymentModal, { type BillPaymentTarget } from "./RecordBillPaymentModal";
import { naira } from "./billing";
import { BanknotesIcon, DocumentTextIcon } from "@heroicons/react/24/outline";

interface BillRow {
  admissionId: number;
  status: string;
  wardName: string | null;
  bedNumber: string | null;
  patientFirstname: string | null;
  patientLastname: string | null;
  patientMrn: string | null;
  admittedAt: string | null;
  dischargedAt: string | null;
  dischargeBalanceNote: string | null;
  totals: { gross: number; hmo: number; patient: number; paid: number; outstanding: number };
  walletBalance: number;
  hmoName: string | null;
}

/** Finance → Inpatient bills: running bills for current admissions and
 * discharged patients who left owing. */
export default function AdmissionBillsTab() {
  const { data: rows = [], isLoading, error, mutate } = useSWR<BillRow[]>("/api/admissions/bills", fetcher);
  const [open, setOpen] = useState<BillRow | null>(null);
  const [paying, setPaying] = useState<BillPaymentTarget | null>(null);
  const payFor = (r: BillRow) =>
    setPaying({
      admissionId: r.admissionId,
      patientName: `${r.patientFirstname ?? ""} ${r.patientLastname ?? ""}`.trim(),
      outstanding: r.totals.outstanding,
      walletBalance: r.walletBalance,
    });
  const current = rows.filter((r) => r.status === "admitted");
  const owing = rows.filter((r) => r.status === "discharged");
  const sum = (f: (r: BillRow) => number) => rows.reduce((s, r) => s + f(r), 0);
  const totalOutstanding = sum((r) => r.totals.outstanding);

  const shortDate = (d: string) => new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
  const daysSince = (from: string, to: string | null) =>
    Math.max(1, Math.ceil(((to ? new Date(to) : new Date()).getTime() - new Date(from).getTime()) / 86_400_000));

  const stat = (label: string, value: string, tone = "text-gray-900") => (
    <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <p className={`mt-1 text-xl font-semibold ${tone}`}>{value}</p>
    </div>
  );

  const table = (list: BillRow[], title: string, empty: string) => (
    <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <header className="flex items-center gap-2 border-b border-gray-200 px-4 py-3 sm:px-5">
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-gray-100 px-1.5 text-[11px] font-semibold text-gray-600">
          {list.length}
        </span>
      </header>
      {list.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-gray-500">{empty}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                {[
                  ["Patient", "text-left"],
                  ["Ward / bed", "text-left"],
                  ["Stay", "text-left"],
                  ["Total", "text-right"],
                  ["HMO covers", "text-right"],
                  ["Paid", "text-right"],
                  ["Outstanding", "text-right"],
                  ["Status", "text-left"],
                  ["", "text-right"],
                ].map(([h, align], i) => (
                  <th key={i} className={`whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 ${align}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {list.map((r) => {
                const settled = r.totals.outstanding <= 0;
                return (
                  <tr key={r.admissionId} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-4 py-3">
                      <p className="font-medium text-gray-900">
                        {r.patientFirstname} {r.patientLastname}
                      </p>
                      <p className="mt-0.5 flex items-center gap-1.5 text-xs text-gray-500">
                        {r.patientMrn}
                        {r.hmoName && (
                          <span className="rounded bg-teal-50 px-1.5 py-0.5 text-[10px] font-semibold text-teal-700">{r.hmoName}</span>
                        )}
                      </p>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-700">
                      {r.wardName ?? "—"}
                      {r.bedNumber && <span className="block text-xs text-gray-500">Bed {r.bedNumber}</span>}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-700">
                      {r.admittedAt ? (
                        <>
                          {shortDate(r.admittedAt)}
                          {r.dischargedAt && ` – ${shortDate(r.dischargedAt)}`}
                          <span className="block text-xs text-gray-500">
                            {daysSince(r.admittedAt, r.dischargedAt)} day{daysSince(r.admittedAt, r.dischargedAt) === 1 ? "" : "s"}
                          </span>
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-gray-900">{naira(r.totals.gross)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-gray-700">{naira(r.totals.hmo)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-gray-700">
                      {naira(r.totals.paid)}
                      {r.walletBalance > 0 && (
                        <span className="block text-xs text-gray-500">Wallet {naira(r.walletBalance)}</span>
                      )}
                    </td>
                    <td className={`whitespace-nowrap px-4 py-3 text-right font-semibold ${settled ? "text-gray-400" : "text-red-700"}`}>
                      {naira(r.totals.outstanding)}
                      {r.dischargeBalanceNote && (
                        <span className="block max-w-[200px] truncate text-xs font-normal text-amber-700" title={r.dischargeBalanceNote}>
                          {r.dischargeBalanceNote}
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                          settled ? "border-green-200 bg-green-50 text-green-700" : "border-red-200 bg-red-50 text-red-700"
                        }`}
                      >
                        {settled ? "Paid in full" : "Owing"}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setOpen(r)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
                        >
                          <DocumentTextIcon className="h-4 w-4 text-gray-500" />
                          View bill
                        </button>
                        {!settled && (
                          <button
                            type="button"
                            onClick={() => payFor(r)}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
                          >
                            <BanknotesIcon className="h-4 w-4" />
                            Record payment
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-12 text-sm text-gray-500">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
        Loading inpatient bills…
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
        <span>Couldn&apos;t load inpatient bills. {error.info?.error ?? ""}</span>
        <button onClick={() => mutate()} className="font-semibold text-red-900 hover:underline">
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stat("Outstanding from patients", naira(totalOutstanding), totalOutstanding > 0 ? "text-red-700" : "text-gray-900")}
        {stat("Collected", naira(sum((r) => r.totals.paid)), "text-green-700")}
        {stat("Billed to HMOs", naira(sum((r) => r.totals.hmo)), "text-teal-700")}
        {stat("Patients admitted", String(current.length))}
      </div>
      {table(current, "Currently admitted", "No patients are on admission right now.")}
      {table(owing, "Discharged with a balance", "No discharged patients owe anything.")}
      <Modal isOpen={open !== null} onClose={() => setOpen(null)} title={`Bill — ${open?.patientFirstname ?? ""} ${open?.patientLastname ?? ""}`} size="large">
        {open && (
          <AdmissionBillPanel
            admissionId={open.admissionId}
            onRecordPayment={(t) => setPaying(t)}
          />
        )}
      </Modal>
      <RecordBillPaymentModal
        key={paying ? paying.admissionId : "none"}
        target={paying}
        onClose={() => setPaying(null)}
        onRecorded={() => {
          mutate();
          if (paying) globalMutate(`/api/admissions/${paying.admissionId}/bill`);
        }}
      />
    </div>
  );
}

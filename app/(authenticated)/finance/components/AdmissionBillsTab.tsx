"use client";

import { useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import Modal from "@/app/components/ui/Modal";
import AdmissionBillPanel from "../../components/billing/AdmissionBillPanel";
import { naira } from "./billing";

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
  const { data: rows = [], isLoading } = useSWR<BillRow[]>("/api/admissions/bills", fetcher);
  const [open, setOpen] = useState<BillRow | null>(null);
  const current = rows.filter((r) => r.status === "admitted");
  const owing = rows.filter((r) => r.status === "discharged");
  const totalOutstanding = rows.reduce((s, r) => s + r.totals.outstanding, 0);

  const table = (list: BillRow[], title: string) => (
    <div className="space-y-2">
      <h3 className="text-sm font-bold text-gray-800">{title} ({list.length})</h3>
      {list.length === 0 ? (
        <p className="text-sm text-gray-500">None.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {["Patient", "Ward / bed", "Since", "Total", "HMO covers", "Paid", "Outstanding", "Wallet"].map((h) => (
                  <th key={h} className="px-4 py-2 text-left text-xs font-semibold uppercase text-gray-500 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {list.map((r) => (
                <tr key={r.admissionId} className="hover:bg-gray-50/60 cursor-pointer" onClick={() => setOpen(r)}>
                  <td className="px-4 py-2 whitespace-nowrap">
                    <span className="font-medium text-blue-700">{r.patientFirstname} {r.patientLastname}</span>
                    <span className="block text-xs text-gray-500">{r.patientMrn}{r.hmoName ? ` · ${r.hmoName}` : ""}</span>
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-gray-700">{r.wardName ?? "—"}{r.bedNumber ? ` · Bed ${r.bedNumber}` : ""}</td>
                  <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-500">
                    {r.admittedAt ? new Date(r.admittedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) : "—"}
                    {r.dischargedAt && ` → ${new Date(r.dischargedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}`}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap">{naira(r.totals.gross)}</td>
                  <td className="px-4 py-2 whitespace-nowrap text-teal-700">{naira(r.totals.hmo)}</td>
                  <td className="px-4 py-2 whitespace-nowrap text-green-700">{naira(r.totals.paid)}</td>
                  <td className={`px-4 py-2 whitespace-nowrap font-semibold ${r.totals.outstanding > 0 ? "text-red-700" : "text-gray-500"}`}>
                    {naira(r.totals.outstanding)}
                    {r.dischargeBalanceNote && <span className="block text-[11px] font-normal text-amber-700">{r.dischargeBalanceNote}</span>}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-gray-600">{naira(r.walletBalance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  if (isLoading) return <div className="h-40 rounded-xl bg-gray-50 animate-pulse" />;

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <p className="text-xs text-gray-500">Owed by patients on inpatient bills</p>
        <p className={`text-2xl font-bold ${totalOutstanding > 0 ? "text-red-700" : "text-gray-900"}`}>{naira(totalOutstanding)}</p>
      </div>
      {table(current, "Currently admitted")}
      {table(owing, "Discharged with a balance")}
      <Modal isOpen={open !== null} onClose={() => setOpen(null)} title={`Bill — ${open?.patientFirstname ?? ""} ${open?.patientLastname ?? ""}`} size="large">
        {open && <AdmissionBillPanel admissionId={open.admissionId} />}
      </Modal>
    </div>
  );
}

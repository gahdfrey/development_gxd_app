"use client";

import { useState, useMemo } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import RequestsTable, { type RequestRow } from "../components/requests/RequestsTable";
import { CheckCircleIcon, LockClosedIcon, MagnifyingGlassIcon, BeakerIcon, CurrencyDollarIcon } from "@heroicons/react/24/outline";

interface PrescriptionRow {
  id: number;
  patientFirstname: string | null;
  patientLastname: string | null;
  patientDob: string | null;
  requestedByFirstname: string | null;
  requestedByLastname: string | null;
  productName: string | null;
  productPrice: number | null;
  dosage: string;
  paymentStatus: string;
  status: string;
  createdAt: string;
}

function formatAge(dob: string): string {
  const today = new Date();
  const birth = new Date(dob);
  let years = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) years--;
  return `${years}y`;
}

const TABS = [
  { key: "lab", label: "Lab Requests", icon: BeakerIcon },
  { key: "prescriptions", label: "Drug Prescriptions", icon: CurrencyDollarIcon },
] as const;
type TabKey = typeof TABS[number]["key"];

export default function FinancePage() {
  const [activeTab, setActiveTab] = useState<TabKey>("lab");

  // ── Lab Requests ──────────────────────────────────────────────────────────
  const { data: requestsData, isLoading: reqLoading, mutate: mutatReqs } = useSWR<RequestRow[]>("/api/requests", fetcher);
  const [updatingReqId, setUpdatingReqId] = useState<number | null>(null);
  const [patientSearch, setPatientSearch] = useState("");
  const [doctorSearch, setDoctorSearch] = useState("");

  const filteredRequests = useMemo(() => {
    const rows = requestsData ?? [];
    const patient = patientSearch.trim().toLowerCase();
    const doctor = doctorSearch.trim().toLowerCase();
    return rows.filter((row) => {
      const patientName = `${row.patientFirstname ?? ""} ${row.patientLastname ?? ""}`.toLowerCase();
      const doctorName = `${row.requestedByFirstname ?? ""} ${row.requestedByLastname ?? ""}`.toLowerCase();
      return (!patient || patientName.includes(patient)) && (!doctor || doctorName.includes(doctor));
    });
  }, [requestsData, patientSearch, doctorSearch]);

  const handleMarkReqPaid = async (id: number) => {
    setUpdatingReqId(id);
    try {
      const res = await fetch(`/api/requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentStatus: "paid" }),
      });
      if (res.ok) mutatReqs();
      else { const body = await res.json(); alert(body.error || "Failed to update payment status"); }
    } catch { alert("Failed to update payment status"); }
    finally { setUpdatingReqId(null); }
  };

  // ── Prescriptions ─────────────────────────────────────────────────────────
  const { data: prescrData, isLoading: prescrLoading, mutate: mutatePrescrip } = useSWR<PrescriptionRow[]>("/api/prescriptions", fetcher);
  const [updatingPrescrId, setUpdatingPrescrId] = useState<number | null>(null);
  const [confirmPrescrId, setConfirmPrescrId] = useState<number | null>(null);
  const [prescrSearch, setPrescrSearch] = useState("");

  const filteredPrescriptions = useMemo(() => {
    const rows = prescrData ?? [];
    const q = prescrSearch.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      `${r.patientFirstname ?? ""} ${r.patientLastname ?? ""}`.toLowerCase().includes(q) ||
      `${r.requestedByFirstname ?? ""} ${r.requestedByLastname ?? ""}`.toLowerCase().includes(q)
    );
  }, [prescrData, prescrSearch]);

  const handleMarkPrescrPaid = async (id: number) => {
    setUpdatingPrescrId(id);
    try {
      const res = await fetch(`/api/prescriptions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentStatus: "paid" }),
      });
      if (res.ok) mutatePrescrip();
      else { const body = await res.json(); alert(body.error || "Failed to update payment status"); }
    } catch { alert("Failed to update payment status"); }
    finally { setUpdatingPrescrId(null); setConfirmPrescrId(null); }
  };

  // Badge counts — unpaid items per tab
  const unpaidLabCount = (requestsData ?? []).filter((r) => r.paymentStatus !== "paid").length;
  const unpaidPrescrCount = (prescrData ?? []).filter((r) => r.paymentStatus !== "paid" && r.status !== "cancelled").length;
  const counts: Record<TabKey, number> = { lab: unpaidLabCount, prescriptions: unpaidPrescrCount };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Finance</h1>
        <p className="text-gray-600 text-sm mt-1">Manage payment status for lab requests and drug prescriptions</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-1 overflow-x-auto scrollbar-none">
          {TABS.map((t) => {
            const Icon = t.icon;
            const count = counts[t.key];
            const isActive = activeTab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                  isActive
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <Icon className="h-4 w-4" />
                {t.label}
                {count > 0 && (
                  <span className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-semibold ${
                    isActive ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* ── Lab Requests Panel ── */}
      {activeTab === "lab" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search by patient name…"
                value={patientSearch}
                onChange={(e) => setPatientSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="relative flex-1">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search by doctor name…"
                value={doctorSearch}
                onChange={(e) => setDoctorSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          {reqLoading ? (
            <div className="flex justify-center items-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : (
            <RequestsTable
              data={filteredRequests}
              showPaymentToggle
              onMarkPaid={handleMarkReqPaid}
              updatingId={updatingReqId}
            />
          )}
        </div>
      )}

      {/* ── Drug Prescriptions Panel ── */}
      {activeTab === "prescriptions" && (
        <div className="space-y-4">
          <div className="relative max-w-sm">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search patient or doctor…"
              value={prescrSearch}
              onChange={(e) => setPrescrSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {prescrLoading ? (
            <div className="flex justify-center items-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : filteredPrescriptions.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
              <p className="text-gray-500 text-sm">No drug prescriptions found.</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      {["Patient", "Age", "Doctor", "Drug", "Dosage", "Price (₦)", "Payment Status", "Actions"].map((h) => (
                        <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredPrescriptions.map((row) => {
                      const isPaid = row.paymentStatus === "paid";
                      const isUpdating = updatingPrescrId === row.id;
                      const isConfirming = confirmPrescrId === row.id;
                      return (
                        <tr key={row.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-5 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">
                            {row.patientFirstname} {row.patientLastname}
                          </td>
                          <td className="px-5 py-4 text-sm text-gray-600 whitespace-nowrap">
                            {row.patientDob ? formatAge(row.patientDob) : "—"}
                          </td>
                          <td className="px-5 py-4 text-sm text-gray-700 whitespace-nowrap">
                            Dr. {row.requestedByFirstname} {row.requestedByLastname}
                          </td>
                          <td className="px-5 py-4 text-sm font-medium text-gray-800 whitespace-nowrap">
                            {row.productName ?? "—"}
                          </td>
                          <td className="px-5 py-4 text-sm text-gray-600 max-w-[160px]">
                            <span className="line-clamp-2">{row.dosage}</span>
                          </td>
                          <td className="px-5 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">
                            {row.productPrice != null ? `₦${row.productPrice.toLocaleString()}` : "—"}
                          </td>
                          <td className="px-5 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                              isPaid
                                ? "bg-green-100 text-green-800 border border-green-300"
                                : "bg-red-100 text-red-800 border border-red-300"
                            }`}>
                              {isPaid ? "Paid" : "Not Paid"}
                            </span>
                          </td>
                          <td className="px-5 py-4 whitespace-nowrap">
                            {isPaid ? (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-green-700 bg-green-50 border border-green-200 rounded-lg cursor-default select-none">
                                <CheckCircleIcon className="h-3.5 w-3.5" />
                                Paid
                                <LockClosedIcon className="h-3 w-3 text-green-400 ml-0.5" />
                              </span>
                            ) : isConfirming ? (
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs text-gray-600 whitespace-nowrap">Confirm?</span>
                                <button
                                  onClick={() => handleMarkPrescrPaid(row.id)}
                                  disabled={isUpdating}
                                  className="px-2.5 py-1 text-xs font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50"
                                >
                                  Yes
                                </button>
                                <button
                                  onClick={() => setConfirmPrescrId(null)}
                                  disabled={isUpdating}
                                  className="px-2.5 py-1 text-xs font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                                >
                                  No
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setConfirmPrescrId(row.id)}
                                disabled={isUpdating}
                                className="px-3 py-1.5 text-xs font-medium text-yellow-800 bg-yellow-50 border border-yellow-300 rounded-lg hover:bg-yellow-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                              >
                                {isUpdating ? "Updating..." : "Mark as Paid"}
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

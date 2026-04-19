"use client";

import { useState, useMemo } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import {
  TruckIcon,
  XCircleIcon,
  CheckCircleIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import RaiseOrderModal from "../inventory/components/RaiseOrderModal";

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
  cancellationReason: string | null;
  createdAt: string;
}

interface Department {
  id: number;
  name: string;
}

function formatAge(dob: string): string {
  const today = new Date();
  const birth = new Date(dob);
  let years = today.getFullYear() - birth.getFullYear();
  const months = today.getMonth() - birth.getMonth();
  if (months < 0 || (months === 0 && today.getDate() < birth.getDate()))
    years--;
  return `${years}y`;
}

function CancelModal({
  prescription,
  onClose,
  onConfirm,
}: {
  prescription: PrescriptionRow;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
}) {
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleConfirm = async () => {
    if (!reason.trim()) {
      setError("Please provide a reason.");
      return;
    }
    setSaving(true);
    try {
      await onConfirm(reason.trim());
    } catch {
      setError("Failed to cancel. Try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="px-6 py-5 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">
            Cancel Prescription
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {prescription.productName} — {prescription.patientFirstname}{" "}
            {prescription.patientLastname}
          </p>
        </div>
        <div className="px-6 py-5 space-y-3">
          {error && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
              {error}
            </p>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Reason for cancellation <span className="text-red-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain why this prescription is being cancelled…"
              rows={3}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
              autoFocus
            />
          </div>
        </div>
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            Go back
          </button>
          <button
            onClick={handleConfirm}
            disabled={saving || !reason.trim()}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Cancelling…" : "Confirm Cancellation"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PharmacyPage() {
  const { data, isLoading, mutate } = useSWR<PrescriptionRow[]>(
    "/api/prescriptions",
    fetcher,
  );
  const { data: departments } = useSWR<Department[]>(
    "/api/departments",
    fetcher,
  );

  const [search, setSearch] = useState("");
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [cancelTarget, setCancelTarget] = useState<PrescriptionRow | null>(
    null,
  );
  const [orderModalOpen, setOrderModalOpen] = useState(false);

  const pharmacyDeptId = useMemo(
    () => departments?.find((d) => d.name.toLowerCase() === "pharmacy")?.id,
    [departments],
  );

  const rows = useMemo(() => {
    const all = data ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return all;
    return all.filter(
      (r) =>
        `${r.patientFirstname ?? ""} ${r.patientLastname ?? ""}`
          .toLowerCase()
          .includes(q) || (r.productName ?? "").toLowerCase().includes(q),
    );
  }, [data, search]);

  const handleDispatch = async (id: number) => {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/prescriptions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "dispatched" }),
      });
      if (res.ok) mutate();
      else {
        const d = await res.json();
        alert(d.error ?? "Failed to dispatch");
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = async (id: number, reason: string) => {
    const res = await fetch(`/api/prescriptions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "cancelled", cancellationReason: reason }),
    });
    if (res.ok) {
      mutate();
      setCancelTarget(null);
    } else {
      const d = await res.json();
      throw new Error(d.error ?? "Failed to cancel");
    }
  };

  const PAYMENT_BADGE: Record<string, string> = {
    paid: "bg-green-100 text-green-800 border-green-300",
    not_paid: "bg-red-100 text-red-800 border-red-300",
  };
  const STATUS_BADGE: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800 border-yellow-300",
    dispatched: "bg-green-100 text-green-800 border-green-300",
    cancelled: "bg-red-100 text-red-800 border-red-300",
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pharmacy</h1>
          <p className="text-gray-500 text-sm mt-1">
            Manage drug prescriptions — dispatch or cancel
          </p>
        </div>
        <button
          onClick={() => setOrderModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
            />
          </svg>
          Order Supply
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
        <input
          type="text"
          placeholder="Search patient or drug…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : rows.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <TruckIcon className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-600">
            No prescriptions found
          </p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden sm:block bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {[
                      "Patient",
                      "Age",
                      "Doctor",
                      "Drug",
                      "Dosage",
                      "Price",
                      "Payment",
                      "Status",
                      "Actions",
                    ].map((h) => (
                      <th
                        key={h}
                        className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rows.map((row) => {
                    const busy = actionLoading === row.id;
                    const isPending = row.status === "pending";
                    const isDispatched = row.status === "dispatched";
                    const isCancelled = row.status === "cancelled";
                    const isPaid = row.paymentStatus === "paid";

                    return (
                      <tr
                        key={row.id}
                        className="hover:bg-gray-50/50 transition-colors"
                      >
                        <td className="px-5 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">
                          {row.patientFirstname} {row.patientLastname}
                        </td>
                        <td className="px-5 py-4 text-sm text-gray-600 whitespace-nowrap">
                          {row.patientDob ? formatAge(row.patientDob) : "—"}
                        </td>
                        <td className="px-5 py-4 text-sm text-gray-600 whitespace-nowrap">
                          Dr. {row.requestedByFirstname}{" "}
                          {row.requestedByLastname}
                        </td>
                        <td className="px-5 py-4 text-sm font-medium text-gray-800 whitespace-nowrap">
                          {row.productName ?? "—"}
                        </td>
                        <td className="px-5 py-4 text-sm text-gray-600 max-w-[180px]">
                          <span className="line-clamp-2">{row.dosage}</span>
                        </td>
                        <td className="px-5 py-4 text-sm text-gray-700 whitespace-nowrap">
                          {row.productPrice != null
                            ? `₦${row.productPrice.toLocaleString()}`
                            : "—"}
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${PAYMENT_BADGE[row.paymentStatus] ?? "bg-gray-100 text-gray-600 border-gray-300"}`}
                          >
                            {row.paymentStatus === "paid" ? "Paid" : "Not Paid"}
                          </span>
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${STATUS_BADGE[row.status] ?? "bg-gray-100 text-gray-600 border-gray-300"}`}
                          >
                            {row.status.charAt(0).toUpperCase() +
                              row.status.slice(1)}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            {isPending && (
                              <>
                                <button
                                  onClick={() => handleDispatch(row.id)}
                                  disabled={busy || !isPaid}
                                  title={
                                    !isPaid
                                      ? "Payment required before dispatch"
                                      : undefined
                                  }
                                  className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                                    isPaid
                                      ? "text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
                                      : "text-green-700 bg-green-50 border border-green-200 opacity-50 cursor-not-allowed"
                                  }`}
                                >
                                  <TruckIcon className="h-3.5 w-3.5" />
                                  {busy ? "…" : "Dispatch"}
                                </button>
                                <button
                                  onClick={() => setCancelTarget(row)}
                                  disabled={busy}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 disabled:opacity-50 transition-colors whitespace-nowrap"
                                >
                                  <XCircleIcon className="h-3.5 w-3.5" />
                                  Cancel
                                </button>
                              </>
                            )}
                            {isDispatched && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg opacity-60 cursor-default">
                                <CheckCircleIcon className="h-3.5 w-3.5" />
                                Dispatched
                              </span>
                            )}
                            {isCancelled && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg opacity-60 cursor-default">
                                <XCircleIcon className="h-3.5 w-3.5" />
                                Cancelled
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile cards */}
          <div className="sm:hidden space-y-3">
            {rows.map((row) => {
              const busy = actionLoading === row.id;
              const isPending = row.status === "pending";
              const isDispatched = row.status === "dispatched";
              const isPaid = row.paymentStatus === "paid";
              return (
                <div
                  key={row.id}
                  className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-bold text-gray-900">
                        {row.patientFirstname} {row.patientLastname}
                      </p>
                      <p className="text-xs text-gray-500">
                        {row.patientDob ? formatAge(row.patientDob) : "—"} ·
                        Dr. {row.requestedByFirstname}{" "}
                        {row.requestedByLastname}
                      </p>
                    </div>
                    <span
                      className={`inline-flex shrink-0 items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${STATUS_BADGE[row.status] ?? "bg-gray-100 text-gray-600 border-gray-300"}`}
                    >
                      {row.status.charAt(0).toUpperCase() + row.status.slice(1)}
                    </span>
                  </div>
                  <div className="px-3 py-2.5 rounded-lg bg-gray-50 border border-gray-100">
                    <p className="text-sm font-medium text-gray-800">
                      {row.productName ?? "—"}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">{row.dosage}</p>
                    {row.productPrice != null && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        ₦{row.productPrice.toLocaleString()}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-gray-100">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${PAYMENT_BADGE[row.paymentStatus] ?? "bg-gray-100 text-gray-600 border-gray-300"}`}
                    >
                      {row.paymentStatus === "paid" ? "Paid" : "Not Paid"}
                    </span>
                    {isPending && (
                      <>
                        <button
                          onClick={() => handleDispatch(row.id)}
                          disabled={busy || !isPaid}
                          className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ml-auto ${isPaid ? "text-white bg-green-600 hover:bg-green-700 disabled:opacity-50" : "text-green-700 bg-green-50 border border-green-200 opacity-50 cursor-not-allowed"}`}
                        >
                          <TruckIcon className="h-3.5 w-3.5" />
                          {busy ? "…" : "Dispatch"}
                        </button>
                        <button
                          onClick={() => setCancelTarget(row)}
                          disabled={busy}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 disabled:opacity-50 transition-colors"
                        >
                          <XCircleIcon className="h-3.5 w-3.5" />
                          Cancel
                        </button>
                      </>
                    )}
                    {isDispatched && (
                      <span className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg opacity-60 ml-auto">
                        <CheckCircleIcon className="h-3.5 w-3.5" />
                        Dispatched
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {cancelTarget && (
        <CancelModal
          prescription={cancelTarget}
          onClose={() => setCancelTarget(null)}
          onConfirm={(reason) => handleCancel(cancelTarget.id, reason)}
        />
      )}

      <RaiseOrderModal
        open={orderModalOpen}
        departmentId={pharmacyDeptId}
        onClose={() => setOrderModalOpen(false)}
        onSuccess={() => setOrderModalOpen(false)}
      />
    </div>
  );
}

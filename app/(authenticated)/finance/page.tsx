"use client";

import { useState, useMemo } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import RequestsTable, { type RequestRow } from "../components/requests/RequestsTable";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";

export default function FinancePage() {
  const { data, isLoading, mutate } = useSWR<RequestRow[]>(
    "/api/requests",
    fetcher,
  );
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [patientSearch, setPatientSearch] = useState("");
  const [doctorSearch, setDoctorSearch] = useState("");

  const filtered = useMemo(() => {
    const rows = data ?? [];
    const patient = patientSearch.trim().toLowerCase();
    const doctor = doctorSearch.trim().toLowerCase();
    return rows.filter((row) => {
      const patientName = `${row.patientFirstname ?? ""} ${row.patientLastname ?? ""}`.toLowerCase();
      const doctorName = `${row.requestedByFirstname ?? ""} ${row.requestedByLastname ?? ""}`.toLowerCase();
      return (
        (!patient || patientName.includes(patient)) &&
        (!doctor || doctorName.includes(doctor))
      );
    });
  }, [data, patientSearch, doctorSearch]);

  const handleMarkPaid = async (id: number) => {
    setUpdatingId(id);
    try {
      const res = await fetch(`/api/requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentStatus: "paid" }),
      });

      if (res.ok) {
        mutate();
      } else {
        const body = await res.json();
        alert(body.error || "Failed to update payment status");
      }
    } catch {
      alert("Failed to update payment status");
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Finance</h1>
        <p className="text-gray-600 text-sm mt-1">
          All lab requests — manage payment status
        </p>
      </div>

      {/* Search filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
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

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : (
        <RequestsTable
          data={filtered}
          showPaymentToggle
          onMarkPaid={handleMarkPaid}
          updatingId={updatingId}
        />
      )}
    </div>
  );
}

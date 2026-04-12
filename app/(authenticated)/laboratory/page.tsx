"use client";

import { useState, useMemo } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import RequestsTable, { type RequestRow } from "../components/requests/RequestsTable";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import RaiseOrderModal from "../inventory/components/RaiseOrderModal";

interface Department {
  id: number;
  name: string;
}

export default function LaboratoryPage() {
  const { data, isLoading, mutate } = useSWR<RequestRow[]>(
    "/api/requests?department=laboratory",
    fetcher,
  );
  const { data: departments } = useSWR<Department[]>("/api/departments", fetcher);

  const [patientSearch, setPatientSearch] = useState("");
  const [doctorSearch, setDoctorSearch] = useState("");
  const [orderModalOpen, setOrderModalOpen] = useState(false);

  const labDeptId = useMemo(
    () => departments?.find((d) => d.name.toLowerCase() === "laboratory")?.id,
    [departments],
  );

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

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Laboratory</h1>
          <p className="text-gray-600 text-sm mt-1">
            All requests assigned to the laboratory department
          </p>
        </div>
        <button
          onClick={() => setOrderModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
          Raise Order
        </button>
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
          showUploadResult
          onUploadSuccess={() => mutate()}
        />
      )}

      <RaiseOrderModal
        open={orderModalOpen}
        departmentId={labDeptId}
        onClose={() => setOrderModalOpen(false)}
        onSuccess={() => {}}
      />
    </div>
  );
}

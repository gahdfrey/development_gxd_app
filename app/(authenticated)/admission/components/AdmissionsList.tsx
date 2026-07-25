"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { createColumnHelper } from "@tanstack/react-table";
import { PlusIcon, ArrowsRightLeftIcon, EyeIcon, ArrowRightOnRectangleIcon } from "@heroicons/react/24/outline";
import Table from "@/app/components/ui/Table";
import AdmitPatientModal from "./AdmitPatientModal";
import TransferPatientModal from "./TransferPatientModal";
import DischargePatientModal from "./DischargePatientModal";
import AdmissionDetailsDrawer from "./AdmissionDetailsDrawer";
import type { AdmissionRecord } from "./types";

const STATUS_FILTERS = [
  { key: "admitted", label: "Currently Admitted" },
  { key: "discharged", label: "Discharged" },
  { key: "", label: "All" },
];

const STATUS_BADGE: Record<string, string> = {
  admitted: "bg-green-100 text-green-700",
  discharged: "bg-gray-100 text-gray-700",
};

const TYPE_BADGE: Record<string, string> = {
  emergency: "bg-red-100 text-red-700",
  elective: "bg-blue-100 text-blue-700",
  "transfer-in": "bg-purple-100 text-purple-700",
};

export default function AdmissionsList() {
  const [statusFilter, setStatusFilter] = useState("admitted");
  const [isAdmitModalOpen, setIsAdmitModalOpen] = useState(false);
  const [transferring, setTransferring] = useState<AdmissionRecord | null>(null);
  const [discharging, setDischarging] = useState<AdmissionRecord | null>(null);
  const [viewingId, setViewingId] = useState<number | null>(null);

  const query = statusFilter ? `/api/admissions?status=${statusFilter}` : "/api/admissions";
  const { data: admissions, error, mutate } = useSWR<AdmissionRecord[]>(query, fetcher);

  const columnHelper = createColumnHelper<AdmissionRecord>();

  const columns = useMemo(
    () => [
      columnHelper.display({
        id: "patient",
        header: "Patient",
        cell: (props) => {
          const p = props.row.original.patient;
          return p ? (
            <div>
              <Link
                href={`/patients/${p.id}/history`}
                className="font-semibold text-blue-600 hover:text-blue-800 hover:underline"
              >
                {p.firstname} {p.lastname}
              </Link>
              {p.mrn && <span className="block text-xs text-gray-500">{p.mrn}</span>}
            </div>
          ) : "—";
        },
      }),
      columnHelper.display({
        id: "location",
        header: "Ward / Bed",
        cell: (props) => {
          const { ward, bed } = props.row.original;
          return ward && bed ? `${ward.name} — Bed ${bed.bedNumber}` : "—";
        },
      }),
      columnHelper.display({
        id: "doctor",
        header: "Admitting Doctor",
        cell: (props) => {
          const d = props.row.original.doctor;
          return d ? `Dr. ${d.firstname} ${d.lastname}` : "—";
        },
      }),
      columnHelper.accessor("admissionType", {
        header: "Type",
        cell: (info) => (
          <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${TYPE_BADGE[info.getValue()] || "bg-gray-100 text-gray-700"}`}>
            {info.getValue()}
          </span>
        ),
      }),
      columnHelper.accessor("status", {
        header: "Status",
        cell: (info) => (
          <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${STATUS_BADGE[info.getValue()] || "bg-gray-100 text-gray-700"}`}>
            {info.getValue()}
          </span>
        ),
      }),
      columnHelper.accessor("admittedAt", {
        header: "Admitted",
        cell: (info) => (
          <span className="text-gray-500 text-sm">
            {new Date(info.getValue()).toLocaleString()}
          </span>
        ),
      }),
      columnHelper.display({
        id: "actions",
        header: "Actions",
        cell: (props) => {
          const admission = props.row.original;
          const isAdmitted = admission.status === "admitted";
          return (
            <div className="flex gap-2">
              <button
                onClick={() => setViewingId(admission.id)}
                className="p-1 text-blue-600 hover:text-blue-800 transition-colors"
                title="View details"
              >
                <EyeIcon className="w-5 h-5" />
              </button>
              {isAdmitted && (
                <>
                  <button
                    onClick={() => setTransferring(admission)}
                    className="p-1 text-indigo-600 hover:text-indigo-800 transition-colors"
                    title="Transfer"
                  >
                    <ArrowsRightLeftIcon className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setDischarging(admission)}
                    className="p-1 text-orange-600 hover:text-orange-800 transition-colors"
                    title="Discharge"
                  >
                    <ArrowRightOnRectangleIcon className="w-5 h-5" />
                  </button>
                </>
              )}
            </div>
          );
        },
      }),
    ],
    [],
  );

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
        Failed to load admissions. Please try again.
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-2">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setStatusFilter(f.key)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === f.key
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => setIsAdmitModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
        >
          <PlusIcon className="w-5 h-5" />
          Admit Patient
        </button>
      </div>

      {!admissions ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : admissions.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <p className="text-gray-500 mb-4">No admissions found for this filter.</p>
          <button
            onClick={() => setIsAdmitModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <PlusIcon className="w-5 h-5" />
            Admit Patient
          </button>
        </div>
      ) : (
        <Table data={admissions} columns={columns} />
      )}

      <AdmitPatientModal
        isOpen={isAdmitModalOpen}
        onClose={() => setIsAdmitModalOpen(false)}
        onSuccess={() => mutate()}
      />

      <TransferPatientModal
        admission={transferring}
        isOpen={!!transferring}
        onClose={() => setTransferring(null)}
        onSuccess={() => mutate()}
      />

      <DischargePatientModal
        admission={discharging}
        isOpen={!!discharging}
        onClose={() => setDischarging(null)}
        onSuccess={() => mutate()}
      />

      <AdmissionDetailsDrawer
        admissionId={viewingId}
        isOpen={viewingId !== null}
        onClose={() => setViewingId(null)}
      />
    </>
  );
}

"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { createColumnHelper } from "@tanstack/react-table";
import { PlusIcon, ArrowsRightLeftIcon, EyeIcon, ArrowRightOnRectangleIcon } from "@heroicons/react/24/outline";
import Table from "@/app/components/ui/Table";
import SeverityBadge from "@/app/components/ui/SeverityBadge";
import AdmitPatientModal from "./AdmitPatientModal";
import TransferPatientModal from "./TransferPatientModal";
import DischargePatientModal from "./DischargePatientModal";
import AdmissionDetailsDrawer from "./AdmissionDetailsDrawer";
import { BAND_STYLE } from "../../components/clinical/ObservationsPanel";
import type { Band } from "@/lib/clinical/ews";

interface WardObs {
  admissionId: number;
  score: number | null;
  band: Band | null;
  nextDueAt: string | null;
  recordedAt: string | null;
  overdue: boolean;
}
import { refreshAdmissions } from "./refresh";
import type { AdmissionRecord } from "./types";

const STATUS_FILTERS = [
  { key: "admitted", label: "Currently Admitted" },
  { key: "discharged", label: "Discharged" },
  { key: "declined", label: "Declined" },
  { key: "", label: "All" },
];

const STATUS_BADGE: Record<string, string> = {
  requested: "bg-amber-100 text-amber-700",
  admitted: "bg-green-100 text-green-700",
  discharged: "bg-gray-100 text-gray-700",
  declined: "bg-red-100 text-red-700",
};

const TYPE_BADGE: Record<string, string> = {
  emergency: "bg-red-100 text-red-700",
  elective: "bg-blue-100 text-blue-700",
  "transfer-in": "bg-purple-100 text-purple-700",
};

const columnHelper = createColumnHelper<AdmissionRecord>();

export default function AdmissionsList() {
  const [statusFilter, setStatusFilter] = useState("admitted");
  const [isAdmitModalOpen, setIsAdmitModalOpen] = useState(false);
  const [transferring, setTransferring] = useState<AdmissionRecord | null>(null);
  const [discharging, setDischarging] = useState<AdmissionRecord | null>(null);
  const [viewingId, setViewingId] = useState<number | null>(null);

  const query = statusFilter ? `/api/admissions?status=${statusFilter}` : "/api/admissions";
  const { data: admissions, error } = useSWR<AdmissionRecord[]>(query, fetcher);
  // Latest early-warning score per current admission (refreshed every 2 min).
  const { data: wardObs } = useSWR<WardObs[]>("/api/vitals/ward", fetcher, { refreshInterval: 120_000 });
  const obsByAdmission = useMemo(() => new Map((wardObs ?? []).map((o) => [o.admissionId, o])), [wardObs]);
  // Doses due now / overdue per current admission (medication chart).
  const { data: wardMeds } = useSWR<{ admissionId: number; dueNow: number; overdue: number }[]>("/api/emar/ward", fetcher, { refreshInterval: 120_000 });
  const medsByAdmission = useMemo(() => new Map((wardMeds ?? []).map((m) => [m.admissionId, m])), [wardMeds]);


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
      columnHelper.display({
        id: "obs",
        header: "Obs / score",
        cell: (props) => {
          const row = props.row.original;
          if (row.status !== "admitted") return <span className="text-gray-300">—</span>;
          const o = obsByAdmission.get(row.id);
          if (!o || o.score == null || !o.band) {
            return <span className="text-xs font-semibold text-red-700">No obs yet</span>;
          }
          return (
            <div className="whitespace-nowrap">
              <span className={`inline-flex rounded-md border px-2 py-0.5 text-xs font-bold ${BAND_STYLE[o.band]}`}>{o.score}</span>
              <span className={`block text-[11px] ${o.overdue ? "font-bold text-red-700" : "text-gray-500"}`}>
                {o.overdue ? "Obs overdue" : o.nextDueAt ? `Next ${new Date(o.nextDueAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}` : ""}
              </span>
            </div>
          );
        },
      }),
      columnHelper.display({
        id: "meds",
        header: "Meds",
        cell: (props) => {
          const row = props.row.original;
          if (row.status !== "admitted") return <span className="text-gray-300">—</span>;
          const m = medsByAdmission.get(row.id);
          if (!m || (m.dueNow === 0 && m.overdue === 0)) return <span className="text-xs text-gray-400">Nothing due</span>;
          return (
            <div className="space-y-0.5 whitespace-nowrap text-xs">
              {m.overdue > 0 && <span className="block font-bold text-red-700">{m.overdue} overdue</span>}
              {m.dueNow > 0 && <span className="block font-semibold text-blue-700">{m.dueNow} due now</span>}
            </div>
          );
        },
      }),
      columnHelper.accessor("severity", {
        header: "Severity",
        cell: (info) => <SeverityBadge severity={info.getValue()} />,
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
        cell: (info) => {
          // Requested and declined rows never got a bed, so there's no
          // admission time to show — fall back to when it was raised.
          const admittedAt = info.getValue();
          const { requestedAt } = info.row.original;
          if (admittedAt) {
            return (
              <span className="text-gray-500 text-sm">
                {new Date(admittedAt).toLocaleString()}
              </span>
            );
          }
          return (
            <span className="text-gray-400 text-sm">
              {requestedAt ? `Requested ${new Date(requestedAt).toLocaleDateString()}` : "—"}
            </span>
          );
        },
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
    [obsByAdmission, medsByAdmission],
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
        onSuccess={() => refreshAdmissions()}
      />

      <TransferPatientModal
        admission={transferring}
        isOpen={!!transferring}
        onClose={() => setTransferring(null)}
        onSuccess={() => refreshAdmissions()}
      />

      <DischargePatientModal
        admission={discharging}
        isOpen={!!discharging}
        onClose={() => setDischarging(null)}
        onSuccess={() => refreshAdmissions()}
      />

      <AdmissionDetailsDrawer
        admissionId={viewingId}
        isOpen={viewingId !== null}
        onClose={() => setViewingId(null)}
      />
    </>
  );
}

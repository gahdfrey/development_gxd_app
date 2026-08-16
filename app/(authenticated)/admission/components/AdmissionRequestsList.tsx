"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { refreshAdmissions } from "./refresh";
import { createColumnHelper } from "@tanstack/react-table";
import { CheckIcon, XMarkIcon, EyeIcon } from "@heroicons/react/24/outline";
import Table from "@/app/components/ui/Table";
import SeverityBadge from "@/app/components/ui/SeverityBadge";
import AdmitFromRequestModal from "./AdmitFromRequestModal";
import DeclineRequestModal from "./DeclineRequestModal";
import AdmissionDetailsDrawer from "./AdmissionDetailsDrawer";
import { ADMISSION_SEVERITIES } from "@/lib/constants";
import type { AdmissionRecord } from "./types";

export const REQUESTS_KEY = "/api/admissions?status=requested";

const SEVERITY_RANK: Record<string, number> = Object.fromEntries(
  ADMISSION_SEVERITIES.map((s) => [s.key, s.rank]),
);

const TYPE_BADGE: Record<string, string> = {
  emergency: "bg-red-100 text-red-700",
  elective: "bg-blue-100 text-blue-700",
  "transfer-in": "bg-purple-100 text-purple-700",
};

/** "3h ago" / "2d ago" — how long a patient has been waiting for a bed. */
function waitingFor(since: string | null): string {
  if (!since) return "—";
  const minutes = Math.floor((Date.now() - new Date(since).getTime()) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

/**
 * The queue of admissions doctors have requested but that have no bed yet.
 * Most urgent first, then longest waiting.
 */
export default function AdmissionRequestsList() {
  const [admitting, setAdmitting] = useState<AdmissionRecord | null>(null);
  const [declining, setDeclining] = useState<AdmissionRecord | null>(null);
  const [viewingId, setViewingId] = useState<number | null>(null);

  const { data: requests, error } = useSWR<AdmissionRecord[]>(REQUESTS_KEY, fetcher);

  const sorted = useMemo(() => {
    if (!requests) return [];
    return [...requests].sort((a, b) => {
      const bySeverity = (SEVERITY_RANK[b.severity] ?? 0) - (SEVERITY_RANK[a.severity] ?? 0);
      if (bySeverity !== 0) return bySeverity;
      // Same urgency — whoever has been waiting longest goes first.
      return (
        new Date(a.requestedAt ?? a.createdAt).getTime() -
        new Date(b.requestedAt ?? b.createdAt).getTime()
      );
    });
  }, [requests]);

  const columnHelper = createColumnHelper<AdmissionRecord>();

  const columns = useMemo(
    () => [
      columnHelper.accessor("severity", {
        header: "Severity",
        cell: (info) => <SeverityBadge severity={info.getValue()} />,
      }),
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
        id: "requestedBy",
        header: "Requested By",
        cell: (props) => {
          const d = props.row.original.requestedBy ?? props.row.original.doctor;
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
      columnHelper.accessor("admissionReason", {
        header: "Notes",
        cell: (info) => (
          <p className="text-sm text-gray-600 max-w-md whitespace-pre-wrap line-clamp-3">
            {info.getValue()}
          </p>
        ),
      }),
      columnHelper.accessor("requestedAt", {
        header: "Waiting",
        cell: (info) => (
          <span className="text-gray-500 text-sm whitespace-nowrap">
            {waitingFor(info.getValue())}
          </span>
        ),
      }),
      columnHelper.display({
        id: "actions",
        header: "Actions",
        cell: (props) => {
          const request = props.row.original;
          return (
            <div className="flex gap-2">
              <button
                onClick={() => setViewingId(request.id)}
                className="p-1 text-blue-600 hover:text-blue-800 transition-colors"
                title="View details"
              >
                <EyeIcon className="w-5 h-5" />
              </button>
              <button
                onClick={() => setAdmitting(request)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-green-600 text-white text-xs font-medium hover:bg-green-700 transition-colors"
                title="Assign a ward and bed"
              >
                <CheckIcon className="w-4 h-4" />
                Admit
              </button>
              <button
                onClick={() => setDeclining(request)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-gray-300 text-gray-700 text-xs font-medium hover:bg-gray-50 transition-colors"
                title="Decline this request"
              >
                <XMarkIcon className="w-4 h-4" />
                Decline
              </button>
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
        Failed to load admission requests. Please try again.
      </div>
    );
  }

  return (
    <>
      {!requests ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : sorted.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <p className="text-gray-500">
            No admission requests waiting. Requests raised by doctors after a
            consultation show up here.
          </p>
        </div>
      ) : (
        <Table data={sorted} columns={columns} />
      )}

      <AdmitFromRequestModal
        request={admitting}
        isOpen={!!admitting}
        onClose={() => setAdmitting(null)}
        onSuccess={() => refreshAdmissions()}
      />

      <DeclineRequestModal
        request={declining}
        isOpen={!!declining}
        onClose={() => setDeclining(null)}
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

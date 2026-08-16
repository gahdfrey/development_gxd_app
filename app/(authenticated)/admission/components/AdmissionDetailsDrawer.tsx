"use client";

import Link from "next/link";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import Modal from "@/app/components/ui/Modal";
import SeverityBadge from "@/app/components/ui/SeverityBadge";
import type { AdmissionDetail } from "./types";

interface AdmissionDetailsDrawerProps {
  admissionId: number | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function AdmissionDetailsDrawer({ admissionId, isOpen, onClose }: AdmissionDetailsDrawerProps) {
  const { data: admission, isLoading } = useSWR<AdmissionDetail>(
    isOpen && admissionId ? `/api/admissions/${admissionId}` : null,
    fetcher,
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Admission Details" size="large">
      {isLoading || !admission ? (
        <div className="flex justify-center items-center h-40">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="block text-gray-500">Patient</span>
              {admission.patient ? (
                <Link
                  href={`/patients/${admission.patient.id}/history`}
                  className="font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                >
                  {admission.patient.firstname} {admission.patient.lastname}
                </Link>
              ) : (
                <span className="font-semibold">—</span>
              )}
              {admission.patient?.mrn && <span className="block text-gray-500">{admission.patient.mrn}</span>}
            </div>
            <div>
              <span className="block text-gray-500">Admitting Doctor</span>
              <span className="font-semibold">
                {admission.doctor ? `Dr. ${admission.doctor.firstname} ${admission.doctor.lastname}` : "—"}
              </span>
            </div>
            {admission.requestedBy && (
              <div>
                <span className="block text-gray-500">Requested By</span>
                <span className="font-semibold">
                  Dr. {admission.requestedBy.firstname} {admission.requestedBy.lastname}
                </span>
                {admission.requestedAt && (
                  <span className="block text-gray-500 text-xs">
                    {new Date(admission.requestedAt).toLocaleString()}
                  </span>
                )}
              </div>
            )}
            <div>
              <span className="block text-gray-500">Severity</span>
              <SeverityBadge severity={admission.severity} />
            </div>
            <div>
              <span className="block text-gray-500">Current Location</span>
              <span className="font-semibold">
                {admission.ward && admission.bed ? `${admission.ward.name} — Bed ${admission.bed.bedNumber}` : "—"}
              </span>
            </div>
            <div>
              <span className="block text-gray-500">Type</span>
              <span className="font-semibold capitalize">{admission.admissionType}</span>
            </div>
            <div>
              <span className="block text-gray-500">Status</span>
              <span className="font-semibold capitalize">{admission.status}</span>
            </div>
            {admission.admittedAt && (
              <div>
                <span className="block text-gray-500">Admitted At</span>
                <span className="font-semibold">{new Date(admission.admittedAt).toLocaleString()}</span>
              </div>
            )}
            {admission.dischargedAt && (
              <div>
                <span className="block text-gray-500">Discharged At</span>
                <span className="font-semibold">{new Date(admission.dischargedAt).toLocaleString()}</span>
              </div>
            )}
          </div>

          <div>
            <span className="block text-gray-500 text-sm mb-1">
              {admission.requestedBy ? "Reason / clinical notes" : "Admission Reason"}
            </span>
            <p className="text-gray-800 text-sm bg-gray-50 rounded-lg p-3 whitespace-pre-wrap">
              {admission.admissionReason}
            </p>
          </div>

          {admission.declineReason && (
            <div>
              <span className="block text-gray-500 text-sm mb-1">
                Declined{admission.declinedAt && ` on ${new Date(admission.declinedAt).toLocaleString()}`}
              </span>
              <p className="text-gray-800 text-sm bg-red-50 border border-red-100 rounded-lg p-3 whitespace-pre-wrap">
                {admission.declineReason}
              </p>
            </div>
          )}

          {admission.dischargeSummary && (
            <div>
              <span className="block text-gray-500 text-sm mb-1">Discharge Summary</span>
              <p className="text-gray-800 text-sm bg-gray-50 rounded-lg p-3">{admission.dischargeSummary}</p>
            </div>
          )}

          <div>
            <span className="block text-gray-500 text-sm mb-2">Transfer History</span>
            {admission.transfers.length === 0 ? (
              <p className="text-gray-400 text-sm">No transfers recorded for this admission.</p>
            ) : (
              <ul className="space-y-2">
                {admission.transfers.map((t) => (
                  <li key={t.id} className="text-sm bg-gray-50 rounded-lg p-3">
                    <div className="font-medium text-gray-800">
                      {t.fromWardName ? `${t.fromWardName} — Bed ${t.fromBedNumber}` : "—"}
                      {" → "}
                      {t.toWardName} — Bed {t.toBedNumber}
                    </div>
                    <div className="text-gray-500 text-xs mt-1">
                      {new Date(t.transferredAt).toLocaleString()}
                      {t.transferredByFirstname && ` · by ${t.transferredByFirstname} ${t.transferredByLastname}`}
                    </div>
                    {t.reason && <div className="text-gray-600 text-xs mt-1">Reason: {t.reason}</div>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}

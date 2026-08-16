"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import Modal from "@/app/components/ui/Modal";
import SeverityBadge from "@/app/components/ui/SeverityBadge";
import type { AdmissionRecord, Ward, Bed } from "./types";

interface AdmitFromRequestModalProps {
  request: AdmissionRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface Doctor {
  id: number;
  firstname: string;
  lastname: string;
}

/**
 * The desk's response to a doctor's admission request: pick the ward and bed
 * the patient is going into. Everything clinical was decided by the requesting
 * doctor and is shown read-only for context.
 */
export default function AdmitFromRequestModal({
  request,
  isOpen,
  onClose,
  onSuccess,
}: AdmitFromRequestModalProps) {
  const { data: wards = [] } = useSWR<Ward[]>(isOpen ? "/api/wards" : null, fetcher);
  const { data: doctors = [] } = useSWR<Doctor[]>(isOpen ? "/api/doctors" : null, fetcher);

  const [wardId, setWardId] = useState("");
  const [bedId, setBedId] = useState("");
  const [doctorId, setDoctorId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const { data: availableBeds, isLoading: bedsLoading } = useSWR<Bed[]>(
    wardId ? `/api/beds?wardId=${wardId}&status=available` : null,
    fetcher,
  );
  const bedOptions = availableBeds ?? [];

  useEffect(() => {
    if (isOpen) {
      setWardId("");
      setBedId("");
      // Defaults to the doctor who raised the request; the desk can hand the
      // patient to a ward consultant instead.
      setDoctorId(request?.doctor ? String(request.doctor.id) : "");
      setErrorMessage("");
    }
  }, [isOpen, request]);

  useEffect(() => {
    setBedId("");
  }, [wardId]);

  const handleClose = () => {
    if (!isSubmitting) onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!request) return;
    if (!wardId || !bedId) {
      setErrorMessage("Please choose a ward and a bed.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const res = await fetch(`/api/admissions/${request.id}/admit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wardId, bedId, admittingDoctorId: doctorId || undefined }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || "Failed to admit patient");
        return;
      }

      onSuccess();
      handleClose();
    } catch {
      setErrorMessage("Failed to admit patient");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!request) return null;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Admit Patient from Request">
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMessage && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
            {errorMessage}
          </div>
        )}

        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3 text-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className="block text-xs text-gray-500">Patient</span>
              <span className="font-semibold text-gray-900">
                {request.patient?.firstname} {request.patient?.lastname}
              </span>
              {request.patient?.mrn && (
                <span className="block text-xs text-gray-500">{request.patient.mrn}</span>
              )}
            </div>
            <SeverityBadge severity={request.severity} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="block text-xs text-gray-500">Requested by</span>
              <span className="text-gray-900">
                {request.requestedBy
                  ? `Dr. ${request.requestedBy.firstname} ${request.requestedBy.lastname}`
                  : "—"}
              </span>
            </div>
            <div>
              <span className="block text-xs text-gray-500">Type</span>
              <span className="text-gray-900 capitalize">{request.admissionType}</span>
            </div>
          </div>

          <div>
            <span className="block text-xs text-gray-500">Reason / clinical notes</span>
            <p className="text-gray-800 whitespace-pre-wrap">{request.admissionReason}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ward *</label>
            <select
              value={wardId}
              onChange={(e) => setWardId(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select ward</option>
              {wards.map((w) => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bed *</label>
            <select
              value={bedId}
              onChange={(e) => setBedId(e.target.value)}
              required
              disabled={!wardId || bedsLoading}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">
                {!wardId
                  ? "Select a ward first"
                  : bedsLoading
                    ? "Loading beds..."
                    : bedOptions.length
                      ? "Select bed"
                      : "No available beds"}
              </option>
              {bedOptions.map((b) => (
                <option key={b.id} value={b.id}>Bed {b.bedNumber}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Admitting Doctor</label>
          <select
            value={doctorId}
            onChange={(e) => setDoctorId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Keep the requesting doctor</option>
            {doctors.map((d) => (
              <option key={d.id} value={d.id}>Dr. {d.firstname} {d.lastname}</option>
            ))}
          </select>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Admitting..." : "Admit Patient"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

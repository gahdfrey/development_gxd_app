"use client";

import { useEffect, useState } from "react";
import Modal from "@/app/components/ui/Modal";
import { ADMISSION_SEVERITIES } from "@/lib/constants";

interface PrefilledPatient {
  id: number;
  firstname: string;
  lastname: string;
  gender: string;
  dob: string;
}

interface RequestAdmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointmentId: number;
  patient: PrefilledPatient;
  onSuccess?: () => void;
}

const ADMISSION_TYPES = [
  { value: "elective", label: "Elective" },
  { value: "emergency", label: "Emergency" },
];

// What each level means in practice, so the choice is consistent between
// doctors rather than a matter of personal wording.
const SEVERITY_HINTS: Record<string, string> = {
  routine: "Can wait for the next available bed",
  high: "Should be admitted today",
  urgent: "Needs a bed within hours",
  critical: "Life-threatening — needs a bed now",
};

export default function RequestAdmissionModal({
  isOpen,
  onClose,
  appointmentId,
  patient,
  onSuccess,
}: RequestAdmissionModalProps) {
  const [severity, setSeverity] = useState("routine");
  const [admissionType, setAdmissionType] = useState("elective");
  const [admissionReason, setAdmissionReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (isOpen) {
      setSeverity("routine");
      setAdmissionType("elective");
      setAdmissionReason("");
      setErrorMessage("");
    }
  }, [isOpen]);

  const handleClose = () => {
    if (!isSubmitting) onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!admissionReason.trim()) {
      setErrorMessage("Please describe why this patient needs to be admitted.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const res = await fetch("/api/admissions/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: patient.id,
          appointmentId,
          admissionType,
          admissionReason,
          severity,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || "Failed to send admission request");
        return;
      }

      onSuccess?.();
      handleClose();
    } catch {
      setErrorMessage("Failed to send admission request");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Request Admission">
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMessage && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
            {errorMessage}
          </div>
        )}

        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm">
          <span className="block text-gray-500 text-xs">Patient</span>
          <span className="font-semibold text-gray-900">
            {patient.firstname} {patient.lastname}
          </span>
          <span className="text-gray-500"> · {patient.gender} · DOB {patient.dob}</span>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Severity of case *
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {ADMISSION_SEVERITIES.map((s) => (
              <label
                key={s.key}
                className={`flex items-start gap-2 px-3 py-2 border rounded-lg cursor-pointer transition-colors ${
                  severity === s.key
                    ? "border-blue-600 bg-blue-50"
                    : "border-gray-300 hover:bg-gray-50"
                }`}
              >
                <input
                  type="radio"
                  name="severity"
                  value={s.key}
                  checked={severity === s.key}
                  onChange={(e) => setSeverity(e.target.value)}
                  className="mt-0.5 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <span>
                  <span className="block text-sm font-medium text-gray-900">{s.label}</span>
                  <span className="block text-xs text-gray-500">{SEVERITY_HINTS[s.key]}</span>
                </span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Admission Type *</label>
          <select
            value={admissionType}
            onChange={(e) => setAdmissionType(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {ADMISSION_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Reason / clinical notes *
          </label>
          <textarea
            value={admissionReason}
            onChange={(e) => setAdmissionReason(e.target.value)}
            required
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            placeholder="Working diagnosis, why inpatient care is needed, anything the ward should know on arrival..."
          />
        </div>

        <p className="text-xs text-gray-500">
          The admission desk will assign a ward and bed. You&apos;ll see the status
          on this appointment once they do.
        </p>

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
            {isSubmitting ? "Sending..." : "Send Admission Request"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

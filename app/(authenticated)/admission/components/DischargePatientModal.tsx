"use client";

import { useState, useEffect } from "react";
import Modal from "@/app/components/ui/Modal";
import type { AdmissionRecord } from "./types";

interface DischargePatientModalProps {
  admission: AdmissionRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function DischargePatientModal({ admission, isOpen, onClose, onSuccess }: DischargePatientModalProps) {
  const [dischargeSummary, setDischargeSummary] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (isOpen) {
      setDischargeSummary("");
      setErrorMessage("");
    }
  }, [isOpen]);

  const handleClose = () => {
    if (!isSubmitting) onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!admission || !dischargeSummary.trim()) {
      setErrorMessage("Please enter a discharge summary.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const res = await fetch(`/api/admissions/${admission.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dischargeSummary }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || "Failed to discharge patient");
        return;
      }

      onSuccess();
      handleClose();
    } catch {
      setErrorMessage("Failed to discharge patient");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!admission) return null;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Discharge Patient">
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMessage && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
            {errorMessage}
          </div>
        )}

        <p className="text-sm text-gray-600">
          Discharging <strong>{admission.patient?.firstname} {admission.patient?.lastname}</strong> from{" "}
          <strong>{admission.ward?.name} — Bed {admission.bed?.bedNumber}</strong>. This will free up the bed.
        </p>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Discharge Summary *</label>
          <textarea
            value={dischargeSummary}
            onChange={(e) => setDischargeSummary(e.target.value)}
            required
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            placeholder="Summary of stay, condition at discharge, follow-up instructions..."
          />
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
            className="px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-md hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Discharging..." : "Discharge Patient"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

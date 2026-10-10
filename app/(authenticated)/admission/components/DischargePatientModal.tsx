"use client";

import { useState, useEffect } from "react";
import Modal from "@/app/components/ui/Modal";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
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
  const [balanceNote, setBalanceNote] = useState("");
  // Current bill, so the outstanding balance is visible before discharging.
  const { data: bill } = useSWR<{ totals: { outstanding: number } }>(
    isOpen && admission ? `/api/admissions/${admission.id}/bill` : null,
    fetcher,
  );
  const outstanding = bill?.totals.outstanding ?? 0;

  useEffect(() => {
    if (isOpen) {
      setDischargeSummary("");
      setBalanceNote("");
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
        body: JSON.stringify({ dischargeSummary, balanceNote }),
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

        {outstanding > 0 && (
          <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 space-y-2">
            <p className="text-sm font-semibold text-amber-900">
              Outstanding bill: ₦{outstanding.toLocaleString()}
            </p>
            <p className="text-xs text-amber-800">
              Ask the patient to settle at the finance desk first, or record why they may leave with a balance.
            </p>
            <input
              type="text"
              value={balanceNote}
              onChange={(e) => setBalanceNote(e.target.value)}
              placeholder="e.g. HMO to settle; family paying Monday — approved by Mrs Ade (accounts)"
              className="w-full rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm"
            />
          </div>
        )}

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

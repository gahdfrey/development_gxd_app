"use client";

import { useEffect, useState } from "react";
import Modal from "@/app/components/ui/Modal";
import type { AdmissionRecord } from "./types";

interface DeclineRequestModalProps {
  request: AdmissionRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function DeclineRequestModal({
  request,
  isOpen,
  onClose,
  onSuccess,
}: DeclineRequestModalProps) {
  const [declineReason, setDeclineReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (isOpen) {
      setDeclineReason("");
      setErrorMessage("");
    }
  }, [isOpen]);

  const handleClose = () => {
    if (!isSubmitting) onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!request) return;
    if (!declineReason.trim()) {
      setErrorMessage("Please give a reason — the requesting doctor will see it.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const res = await fetch(`/api/admissions/${request.id}/decline`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ declineReason }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || "Failed to decline request");
        return;
      }

      onSuccess();
      handleClose();
    } catch {
      setErrorMessage("Failed to decline request");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!request) return null;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Decline Admission Request">
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMessage && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
            {errorMessage}
          </div>
        )}

        <p className="text-sm text-gray-600">
          Declining the request to admit{" "}
          <strong>
            {request.patient?.firstname} {request.patient?.lastname}
          </strong>
          {request.requestedBy && (
            <>
              {" "}raised by{" "}
              <strong>
                Dr. {request.requestedBy.firstname} {request.requestedBy.lastname}
              </strong>
            </>
          )}
          . No bed will be allocated.
        </p>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Reason *</label>
          <textarea
            value={declineReason}
            onChange={(e) => setDeclineReason(e.target.value)}
            required
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            placeholder="No beds available, patient managed as outpatient, referred elsewhere..."
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
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Declining..." : "Decline Request"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

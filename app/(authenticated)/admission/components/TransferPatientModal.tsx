"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import Modal from "@/app/components/ui/Modal";
import type { AdmissionRecord, Ward, Bed } from "./types";

interface TransferPatientModalProps {
  admission: AdmissionRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function TransferPatientModal({ admission, isOpen, onClose, onSuccess }: TransferPatientModalProps) {
  const { data: wards = [] } = useSWR<Ward[]>("/api/wards", fetcher);
  const [wardId, setWardId] = useState("");
  const [bedId, setBedId] = useState("");
  const [reason, setReason] = useState("");
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
      setReason("");
      setErrorMessage("");
    }
  }, [isOpen]);

  useEffect(() => {
    setBedId("");
  }, [wardId]);

  const handleClose = () => {
    if (!isSubmitting) onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!admission || !wardId || !bedId) {
      setErrorMessage("Please select a destination ward and bed.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const res = await fetch(`/api/admissions/${admission.id}/transfer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toWardId: wardId, toBedId: bedId, reason }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || "Failed to transfer patient");
        return;
      }

      onSuccess();
      handleClose();
    } catch {
      setErrorMessage("Failed to transfer patient");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!admission) return null;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Transfer Patient">
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMessage && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
            {errorMessage}
          </div>
        )}

        <p className="text-sm text-gray-600">
          Transferring <strong>{admission.patient?.firstname} {admission.patient?.lastname}</strong> from{" "}
          <strong>{admission.ward?.name} — Bed {admission.bed?.bedNumber}</strong>.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Destination Ward *</label>
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Destination Bed *</label>
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
          <label className="block text-sm font-medium text-gray-700 mb-1">Reason (optional)</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            placeholder="Reason for transfer..."
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
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Transferring..." : "Transfer Patient"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

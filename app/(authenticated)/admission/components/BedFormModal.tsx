"use client";

import { useState, useEffect } from "react";
import Modal from "@/app/components/ui/Modal";
import type { Bed } from "./types";

interface BedFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  wardId: number;
  editing: Bed | null;
  onSuccess: () => void;
}

const STATUS_OPTIONS = [
  { value: "available", label: "Available" },
  { value: "maintenance", label: "Maintenance" },
];

export default function BedFormModal({ isOpen, onClose, wardId, editing, onSuccess }: BedFormModalProps) {
  const [bedNumber, setBedNumber] = useState("");
  const [status, setStatus] = useState("available");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (isOpen) {
      setBedNumber(editing?.bedNumber ?? "");
      setStatus(editing?.status === "maintenance" ? "maintenance" : "available");
      setErrorMessage("");
    }
  }, [isOpen, editing]);

  const handleClose = () => {
    if (!isSubmitting) onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const url = editing ? `/api/beds/${editing.id}` : "/api/beds";
      const method = editing ? "PUT" : "POST";
      const body = editing
        ? { bedNumber, status }
        : { wardId, bedNumber };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || "An error occurred");
        return;
      }

      onSuccess();
      handleClose();
    } catch {
      setErrorMessage("Failed to save bed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={editing ? "Edit Bed" : "Add Bed"}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMessage && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
            {errorMessage}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Bed Number <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={bedNumber}
            onChange={(e) => setBedNumber(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g. 1, 2A"
          />
        </div>

        {editing && editing.status !== "occupied" && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
        )}
        {editing?.status === "occupied" && (
          <p className="text-xs text-gray-500">
            This bed is currently occupied — discharge or transfer the patient to change its status.
          </p>
        )}

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
            {isSubmitting ? "Saving..." : editing ? "Update" : "Add Bed"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

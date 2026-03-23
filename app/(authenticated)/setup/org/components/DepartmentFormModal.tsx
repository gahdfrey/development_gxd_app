"use client";

import { useState, useEffect } from "react";
import Modal from "@/app/components/ui/Modal";
import type { Department } from "@/lib/db/schema";

interface DepartmentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editing: Department | null;
  onSuccess: () => void;
}

export default function DepartmentFormModal({
  isOpen,
  onClose,
  editing,
  onSuccess,
}: DepartmentFormModalProps) {
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Sync form when editing changes
  useEffect(() => {
    if (isOpen) {
      setName(editing?.name ?? "");
      setErrorMessage("");
    }
  }, [isOpen, editing]);

  const handleClose = () => {
    setName("");
    setErrorMessage("");
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const url = editing
        ? `/api/departments/${editing.id}`
        : "/api/departments";
      const method = editing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error || "An error occurred");
        return;
      }

      onSuccess();
      handleClose();
    } catch {
      setErrorMessage("Failed to save department");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={editing ? "Edit Department" : "Create Department"}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMessage && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
            {errorMessage}
          </div>
        )}

        <div>
          <label
            htmlFor="dept-name"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Department Name <span className="text-red-500">*</span>
          </label>
          <input
            id="dept-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g. Haematology"
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
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Saving..." : editing ? "Update" : "Create"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

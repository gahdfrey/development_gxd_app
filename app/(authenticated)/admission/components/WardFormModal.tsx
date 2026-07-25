"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import Modal from "@/app/components/ui/Modal";
import type { Ward } from "./types";

interface Department {
  id: number;
  name: string;
}

interface WardFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editing: Ward | null;
  onSuccess: () => void;
}

export default function WardFormModal({ isOpen, onClose, editing, onSuccess }: WardFormModalProps) {
  const { data: departments = [] } = useSWR<Department[]>("/api/departments", fetcher);
  const [name, setName] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (isOpen) {
      setName(editing?.name ?? "");
      setDepartmentId(editing?.departmentId ? String(editing.departmentId) : "");
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
      const url = editing ? `/api/wards/${editing.id}` : "/api/wards";
      const method = editing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, departmentId: departmentId || null }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || "An error occurred");
        return;
      }

      onSuccess();
      handleClose();
    } catch {
      setErrorMessage("Failed to save ward");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={editing ? "Edit Ward" : "Create Ward"}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMessage && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
            {errorMessage}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Ward Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g. Male Medical Ward"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Department (optional)</label>
          <select
            value={departmentId}
            onChange={(e) => setDepartmentId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">None</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
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
            {isSubmitting ? "Saving..." : editing ? "Update" : "Create"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

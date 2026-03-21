"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import Modal from "@/app/components/ui/Modal";
import SearchableSelect, {
  type SearchableSelectOption,
} from "@/app/components/ui/SearchableSelect";
import type { Department } from "@/lib/db/schema";
import type { TestRow } from "./types";

interface TestFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editing: TestRow | null;
  onSuccess: () => void;
}

export default function TestFormModal({
  isOpen,
  onClose,
  editing,
  onSuccess,
}: TestFormModalProps) {
  const { data: departments } = useSWR<Department[]>(
    "/api/departments",
    fetcher,
  );

  const deptOptions: SearchableSelectOption[] = (departments ?? []).map(
    (d) => ({ id: d.id, label: d.name }),
  );

  const [testName, setTestName] = useState("");
  const [price, setPrice] = useState("");
  const [selectedDept, setSelectedDept] =
    useState<SearchableSelectOption | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Sync form when editing changes or modal opens
  useEffect(() => {
    if (isOpen) {
      if (editing) {
        setTestName(editing.name);
        setPrice(String(editing.price));
        setSelectedDept(
          deptOptions.find((o) => o.id === editing.departmentId) ?? null,
        );
      } else {
        setTestName("");
        setPrice("");
        setSelectedDept(null);
      }
      setErrorMessage("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, editing]);

  const handleClose = () => {
    setTestName("");
    setPrice("");
    setSelectedDept(null);
    setErrorMessage("");
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage("");

    if (!selectedDept) {
      setErrorMessage("Please select a department");
      setIsSubmitting(false);
      return;
    }

    try {
      const url = editing ? `/api/tests/${editing.id}` : "/api/tests";
      const method = editing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: testName,
          price: parseInt(price),
          departmentId: selectedDept.id,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error || "An error occurred");
        return;
      }

      onSuccess();
      handleClose();
    } catch {
      setErrorMessage("Failed to save test");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={editing ? "Edit Test" : "Create Test"}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMessage && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
            {errorMessage}
          </div>
        )}

        <div>
          <label
            htmlFor="test-name"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Test Name <span className="text-red-500">*</span>
          </label>
          <input
            id="test-name"
            type="text"
            value={testName}
            onChange={(e) => setTestName(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g. Full Blood Count"
          />
        </div>

        <SearchableSelect
          label="Department"
          options={deptOptions}
          value={selectedDept}
          onChange={setSelectedDept}
          placeholder={
            !departments
              ? "Loading departments..."
              : deptOptions.length === 0
              ? "No departments — create one first"
              : "Search department..."
          }
          disabled={!departments || deptOptions.length === 0}
        />

        <div>
          <label
            htmlFor="test-price"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Price (₦) <span className="text-red-500">*</span>
          </label>
          <input
            id="test-price"
            type="number"
            min={1}
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g. 5000"
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

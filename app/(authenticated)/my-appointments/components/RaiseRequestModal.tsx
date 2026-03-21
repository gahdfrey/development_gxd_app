"use client";

import { useState, useCallback } from "react";
import useSWR from "swr";
import Modal from "@/app/components/ui/Modal";
import SearchableSelect, {
  type SearchableSelectOption,
} from "@/app/components/ui/SearchableSelect";
import { fetcher } from "@/lib/fetcher";
import { PlusIcon, TrashIcon } from "@heroicons/react/24/outline";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PrefilledPatient {
  id: number;
  firstname: string;
  lastname: string;
  gender: string;
  dob: string;
  countryCode: string;
  phone: string;
  insuranceType?: string | null;
  hmoId?: number | null;
  policyNumber?: string | null;
  hmoName?: string | null;
}

interface Department {
  id: number;
  name: string;
}

interface TestRow {
  id: number;
  name: string;
  price: number;
  departmentId: number;
  departmentName: string | null;
}

interface RaiseRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointmentId?: number;
  prefilledPatient?: PrefilledPatient;
  onSuccess?: () => void;
}

// One row in the "add tests" list
interface RequestRow {
  rowId: string;
  deptOption: SearchableSelectOption | null;
  testOption: SearchableSelectOption | null;
}

interface RowErrors {
  department?: string;
  test?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const formatAge = (dob: string): string => {
  const today = new Date();
  const birth = new Date(dob);
  let years = today.getFullYear() - birth.getFullYear();
  let months = today.getMonth() - birth.getMonth();
  let days = today.getDate() - birth.getDate();
  if (days < 0) { months--; days += new Date(today.getFullYear(), today.getMonth(), 0).getDate(); }
  if (months < 0) { years--; months += 12; }
  if (years >= 1) return `${years} ${years === 1 ? "year" : "years"}`;
  if (months >= 1) return `${months} ${months === 1 ? "month" : "months"}`;
  return `${days} ${days === 1 ? "day" : "days"}`;
};

const formatInsuranceLabel = (patient: PrefilledPatient): string => {
  const type = patient.insuranceType ?? "";
  if (type === "hmo") return "HMO";
  if (type === "corporate") return "Corporate";
  if (type === "private") return "Private";
  return type ? type.charAt(0).toUpperCase() + type.slice(1) : "—";
};

const newRow = (): RequestRow => ({
  rowId: crypto.randomUUID(),
  deptOption: null,
  testOption: null,
});

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function RaiseRequestModal({
  isOpen,
  onClose,
  appointmentId,
  prefilledPatient,
  onSuccess,
}: RaiseRequestModalProps) {
  const { data: departments, isLoading: deptsLoading } = useSWR<Department[]>(
    "/api/departments",
    fetcher,
  );
  const { data: allTests, isLoading: testsLoading } = useSWR<TestRow[]>(
    "/api/tests",
    fetcher,
  );

  const [rows, setRows] = useState<RequestRow[]>([newRow()]);
  const [rowErrors, setRowErrors] = useState<Record<string, RowErrors>>({});
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const deptOptions: SearchableSelectOption[] = (departments ?? []).map(
    (d) => ({ id: d.id, label: d.name }),
  );

  const testsForDept = useCallback(
    (deptId: number | undefined): SearchableSelectOption[] => {
      if (!deptId) return [];
      return (allTests ?? [])
        .filter((t) => t.departmentId === deptId)
        .map((t) => ({
          id: t.id,
          label: t.name,
          sublabel: `₦${t.price.toLocaleString()}`,
        }));
    },
    [allTests],
  );

  // ── Row mutation helpers ────────────────────────────────────────────────

  const handleDeptChange = (rowId: string, opt: SearchableSelectOption | null) => {
    setRows((prev) =>
      prev.map((r) =>
        r.rowId === rowId ? { ...r, deptOption: opt, testOption: null } : r,
      ),
    );
    // Clear errors for this row's department (and test since dept changed)
    setRowErrors((prev) => ({
      ...prev,
      [rowId]: { ...prev[rowId], department: undefined, test: undefined },
    }));
  };

  const handleTestChange = (rowId: string, opt: SearchableSelectOption | null) => {
    setRows((prev) =>
      prev.map((r) =>
        r.rowId === rowId ? { ...r, testOption: opt } : r,
      ),
    );
    setRowErrors((prev) => ({
      ...prev,
      [rowId]: { ...prev[rowId], test: undefined },
    }));
  };

  const addRow = () => setRows((prev) => [...prev, newRow()]);

  const removeRow = (rowId: string) => {
    setRows((prev) => prev.filter((r) => r.rowId !== rowId));
    setRowErrors((prev) => {
      const next = { ...prev };
      delete next[rowId];
      return next;
    });
  };

  // ── Validation ──────────────────────────────────────────────────────────

  const validate = (): boolean => {
    const newRowErrors: Record<string, RowErrors> = {};
    let valid = true;

    rows.forEach((row) => {
      const errs: RowErrors = {};
      if (!row.deptOption) { errs.department = "Select a department"; valid = false; }
      if (!row.testOption) { errs.test = "Select a test"; valid = false; }
      if (errs.department || errs.test) newRowErrors[row.rowId] = errs;
    });

    // Check for duplicate tests
    const testIds = rows.map((r) => r.testOption?.id).filter(Boolean);
    const hasDuplicates = testIds.length !== new Set(testIds).size;
    if (hasDuplicates) {
      setSubmitError("You have selected the same test more than once. Please remove duplicates.");
      setRowErrors(newRowErrors);
      return false;
    }

    setRowErrors(newRowErrors);
    return valid;
  };

  // ── Submit ──────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    setSubmitError("");
    if (!validate()) return;

    setIsSubmitting(true);

    try {
      const results = await Promise.allSettled(
        rows.map((row) =>
          fetch("/api/requests", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              patientId: prefilledPatient!.id,
              departmentId: row.deptOption!.id,
              testId: row.testOption!.id,
              appointmentId: appointmentId ?? null,
            }),
          }).then(async (res) => {
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to create request");
            return data;
          }),
        ),
      );

      const failed = results.filter((r): r is PromiseRejectedResult => r.status === "rejected");

      if (failed.length === results.length) {
        // All failed
        setSubmitError(failed[0].reason?.message || "All requests failed. Please try again.");
        return;
      }

      if (failed.length > 0) {
        // Partial success — still close but surface how many failed
        setSubmitError(
          `${results.length - failed.length} of ${results.length} requests submitted. ${failed.length} failed: ${failed.map((f) => f.reason?.message).join(", ")}`,
        );
        onSuccess?.();
        return;
      }

      // All succeeded
      onSuccess?.();
      handleClose();
    } catch {
      setSubmitError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setRows([newRow()]);
    setRowErrors({});
    setSubmitError("");
    setIsSubmitting(false);
    onClose();
  };

  // ── Compute total price ─────────────────────────────────────────────────

  const totalPrice = rows.reduce((sum, row) => {
    if (!row.testOption) return sum;
    const test = (allTests ?? []).find((t) => t.id === row.testOption!.id);
    return sum + (test?.price ?? 0);
  }, 0);

  const hasAnyTest = rows.some((r) => r.testOption !== null);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Raise Request"
      size="large"
    >
      <div className="space-y-5">
        {/* Submit-level error */}
        {submitError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
            {submitError}
          </div>
        )}

        {/* ── Patient card ── */}
        {prefilledPatient && (
          <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-4 space-y-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Patient
            </p>
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                <span className="text-sm font-bold text-blue-600">
                  {prefilledPatient.firstname.charAt(0)}{prefilledPatient.lastname.charAt(0)}
                </span>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  {prefilledPatient.firstname} {prefilledPatient.lastname}
                </p>
                <p className="text-xs text-gray-500">
                  {prefilledPatient.countryCode} {prefilledPatient.phone}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 pt-1">
              <div className="space-y-1">
                <label className="block text-xs font-medium text-gray-500">Gender</label>
                <div className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 select-none cursor-default">
                  {prefilledPatient.gender
                    ? prefilledPatient.gender.charAt(0).toUpperCase() + prefilledPatient.gender.slice(1)
                    : "—"}
                </div>
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-medium text-gray-500">Age</label>
                <div className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 select-none cursor-default">
                  {prefilledPatient.dob ? formatAge(prefilledPatient.dob) : "—"}
                </div>
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-medium text-gray-500">Insurance</label>
                <div className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 select-none cursor-default">
                  {formatInsuranceLabel(prefilledPatient)}
                </div>
              </div>
            </div>
            {prefilledPatient.insuranceType === "hmo" && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-gray-500">HMO Provider</label>
                  <div className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 select-none cursor-default">
                    {prefilledPatient.hmoName ?? "—"}
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-gray-500">Policy Number</label>
                  <div className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 select-none cursor-default font-mono tracking-wide">
                    {prefilledPatient.policyNumber ?? "—"}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Test rows ── */}
        <div className="space-y-3">
          {rows.map((row, index) => {
            const availableTests = testsForDept(row.deptOption?.id as number | undefined);
            const errs = rowErrors[row.rowId] ?? {};

            return (
              <div
                key={row.rowId}
                className="rounded-xl border border-gray-200 bg-gray-50/50 p-4 space-y-3"
              >
                {/* Row header */}
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Request {index + 1}
                  </span>
                  {rows.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeRow(row.rowId)}
                      disabled={isSubmitting}
                      className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                      title="Remove this request"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* Department */}
                <SearchableSelect
                  label="Department"
                  options={deptOptions}
                  value={row.deptOption}
                  onChange={(opt) => handleDeptChange(row.rowId, opt)}
                  placeholder={
                    deptsLoading
                      ? "Loading departments..."
                      : deptOptions.length === 0
                      ? "No departments available"
                      : "Search department..."
                  }
                  disabled={deptsLoading || deptOptions.length === 0 || isSubmitting}
                  error={errs.department}
                />

                {/* Test */}
                <SearchableSelect
                  label="Test"
                  options={availableTests}
                  value={row.testOption}
                  onChange={(opt) => handleTestChange(row.rowId, opt)}
                  placeholder={
                    !row.deptOption
                      ? "Select a department first"
                      : testsLoading
                      ? "Loading tests..."
                      : availableTests.length === 0
                      ? "No tests for this department"
                      : "Search test..."
                  }
                  disabled={
                    !row.deptOption ||
                    testsLoading ||
                    availableTests.length === 0 ||
                    isSubmitting
                  }
                  error={errs.test}
                />
              </div>
            );
          })}
        </div>

        {/* ── Add More button ── */}
        <button
          type="button"
          onClick={addRow}
          disabled={isSubmitting}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 border-dashed rounded-xl hover:bg-blue-100 hover:border-blue-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <PlusIcon className="h-4 w-4" />
          Add Another Test
        </button>

        {/* ── Total price summary ── */}
        {hasAnyTest && (
          <div className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-xl border border-gray-200">
            <span className="text-sm text-gray-600">
              {rows.filter((r) => r.testOption).length} test{rows.filter((r) => r.testOption).length !== 1 ? "s" : ""} selected
            </span>
            <span className="text-sm font-bold text-gray-900">
              Total: ₦{totalPrice.toLocaleString()}
            </span>
          </div>
        )}

        {/* ── Action Buttons ── */}
        <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-5 py-2.5 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting
              ? "Submitting..."
              : rows.length === 1
              ? "Submit Request"
              : `Submit ${rows.length} Requests`}
          </button>
        </div>
      </div>
    </Modal>
  );
}

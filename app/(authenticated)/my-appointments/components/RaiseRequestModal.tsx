"use client";

import { useState, useCallback } from "react";
import useSWR from "swr";
import Modal from "@/app/components/ui/Modal";
import SearchableSelect, {
  type SearchableSelectOption,
} from "@/app/components/ui/SearchableSelect";
import { fetcher } from "@/lib/fetcher";
import {
  PlusIcon,
  TrashIcon,
  ExclamationTriangleIcon,
  CalendarDaysIcon,
  PhoneIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";

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

  const selectedCount = rows.filter((r) => r.testOption).length;
  const hasAnyTest = selectedCount > 0;
  const isHmo = prefilledPatient?.insuranceType === "hmo";

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
          <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <ExclamationTriangleIcon className="mt-0.5 h-4.5 w-4.5 shrink-0" />
            <span>{submitError}</span>
          </div>
        )}

        {/* ── Patient banner ── */}
        {prefilledPatient && (
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950 p-5">
            <div
              className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-blue-500/20 blur-3xl"
              aria-hidden
            />
            <div className="relative flex flex-wrap items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-lg font-bold text-white shadow-lg shadow-blue-900/40">
                {prefilledPatient.firstname.charAt(0)}
                {prefilledPatient.lastname.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-lg font-bold text-white">
                  {prefilledPatient.firstname} {prefilledPatient.lastname}
                </h3>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-slate-300">
                  <span className="capitalize">{prefilledPatient.gender || "—"}</span>
                  <span className="text-slate-600">•</span>
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarDaysIcon className="h-3.5 w-3.5 text-slate-400" />
                    {prefilledPatient.dob ? formatAge(prefilledPatient.dob) : "—"}
                  </span>
                  <span className="text-slate-600">•</span>
                  <span className="inline-flex items-center gap-1.5">
                    <PhoneIcon className="h-3.5 w-3.5 text-slate-400" />
                    {prefilledPatient.countryCode} {prefilledPatient.phone}
                  </span>
                </div>
              </div>
              <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-blue-200 ring-1 ring-white/10">
                <ShieldCheckIcon className="h-3.5 w-3.5" />
                {formatInsuranceLabel(prefilledPatient)}
              </span>
            </div>

            {/* HMO details */}
            {isHmo && (
              <div className="relative mt-4 grid grid-cols-2 gap-3 border-t border-white/10 pt-4">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                    HMO Provider
                  </p>
                  <p className="mt-0.5 text-sm font-semibold text-white">
                    {prefilledPatient.hmoName ?? "—"}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                    Policy Number
                  </p>
                  <p className="mt-0.5 font-mono text-sm font-semibold tracking-wide text-white">
                    {prefilledPatient.policyNumber ?? "—"}
                  </p>
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
                className="rounded-2xl border border-gray-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-colors focus-within:border-blue-200"
              >
                {/* Row header */}
                <div className="mb-3 flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-blue-700">
                    <span className="flex h-5 w-5 items-center justify-center rounded-md bg-blue-100 text-[11px] font-bold text-blue-700">
                      {index + 1}
                    </span>
                    Test / Investigation
                  </span>
                  {rows.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeRow(row.rowId)}
                      disabled={isSubmitting}
                      className="rounded-lg p-1.5 text-gray-300 transition-colors hover:bg-red-50 hover:text-red-500 disabled:opacity-50"
                      title="Remove this request"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
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
              </div>
            );
          })}
        </div>

        {/* ── Add More button ── */}
        <button
          type="button"
          onClick={addRow}
          disabled={isSubmitting}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-blue-200 bg-blue-50/50 px-4 py-2.5 text-sm font-semibold text-blue-700 transition-colors hover:border-blue-300 hover:bg-blue-100/60 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <PlusIcon className="h-4 w-4" />
          Add Another Test
        </button>

        {/* ── Total price summary ── */}
        {hasAnyTest && (
          <div className="flex items-center justify-between rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-3">
            <span className="text-sm font-medium text-gray-600">
              {selectedCount} test{selectedCount !== 1 ? "s" : ""} selected
            </span>
            <span className="text-base font-bold text-gray-900">
              ₦{totalPrice.toLocaleString()}
            </span>
          </div>
        )}

        {/* ── Action Buttons ── */}
        <div className="flex items-center justify-between gap-3 border-t border-gray-100 pt-4">
          <p className="text-xs text-gray-400">
            {hasAnyTest
              ? "Review the tests above before submitting"
              : "No test added yet"}
          </p>
          <div className="flex gap-2.5">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <span
                    className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
                    aria-hidden
                  />
                  Submitting…
                </>
              ) : rows.length === 1 ? (
                "Submit Request"
              ) : (
                `Submit ${rows.length} Requests`
              )}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

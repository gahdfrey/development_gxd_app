"use client";

import { useState } from "react";
import useSWR from "swr";
import Modal from "@/app/components/ui/Modal";
import SearchableSelect, {
  type SearchableSelectOption,
} from "@/app/components/ui/SearchableSelect";
import { fetcher } from "@/lib/fetcher";
import {
  PlusIcon,
  TrashIcon,
  BeakerIcon,
  ExclamationTriangleIcon,
  CalendarDaysIcon,
  PhoneIcon,
} from "@heroicons/react/24/outline";

interface Product {
  id: number;
  name: string;
  price: number;
  description: string | null;
}

interface PrefilledPatient {
  id: number;
  firstname: string;
  lastname: string;
  gender: string;
  dob: string;
  countryCode: string;
  phone: string;
}

interface PrescriptionRow {
  rowId: string;
  productOption: SearchableSelectOption | null;
  dosage: string;
}

interface RowErrors {
  product?: string;
  dosage?: string;
}

interface PrescriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointmentId?: number;
  prefilledPatient?: PrefilledPatient;
  onSuccess?: () => void;
}

const newRow = (): PrescriptionRow => ({
  rowId: crypto.randomUUID(),
  productOption: null,
  dosage: "",
});

const formatAge = (dob: string): string => {
  const today = new Date();
  const birth = new Date(dob);
  let years = today.getFullYear() - birth.getFullYear();
  let months = today.getMonth() - birth.getMonth();
  let days = today.getDate() - birth.getDate();
  if (days < 0) {
    months--;
    days += new Date(today.getFullYear(), today.getMonth(), 0).getDate();
  }
  if (months < 0) {
    years--;
    months += 12;
  }
  if (years >= 1) return `${years} ${years === 1 ? "year" : "years"}`;
  if (months >= 1) return `${months} ${months === 1 ? "month" : "months"}`;
  return `${days} ${days === 1 ? "day" : "days"}`;
};

export default function PrescriptionModal({
  isOpen,
  onClose,
  appointmentId,
  prefilledPatient,
  onSuccess,
}: PrescriptionModalProps) {
  const { data: products, isLoading: productsLoading } = useSWR<Product[]>(
    "/api/products?prescribable=true",
    fetcher,
  );

  const [rows, setRows] = useState<PrescriptionRow[]>([newRow()]);
  const [rowErrors, setRowErrors] = useState<Record<string, RowErrors>>({});
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const productOptions: SearchableSelectOption[] = (products ?? []).map(
    (p) => ({
      id: p.id,
      label: p.name,
      sublabel: p.price > 0 ? `₦${p.price.toLocaleString()}` : undefined,
    }),
  );

  const handleProductChange = (
    rowId: string,
    opt: SearchableSelectOption | null,
  ) => {
    setRows((prev) =>
      prev.map((r) => (r.rowId === rowId ? { ...r, productOption: opt } : r)),
    );
    setRowErrors((prev) => ({
      ...prev,
      [rowId]: { ...prev[rowId], product: undefined },
    }));
  };

  const handleDosageChange = (rowId: string, value: string) => {
    setRows((prev) =>
      prev.map((r) => (r.rowId === rowId ? { ...r, dosage: value } : r)),
    );
    setRowErrors((prev) => ({
      ...prev,
      [rowId]: { ...prev[rowId], dosage: undefined },
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

  const validate = (): boolean => {
    const newRowErrors: Record<string, RowErrors> = {};
    let valid = true;
    rows.forEach((row) => {
      const errs: RowErrors = {};
      if (!row.productOption) {
        errs.product = "Select a drug";
        valid = false;
      }
      if (!row.dosage.trim()) {
        errs.dosage = "Enter dosage instructions";
        valid = false;
      }
      if (errs.product || errs.dosage) newRowErrors[row.rowId] = errs;
    });
    setRowErrors(newRowErrors);
    return valid;
  };

  const handleSubmit = async () => {
    setSubmitError("");
    if (!validate()) return;
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/prescriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appointmentId: appointmentId ?? null,
          patientId: prefilledPatient!.id,
          items: rows.map((r) => ({
            productId: r.productOption!.id,
            dosage: r.dosage.trim(),
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSubmitError(data.error ?? "Failed to create prescription");
        return;
      }
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

  const filledCount = rows.filter((r) => r.productOption).length;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Write Prescription"
      size="large"
    >
      <div className="space-y-5">
        {submitError && (
          <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <ExclamationTriangleIcon className="mt-0.5 h-4.5 w-4.5 shrink-0" />
            <span>{submitError}</span>
          </div>
        )}

        {/* Patient banner */}
        {prefilledPatient && (
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950 p-5">
            <div
              className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-emerald-500/20 blur-3xl"
              aria-hidden
            />
            <div className="relative flex flex-wrap items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-lg font-bold text-white shadow-lg shadow-emerald-900/40">
                {prefilledPatient.firstname.charAt(0)}
                {prefilledPatient.lastname.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-lg font-bold text-white">
                  {prefilledPatient.firstname} {prefilledPatient.lastname}
                </h3>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-slate-300">
                  <span className="capitalize">{prefilledPatient.gender}</span>
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
            </div>
          </div>
        )}

        {/* Drug rows */}
        <div className="space-y-3">
          {rows.map((row, index) => {
            const errs = rowErrors[row.rowId] ?? {};
            return (
              <div
                key={row.rowId}
                className="rounded-2xl border border-gray-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-colors focus-within:border-emerald-200"
              >
                <div className="mb-3 flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-emerald-700">
                    <span className="flex h-5 w-5 items-center justify-center rounded-md bg-emerald-100 text-[11px] font-bold text-emerald-700">
                      {index + 1}
                    </span>
                    Medication
                  </span>
                  {rows.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeRow(row.rowId)}
                      disabled={isSubmitting}
                      className="rounded-lg p-1.5 text-gray-300 transition-colors hover:bg-red-50 hover:text-red-500 disabled:opacity-50"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <div className="space-y-3">
                  <SearchableSelect
                    label="Drug / Product"
                    options={productOptions}
                    value={row.productOption}
                    onChange={(opt) => handleProductChange(row.rowId, opt)}
                    placeholder={
                      productsLoading
                        ? "Loading drugs..."
                        : productOptions.length === 0
                          ? "No drugs available"
                          : "Search drug..."
                    }
                    disabled={productsLoading || isSubmitting}
                    error={errs.product}
                  />

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
                      Dosage Instructions{" "}
                      <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={row.dosage}
                      onChange={(e) =>
                        handleDosageChange(row.rowId, e.target.value)
                      }
                      placeholder="e.g. 500mg twice daily after meals"
                      disabled={isSubmitting}
                      className={`w-full rounded-xl border bg-gray-50/60 px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 transition-all focus:bg-white focus:outline-none focus:ring-4 disabled:opacity-50 ${
                        errs.dosage
                          ? "border-red-300 focus:border-red-400 focus:ring-red-500/10"
                          : "border-gray-200 focus:border-emerald-400 focus:ring-emerald-500/10"
                      }`}
                    />
                    {errs.dosage && (
                      <p className="mt-1 text-xs text-red-600">{errs.dosage}</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <button
          type="button"
          onClick={addRow}
          disabled={isSubmitting}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-emerald-200 bg-emerald-50/50 px-4 py-2.5 text-sm font-semibold text-emerald-700 transition-colors hover:border-emerald-300 hover:bg-emerald-100/60 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <PlusIcon className="h-4 w-4" />
          Add Another Drug
        </button>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 border-t border-gray-100 pt-4">
          <p className="inline-flex items-center gap-1.5 text-xs text-gray-400">
            <BeakerIcon className="h-4 w-4" />
            {filledCount > 0 ? (
              <>
                <span className="font-semibold text-gray-600">
                  {filledCount}
                </span>{" "}
                {filledCount === 1 ? "medication" : "medications"} ready
              </>
            ) : (
              "No medication added yet"
            )}
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
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-600/25 transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
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
                "Submit Prescription"
              ) : (
                `Submit ${rows.length} Prescriptions`
              )}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

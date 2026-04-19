"use client";

import { useState } from "react";
import useSWR from "swr";
import Modal from "@/app/components/ui/Modal";
import SearchableSelect, { type SearchableSelectOption } from "@/app/components/ui/SearchableSelect";
import { fetcher } from "@/lib/fetcher";
import { PlusIcon, TrashIcon } from "@heroicons/react/24/outline";

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
  if (days < 0) { months--; days += new Date(today.getFullYear(), today.getMonth(), 0).getDate(); }
  if (months < 0) { years--; months += 12; }
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
  const { data: products, isLoading: productsLoading } = useSWR<Product[]>("/api/products", fetcher);

  const [rows, setRows] = useState<PrescriptionRow[]>([newRow()]);
  const [rowErrors, setRowErrors] = useState<Record<string, RowErrors>>({});
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const productOptions: SearchableSelectOption[] = (products ?? []).map((p) => ({
    id: p.id,
    label: p.name,
    sublabel: p.price > 0 ? `₦${p.price.toLocaleString()}` : undefined,
  }));

  const handleProductChange = (rowId: string, opt: SearchableSelectOption | null) => {
    setRows((prev) => prev.map((r) => r.rowId === rowId ? { ...r, productOption: opt } : r));
    setRowErrors((prev) => ({ ...prev, [rowId]: { ...prev[rowId], product: undefined } }));
  };

  const handleDosageChange = (rowId: string, value: string) => {
    setRows((prev) => prev.map((r) => r.rowId === rowId ? { ...r, dosage: value } : r));
    setRowErrors((prev) => ({ ...prev, [rowId]: { ...prev[rowId], dosage: undefined } }));
  };

  const addRow = () => setRows((prev) => [...prev, newRow()]);

  const removeRow = (rowId: string) => {
    setRows((prev) => prev.filter((r) => r.rowId !== rowId));
    setRowErrors((prev) => { const next = { ...prev }; delete next[rowId]; return next; });
  };

  const validate = (): boolean => {
    const newRowErrors: Record<string, RowErrors> = {};
    let valid = true;
    rows.forEach((row) => {
      const errs: RowErrors = {};
      if (!row.productOption) { errs.product = "Select a drug"; valid = false; }
      if (!row.dosage.trim()) { errs.dosage = "Enter dosage instructions"; valid = false; }
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
          items: rows.map((r) => ({ productId: r.productOption!.id, dosage: r.dosage.trim() })),
        }),
      });
      const data = await res.json();
      if (!res.ok) { setSubmitError(data.error ?? "Failed to create prescription"); return; }
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

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Write Prescription" size="large">
      <div className="space-y-5">
        {submitError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">{submitError}</div>
        )}

        {/* Patient card */}
        {prefilledPatient && (
          <div className="rounded-xl border border-green-100 bg-green-50/40 p-4 space-y-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Patient</p>
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                <span className="text-sm font-bold text-green-700">
                  {prefilledPatient.firstname.charAt(0)}{prefilledPatient.lastname.charAt(0)}
                </span>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">{prefilledPatient.firstname} {prefilledPatient.lastname}</p>
                <p className="text-xs text-gray-500">{prefilledPatient.dob ? formatAge(prefilledPatient.dob) : "—"} · {prefilledPatient.countryCode} {prefilledPatient.phone}</p>
              </div>
            </div>
          </div>
        )}

        {/* Drug rows */}
        <div className="space-y-3">
          {rows.map((row, index) => {
            const errs = rowErrors[row.rowId] ?? {};
            return (
              <div key={row.rowId} className="rounded-xl border border-gray-200 bg-gray-50/50 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Drug {index + 1}</span>
                  {rows.length > 1 && (
                    <button type="button" onClick={() => removeRow(row.rowId)} disabled={isSubmitting}
                      className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50">
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <SearchableSelect
                  label="Drug / Product"
                  options={productOptions}
                  value={row.productOption}
                  onChange={(opt) => handleProductChange(row.rowId, opt)}
                  placeholder={productsLoading ? "Loading drugs..." : productOptions.length === 0 ? "No products available" : "Search drug..."}
                  disabled={productsLoading || isSubmitting}
                  error={errs.product}
                />

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Dosage Instructions <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={row.dosage}
                    onChange={(e) => handleDosageChange(row.rowId, e.target.value)}
                    placeholder="e.g. 500mg twice daily after meals"
                    disabled={isSubmitting}
                    className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 ${errs.dosage ? "border-red-400 bg-red-50" : "border-gray-300"}`}
                  />
                  {errs.dosage && <p className="text-xs text-red-600 mt-1">{errs.dosage}</p>}
                </div>
              </div>
            );
          })}
        </div>

        <button type="button" onClick={addRow} disabled={isSubmitting}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-green-700 bg-green-50 border border-green-200 border-dashed rounded-xl hover:bg-green-100 hover:border-green-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
          <PlusIcon className="h-4 w-4" />
          Add Another Drug
        </button>

        <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
          <button type="button" onClick={handleClose} disabled={isSubmitting}
            className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50">
            Cancel
          </button>
          <button type="button" onClick={handleSubmit} disabled={isSubmitting}
            className="px-5 py-2.5 text-sm font-medium text-white bg-green-600 border border-transparent rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
            {isSubmitting ? "Submitting..." : rows.length === 1 ? "Submit Prescription" : `Submit ${rows.length} Prescriptions`}
          </button>
        </div>
      </div>
    </Modal>
  );
}

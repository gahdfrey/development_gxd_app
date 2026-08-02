"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import SearchableSelect, {
  type SearchableSelectOption,
} from "@/app/components/ui/SearchableSelect";
import { ExclamationTriangleIcon, TruckIcon } from "@heroicons/react/24/outline";

interface Brand {
  id: number;
  name: string;
  manufacturer: string | null;
  nafdacRegNumber: string | null;
  totalUnits: number;
}

export interface DispensePrescription {
  id: number;
  genericId: number | null;
  genericName: string | null;
  genericStrength: string | null;
  productId: number | null;
  productName: string | null;
  patientFirstname: string | null;
  patientLastname: string | null;
  dosage: string;
}

interface Props {
  prescription: DispensePrescription;
  onClose: () => void;
  onConfirm: (dispensedProductId: number, batchNumber: string) => Promise<void>;
}

/**
 * Confirms which specific brand is being handed to the patient before a
 * prescription is marked dispatched. Defaults to the clinician's preferred
 * brand when it's in stock, but lets the pharmacist substitute another brand
 * of the same active ingredient — recording exactly which brand (and batch)
 * went out is what makes inventory depletion and adverse-event tracing
 * accurate.
 */
export default function DispenseModal({ prescription, onClose, onConfirm }: Props) {
  const { data: brands, isLoading } = useSWR<Brand[]>(
    prescription.genericId
      ? `/api/products?genericId=${prescription.genericId}&prescribable=true`
      : null,
    fetcher,
  );

  const [selected, setSelected] = useState<SearchableSelectOption | null>(null);
  const [batchNumber, setBatchNumber] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const inStockBrands = useMemo(() => (brands ?? []).filter((b) => b.totalUnits > 0), [brands]);

  // Default to the clinician's preferred brand if it's in stock; otherwise
  // the first available brand of the same active ingredient.
  useEffect(() => {
    if (selected || !brands) return;
    const preferred = prescription.productId
      ? inStockBrands.find((b) => b.id === prescription.productId)
      : undefined;
    const fallback = preferred ?? inStockBrands[0];
    if (fallback) {
      setSelected({
        id: fallback.id,
        label: fallback.name,
        sublabel: fallback.manufacturer ?? undefined,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brands]);

  const options: SearchableSelectOption[] = inStockBrands.map((b) => ({
    id: b.id,
    label: b.name,
    sublabel: [b.manufacturer ?? undefined, `${b.totalUnits} in stock`].filter(Boolean).join(" · "),
  }));

  const patientName = `${prescription.patientFirstname ?? ""} ${prescription.patientLastname ?? ""}`.trim();

  const handleConfirm = async () => {
    if (!selected) {
      setError("Select the brand being dispensed.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onConfirm(Number(selected.id), batchNumber.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to dispatch");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="px-6 py-5 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Confirm Dispensing</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {prescription.genericName} {prescription.genericStrength} — {patientName}
          </p>
        </div>

        <div className="px-6 py-5 space-y-4">
          {error && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
          )}

          {prescription.productName && (
            <p className="text-xs text-gray-500 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">
              Doctor&apos;s preferred brand: <span className="font-medium text-gray-700">{prescription.productName}</span>
            </p>
          )}

          {isLoading ? (
            <div className="flex justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
            </div>
          ) : inStockBrands.length === 0 ? (
            <div className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-3 text-sm text-amber-800">
              <ExclamationTriangleIcon className="mt-0.5 h-4.5 w-4.5 shrink-0" />
              <span>
                No brand of {prescription.genericName} {prescription.genericStrength} is currently in stock. Raise a supply order before dispensing.
              </span>
            </div>
          ) : (
            <>
              <SearchableSelect
                label="Brand to Dispense"
                options={options}
                value={selected}
                onChange={setSelected}
                placeholder="Select brand…"
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Batch / Lot Number
                  <span className="ml-1 text-xs text-gray-400 font-normal">(optional, for traceability)</span>
                </label>
                <input
                  type="text"
                  value={batchNumber}
                  onChange={(e) => setBatchNumber(e.target.value)}
                  placeholder="e.g. LOT-2026-0472"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={saving || inStockBrands.length === 0 || !selected}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <TruckIcon className="h-4 w-4" />
            {saving ? "Dispensing…" : "Confirm & Dispatch"}
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";

interface CatalogProduct {
  id: number;
  name: string;
  description: string | null;
  casesInStock: number;
  unitsPerCase: number;
  looseUnitsInStock: number;
  totalUnits: number;
  reorderLevel: number;
}

interface Props {
  open: boolean;
  /** Pre-select a product to adjust (e.g. from the table row action) */
  preselectedId?: number | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AdjustStockModal({
  open,
  preselectedId,
  onClose,
  onSuccess,
}: Props) {
  const { data: products } = useSWR<CatalogProduct[]>("/api/products", fetcher);

  const [selectedId, setSelectedId] = useState<number | "">(
    preselectedId ?? "",
  );
  // Kept as strings so the fields can be cleared (empty) while typing.
  const [casesInStock, setCasesInStock] = useState("");
  const [looseUnitsInStock, setLooseUnitsInStock] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const selected = products?.find((p) => p.id === selectedId);

  // When a product is selected, pre-fill current stock values
  useEffect(() => {
    if (selected) {
      setCasesInStock(String(selected.casesInStock));
      setLooseUnitsInStock(String(selected.looseUnitsInStock));
    } else {
      setCasesInStock("");
      setLooseUnitsInStock("");
    }
  }, [selectedId, selected]);

  // Reset on open
  useEffect(() => {
    if (open) {
      setSelectedId(preselectedId ?? "");
      setError("");
    }
  }, [open, preselectedId]);

  if (!open) return null;

  // Numeric values derived from the string inputs (empty → 0).
  const casesNum = parseInt(casesInStock, 10) || 0;
  const looseNum = parseInt(looseUnitsInStock, 10) || 0;
  const totalUnits = selected
    ? casesNum * selected.unitsPerCase + looseNum
    : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId) {
      setError("Please select a product.");
      return;
    }
    if (casesNum < 0 || looseNum < 0) {
      setError("Stock values cannot be negative.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/products/${selectedId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ casesInStock: casesNum, looseUnitsInStock: looseNum }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? "Failed to update stock");
      }
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update stock");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Adjust Stock</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Update the current stock level for a product
          </p>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          {/* Product selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Product <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedId}
              onChange={(e) =>
                setSelectedId(e.target.value ? parseInt(e.target.value) : "")
              }
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select a product…</option>
              {(products ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            {selected && (
              <p className="mt-1 text-xs text-gray-400">
                {selected.unitsPerCase} units/case · current stock:{" "}
                {selected.totalUnits} units
              </p>
            )}
          </div>

          {selected && (
            <>
              <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 space-y-3">
                <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">
                  New Stock Quantities
                </p>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Cases in Stock
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={casesInStock}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (/^\d*$/.test(v)) setCasesInStock(v);
                      }}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Loose Units
                      <span className="ml-1 text-xs text-gray-400">
                        (open case)
                      </span>
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={looseUnitsInStock}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (/^\d*$/.test(v)) setLooseUnitsInStock(v);
                      }}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-blue-200 text-xs">
                  <span className="text-blue-600 font-medium">New total</span>
                  <span className="font-bold text-blue-700">
                    {casesNum} × {selected.unitsPerCase} +{" "}
                    {looseNum} ={" "}
                    <span className="text-sm">{totalUnits}</span> units
                  </span>
                </div>
              </div>

              {/* Delta indicator */}
              {totalUnits !== selected.totalUnits && (
                <div
                  className={`flex items-center gap-2 text-sm font-medium px-3 py-2 rounded-lg ${
                    totalUnits > selected.totalUnits
                      ? "bg-green-50 text-green-700"
                      : "bg-red-50 text-red-700"
                  }`}
                >
                  <span>{totalUnits > selected.totalUnits ? "▲" : "▼"}</span>
                  <span>
                    {totalUnits > selected.totalUnits ? "+" : ""}
                    {totalUnits - selected.totalUnits} units from current stock
                    ({selected.totalUnits} → {totalUnits})
                  </span>
                </div>
              )}
            </>
          )}

          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !selectedId}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? "Saving…" : "Update Stock"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

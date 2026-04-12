"use client";

import { useState, useEffect } from "react";

export interface ProductForm {
  name: string;
  description: string;
  casesInStock: number;
  unitsPerCase: number;
  looseUnitsInStock: number;
  reorderLevel: number;
  price: number;
}

interface Product {
  id: number;
  name: string;
  description: string | null;
  casesInStock: number;
  unitsPerCase: number;
  looseUnitsInStock: number;
  reorderLevel: number;
  price: number;
}

interface Props {
  open: boolean;
  initial?: Product | null;
  onClose: () => void;
  onSave: (data: ProductForm, id?: number) => Promise<void>;
}

const BLANK: ProductForm = {
  name: "",
  description: "",
  casesInStock: 0,
  unitsPerCase: 10,
  looseUnitsInStock: 0,
  reorderLevel: 20,
  price: 0,
};

export default function ProductFormModal({ open, initial, onClose, onSave }: Props) {
  const [form, setForm] = useState<ProductForm>(BLANK);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setForm(
        initial
          ? {
              name: initial.name,
              description: initial.description ?? "",
              casesInStock: initial.casesInStock,
              unitsPerCase: initial.unitsPerCase,
              looseUnitsInStock: initial.looseUnitsInStock,
              reorderLevel: initial.reorderLevel,
              price: initial.price ?? 0,
            }
          : BLANK
      );
      setError("");
    }
  }, [open, initial]);

  if (!open) return null;

  const totalUnits = form.casesInStock * form.unitsPerCase + form.looseUnitsInStock;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { setError("Product name is required."); return; }
    if (form.unitsPerCase < 1) { setError("Units per case must be at least 1."); return; }
    if (form.casesInStock < 0 || form.looseUnitsInStock < 0) { setError("Stock values cannot be negative."); return; }

    setSaving(true);
    try {
      await onSave(form, initial?.id);
      onClose();
    } catch (err: any) {
      setError(err.message ?? "Something went wrong.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 border-b border-gray-200 shrink-0">
          <h2 className="text-lg font-semibold text-gray-900">
            {initial ? "Edit Product" : "Add Product"}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4 overflow-y-auto">
          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Product Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Amoxicillin 500mg Capsules"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <input
              type="text"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Optional description"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Price per Unit
              <span className="ml-1 text-xs text-gray-400 font-normal">(price charged per single unit)</span>
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-sm font-medium text-gray-500 pointer-events-none select-none">
                ₦
              </span>
              <input
                type="number"
                min={0}
                step={1}
                value={form.price === 0 ? "" : form.price}
                onChange={(e) => setForm({ ...form, price: Math.max(0, parseInt(e.target.value) || 0) })}
                placeholder="0"
                className="w-full pl-7 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Case/unit configuration */}
          <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 space-y-3">
            <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">
              Stock Quantity
            </p>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Units per Case <span className="text-red-500">*</span>
                <span className="ml-1 text-xs text-gray-400 font-normal">(how many units are in one full case)</span>
              </label>
              <input
                type="number"
                min={1}
                value={form.unitsPerCase}
                onChange={(e) => setForm({ ...form, unitsPerCase: Math.max(1, parseInt(e.target.value) || 1) })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cases in Stock
                </label>
                <input
                  type="number"
                  min={0}
                  value={form.casesInStock}
                  onChange={(e) => setForm({ ...form, casesInStock: Math.max(0, parseInt(e.target.value) || 0) })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Loose Units
                  <span className="ml-1 text-xs text-gray-400 font-normal">(open/partial case)</span>
                </label>
                <input
                  type="number"
                  min={0}
                  value={form.looseUnitsInStock}
                  onChange={(e) => setForm({ ...form, looseUnitsInStock: Math.max(0, parseInt(e.target.value) || 0) })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                />
              </div>
            </div>

            {/* Live total */}
            <div className="flex items-center justify-between pt-1 border-t border-blue-200">
              <span className="text-xs text-blue-600 font-medium">Total units in stock</span>
              <span className="text-sm font-bold text-blue-700">
                {form.casesInStock} × {form.unitsPerCase} + {form.looseUnitsInStock} ={" "}
                <span className="text-base">{totalUnits}</span> units
              </span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reorder Level
              <span className="ml-1 text-xs text-gray-400 font-normal">(total units — warn when stock at or below this)</span>
            </label>
            <input
              type="number"
              min={0}
              value={form.reorderLevel}
              onChange={(e) => setForm({ ...form, reorderLevel: Math.max(0, parseInt(e.target.value) || 0) })}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

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
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? "Saving…" : initial ? "Save Changes" : "Add Product"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

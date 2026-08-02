"use client";

import { useState, useEffect } from "react";
import GenericSelect, { type GenericOption } from "@/app/components/ui/GenericSelect";

export type ProductCategory = "pharmacy" | "laboratory" | "radiology" | "general";

export interface ProductForm {
  name: string;
  description: string;
  category: ProductCategory;
  casesInStock: number;
  unitsPerCase: number;
  looseUnitsInStock: number;
  reorderLevel: number;
  price: number;
  genericId: number | null;
  manufacturer: string;
  nafdacRegNumber: string;
}

interface Product {
  id: number;
  name: string;
  description: string | null;
  category: ProductCategory;
  casesInStock: number;
  unitsPerCase: number;
  looseUnitsInStock: number;
  reorderLevel: number;
  price: number;
  genericId?: number | null;
  genericName?: string | null;
  genericStrength?: string | null;
  genericForm?: string | null;
  manufacturer?: string | null;
  nafdacRegNumber?: string | null;
}

interface Props {
  open: boolean;
  initial?: Product | null;
  onClose: () => void;
  onSave: (data: ProductForm, id?: number) => Promise<void>;
}

const CATEGORY_OPTIONS: { value: ProductCategory; label: string; color: string }[] = [
  { value: "pharmacy",   label: "Pharmacy",   color: "bg-green-100 text-green-800" },
  { value: "laboratory", label: "Laboratory", color: "bg-blue-100 text-blue-800" },
  { value: "radiology",  label: "Radiology",  color: "bg-purple-100 text-purple-800" },
  { value: "general",    label: "General",    color: "bg-gray-100 text-gray-700" },
];

const BLANK: ProductForm = {
  name: "",
  description: "",
  category: "general",
  casesInStock: 0,
  unitsPerCase: 10,
  looseUnitsInStock: 0,
  reorderLevel: 20,
  price: 0,
  genericId: null,
  manufacturer: "",
  nafdacRegNumber: "",
};

export default function ProductFormModal({ open, initial, onClose, onSave }: Props) {
  const [form, setForm] = useState<ProductForm>(BLANK);
  const [generic, setGeneric] = useState<GenericOption | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setForm(
        initial
          ? {
              name: initial.name,
              description: initial.description ?? "",
              category: initial.category ?? "general",
              casesInStock: initial.casesInStock,
              unitsPerCase: initial.unitsPerCase,
              looseUnitsInStock: initial.looseUnitsInStock,
              reorderLevel: initial.reorderLevel,
              price: initial.price ?? 0,
              genericId: initial.genericId ?? null,
              manufacturer: initial.manufacturer ?? "",
              nafdacRegNumber: initial.nafdacRegNumber ?? "",
            }
          : BLANK,
      );
      setGeneric(
        initial?.genericId && initial.genericName && initial.genericStrength
          ? { id: initial.genericId, name: initial.genericName, strength: initial.genericStrength, form: initial.genericForm ?? null }
          : null,
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
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  };

  const selectedCategory = CATEGORY_OPTIONS.find((c) => c.value === form.category)!;

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

          {/* Product name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {form.category === "pharmacy" ? "Brand Name" : "Product Name"} <span className="text-red-500">*</span>
              {form.category === "pharmacy" && (
                <span className="ml-1 text-xs text-gray-400 font-normal">(the specific brand SKU, e.g. &quot;Norvasc 5mg&quot;)</span>
              )}
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder={form.category === "pharmacy" ? "e.g. Norvasc 5mg Tablet" : "e.g. Amoxicillin 500mg Capsules"}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Brand metadata — pharmacy only: active ingredient, manufacturer, NAFDAC reg */}
          {form.category === "pharmacy" && (
            <div className="rounded-lg border border-emerald-100 bg-emerald-50/60 px-4 py-3 space-y-3">
              <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">
                Brand Details
              </p>
              <GenericSelect
                value={generic}
                onChange={(g) => { setGeneric(g); setForm({ ...form, genericId: g?.id ?? null }); }}
                label="Active Ingredient (Generic)"
              />
              <p className="text-xs text-gray-500 -mt-1">
                Links this brand to its active constituent so clinicians can pick any available brand of the same drug, and pharmacy can substitute correctly when one brand runs out.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Manufacturer</label>
                  <input
                    type="text"
                    value={form.manufacturer}
                    onChange={(e) => setForm({ ...form, manufacturer: e.target.value })}
                    placeholder="e.g. Pfizer"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    NAFDAC Reg. No.
                  </label>
                  <input
                    type="text"
                    value={form.nafdacRegNumber}
                    onChange={(e) => setForm({ ...form, nafdacRegNumber: e.target.value })}
                    placeholder="e.g. A4-1234"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {CATEGORY_OPTIONS.map((cat) => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setForm({ ...form, category: cat.value })}
                  className={`px-3 py-2 text-sm font-medium rounded-lg border-2 transition-all ${
                    form.category === cat.value
                      ? "border-blue-500 bg-blue-50 text-blue-700 shadow-sm"
                      : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-xs text-gray-500">
              Selected:{" "}
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${selectedCategory.color}`}>
                {selectedCategory.label}
              </span>
            </p>
          </div>

          {/* Description */}
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

          {/* Price */}
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

          {/* Stock */}
          <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 space-y-3">
            <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">
              Stock Quantity
            </p>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Units per Case <span className="text-red-500">*</span>
                <span className="ml-1 text-xs text-gray-400 font-normal">(units in one full case)</span>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Cases in Stock</label>
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
                  <span className="ml-1 text-xs text-gray-400 font-normal">(open/partial)</span>
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

            <div className="flex items-center justify-between pt-1 border-t border-blue-200">
              <span className="text-xs text-blue-600 font-medium">Total units in stock</span>
              <span className="text-sm font-bold text-blue-700">
                {form.casesInStock} × {form.unitsPerCase} + {form.looseUnitsInStock} ={" "}
                <span className="text-base">{totalUnits}</span> units
              </span>
            </div>
          </div>

          {/* Reorder level */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reorder Level
              <span className="ml-1 text-xs text-gray-400 font-normal">(warn when stock ≤ this)</span>
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

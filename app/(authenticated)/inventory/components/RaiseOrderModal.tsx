"use client";

import { useState, useEffect, useRef } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { PlusIcon, TrashIcon, MagnifyingGlassIcon, ChevronUpDownIcon, CheckIcon } from "@heroicons/react/24/outline";

interface Product {
  id: number;
  name: string;
  totalUnits: number;
  unitsPerCase: number;
}

interface Department {
  id: number;
  name: string;
}

interface LineItem {
  productId: number;
  quantityRequested: number | "";
}

interface Props {
  open: boolean;
  departmentId?: number;
  onClose: () => void;
  onSuccess: () => void;
}

interface InsufficientItem {
  name: string;
  available: number;
  requested: number;
}

// ── Searchable product combobox ───────────────────────────────────────────────
function ProductCombobox({
  products,
  value,
  onChange,
}: {
  products: Product[];
  value: number;
  onChange: (id: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = products.find((p) => p.id === value);

  const filtered = query.trim()
    ? products.filter((p) => p.name.toLowerCase().includes(query.toLowerCase()))
    : products;

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const select = (p: Product) => {
    onChange(p.id);
    setOpen(false);
    setQuery("");
  };

  return (
    <div ref={ref} className="relative flex-1 min-w-0">
      <button
        type="button"
        onClick={() => {
          setOpen((o) => !o);
          setTimeout(() => inputRef.current?.focus(), 50);
        }}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-left"
      >
        <span className={selected ? "text-gray-900 truncate" : "text-gray-400"}>
          {selected ? selected.name : "Select product…"}
        </span>
        <ChevronUpDownIcon className="h-4 w-4 text-gray-400 shrink-0" />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
          {/* Search input */}
          <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100">
            <MagnifyingGlassIcon className="h-4 w-4 text-gray-400 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search products…"
              className="flex-1 text-sm outline-none bg-transparent placeholder-gray-400"
            />
          </div>

          {/* Options */}
          <div className="max-h-48 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="px-3 py-3 text-sm text-gray-400 text-center">No products found</p>
            ) : (
              filtered.map((p) => {
                const isSelected = p.id === value;
                const stockColor =
                  p.totalUnits === 0
                    ? "text-red-500"
                    : p.totalUnits <= 10
                    ? "text-amber-500"
                    : "text-green-600";
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => select(p)}
                    className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 text-sm hover:bg-gray-50 transition-colors ${
                      isSelected ? "bg-blue-50" : ""
                    }`}
                  >
                    <span className={`flex-1 text-left truncate ${isSelected ? "font-medium text-blue-700" : "text-gray-800"}`}>
                      {p.name}
                    </span>
                    <span className={`text-xs font-medium shrink-0 ${stockColor}`}>
                      {p.totalUnits} in stock
                    </span>
                    {isSelected && <CheckIcon className="h-4 w-4 text-blue-600 shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main modal ────────────────────────────────────────────────────────────────
export default function RaiseOrderModal({ open, departmentId, onClose, onSuccess }: Props) {
  const { data: productList } = useSWR<Product[]>("/api/products", fetcher);
  const { data: departments } = useSWR<Department[]>("/api/departments", fetcher);

  const [selectedDeptId, setSelectedDeptId] = useState<number | "">(departmentId ?? "");
  const [deptSearch, setDeptSearch] = useState("");
  const [deptOpen, setDeptOpen] = useState(false);
  const deptRef = useRef<HTMLDivElement>(null);

  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<LineItem[]>([{ productId: 0, quantityRequested: "" }]);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState("");
  const [insufficientItems, setInsufficientItems] = useState<InsufficientItem[]>([]);

  // Reset on open
  useEffect(() => {
    if (open) {
      setSelectedDeptId(departmentId ?? "");
      setNotes("");
      setLines([{ productId: 0, quantityRequested: "" }]);
      setServerError("");
      setInsufficientItems([]);
      setDeptSearch("");
    }
  }, [open, departmentId]);

  // Close dept dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (deptRef.current && !deptRef.current.contains(e.target as Node)) {
        setDeptOpen(false);
        setDeptSearch("");
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (!open) return null;

  const getProduct = (id: number) => productList?.find((p) => p.id === id);

  const addLine = () =>
    setLines((prev) => [...prev, { productId: 0, quantityRequested: "" }]);

  const removeLine = (idx: number) =>
    setLines((prev) => prev.filter((_, i) => i !== idx));

  const updateProductId = (idx: number, productId: number) => {
    setLines((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], productId };
      return next;
    });
  };

  const updateQty = (idx: number, raw: string) => {
    // Allow empty string so user can clear and retype
    const parsed = raw === "" ? "" : Math.max(1, parseInt(raw) || 1);
    setLines((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], quantityRequested: parsed };
      return next;
    });
  };

  const isOver = (line: LineItem): boolean => {
    if (!line.productId || line.quantityRequested === "") return false;
    const p = getProduct(line.productId);
    return !!p && (line.quantityRequested as number) > p.totalUnits;
  };

  const selectedDept = (departments ?? []).find((d) => d.id === selectedDeptId);
  const filteredDepts = deptSearch.trim()
    ? (departments ?? []).filter((d) => d.name.toLowerCase().includes(deptSearch.toLowerCase()))
    : (departments ?? []);

  const hasErrors =
    !selectedDeptId ||
    lines.some((l) => !l.productId || l.quantityRequested === "" || (l.quantityRequested as number) < 1);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError("");
    setInsufficientItems([]);
    setSubmitting(true);
    try {
      const res = await fetch("/api/inventory/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          departmentId: selectedDeptId,
          notes: notes.trim() || undefined,
          items: lines.map((l) => ({
            productId: l.productId,
            quantityRequested: l.quantityRequested,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === "insufficient_stock") {
          setInsufficientItems(data.items);
        } else {
          setServerError(data.error ?? "Failed to raise order");
        }
        return;
      }
      onSuccess();
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-gray-100 shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Raise Supply Order</h2>
              <p className="text-sm text-gray-500 mt-0.5">Request products from central inventory</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="px-6 py-5 space-y-5 overflow-y-auto flex-1">

            {/* Error banners */}
            {serverError && (
              <div className="flex items-start gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
                <svg className="w-4 h-4 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                {serverError}
              </div>
            )}

            {insufficientItems.length > 0 && (
              <div className="px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-800">
                <p className="font-semibold mb-2">Insufficient stock:</p>
                <ul className="space-y-1">
                  {insufficientItems.map((item) => (
                    <li key={item.name} className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                      <span>
                        <span className="font-medium">{item.name}</span>
                        {" — "}requested {item.requested}, only {item.available} available
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Department */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Department <span className="text-red-500">*</span>
              </label>
              {departmentId ? (
                // Pre-selected and locked
                <div className="px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg text-gray-700">
                  {selectedDept?.name ?? "—"}
                </div>
              ) : (
                <div ref={deptRef} className="relative">
                  <button
                    type="button"
                    onClick={() => { setDeptOpen((o) => !o); }}
                    className="w-full flex items-center justify-between gap-2 px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-left"
                  >
                    <span className={selectedDept ? "text-gray-900" : "text-gray-400"}>
                      {selectedDept ? selectedDept.name : "Select a department…"}
                    </span>
                    <ChevronUpDownIcon className="h-4 w-4 text-gray-400 shrink-0" />
                  </button>

                  {deptOpen && (
                    <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                      <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100">
                        <MagnifyingGlassIcon className="h-4 w-4 text-gray-400 shrink-0" />
                        <input
                          type="text"
                          value={deptSearch}
                          onChange={(e) => setDeptSearch(e.target.value)}
                          placeholder="Search departments…"
                          className="flex-1 text-sm outline-none bg-transparent placeholder-gray-400"
                          autoFocus
                        />
                      </div>
                      <div className="max-h-44 overflow-y-auto">
                        {filteredDepts.length === 0 ? (
                          <p className="px-3 py-3 text-sm text-gray-400 text-center">No departments found</p>
                        ) : (
                          filteredDepts.map((d) => (
                            <button
                              key={d.id}
                              type="button"
                              onClick={() => {
                                setSelectedDeptId(d.id);
                                setDeptOpen(false);
                                setDeptSearch("");
                              }}
                              className={`w-full flex items-center justify-between px-3 py-2.5 text-sm hover:bg-gray-50 transition-colors ${
                                selectedDeptId === d.id ? "bg-blue-50 text-blue-700 font-medium" : "text-gray-800"
                              }`}
                            >
                              {d.name}
                              {selectedDeptId === d.id && <CheckIcon className="h-4 w-4 text-blue-600" />}
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional notes for this order…"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400"
              />
            </div>

            {/* Line Items */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">
                  Products <span className="text-red-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={addLine}
                  className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-2 py-1 rounded-lg transition-colors"
                >
                  <PlusIcon className="h-3.5 w-3.5" />
                  Add product
                </button>
              </div>

              <div className="space-y-3">
                {lines.map((line, idx) => {
                  const product = line.productId ? getProduct(line.productId) : undefined;
                  const over = isOver(line);
                  return (
                    <div key={idx} className="rounded-xl border border-gray-200 bg-gray-50 p-3 space-y-2">
                      {/* Product selector row */}
                      <div className="flex items-start gap-2">
                        <ProductCombobox
                          products={productList ?? []}
                          value={line.productId}
                          onChange={(id) => updateProductId(idx, id)}
                        />
                        {lines.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeLine(idx)}
                            className="mt-0.5 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        )}
                      </div>

                      {/* Quantity + stock info row */}
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <label className="text-xs text-gray-500 whitespace-nowrap">Qty requested</label>
                          <input
                            type="number"
                            min={1}
                            value={line.quantityRequested}
                            onChange={(e) => updateQty(idx, e.target.value)}
                            placeholder="0"
                            className={`w-24 px-3 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-2 text-center ${
                              over
                                ? "border-amber-400 focus:ring-amber-400 bg-amber-50 text-amber-800"
                                : "border-gray-300 focus:ring-blue-500 bg-white"
                            }`}
                          />
                        </div>

                        {product && (
                          <div className={`flex items-center gap-1.5 text-xs font-medium ${
                            product.totalUnits === 0
                              ? "text-red-600"
                              : over
                              ? "text-amber-600"
                              : "text-green-600"
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              product.totalUnits === 0
                                ? "bg-red-500"
                                : over
                                ? "bg-amber-500"
                                : "bg-green-500"
                            }`} />
                            {product.totalUnits === 0
                              ? "Out of stock"
                              : over
                              ? `Only ${product.totalUnits} available`
                              : `${product.totalUnits} in stock`}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 shrink-0 bg-gray-50 rounded-b-2xl">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || hasErrors}
              className="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? "Submitting…" : "Raise Order"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

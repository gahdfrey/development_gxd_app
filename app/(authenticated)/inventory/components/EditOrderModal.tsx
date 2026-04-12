"use client";

import { useState, useEffect, useRef } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { PlusIcon, TrashIcon, MagnifyingGlassIcon, ChevronUpDownIcon, CheckIcon } from "@heroicons/react/24/outline";

interface Product {
  id: number;
  name: string;
  totalUnits: number;
}

interface LineItem {
  productId: number;
  quantityRequested: number | "";
}

interface ExistingItem {
  id: number;
  productId: number | null;
  itemName: string | null;
  quantityRequested: number;
}

interface OrderToEdit {
  id: number;
  notes: string | null;
  departmentName: string | null;
  items: ExistingItem[];
}

interface Props {
  order: OrderToEdit | null;
  onClose: () => void;
  onSuccess: () => void;
}

interface InsufficientItem {
  name: string;
  available: number;
  requested: number;
}

// ── Searchable product combobox (same as RaiseOrderModal) ─────────────────────
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

  return (
    <div ref={ref} className="relative flex-1 min-w-0">
      <button
        type="button"
        onClick={() => { setOpen((o) => !o); setTimeout(() => inputRef.current?.focus(), 50); }}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-left"
      >
        <span className={selected ? "text-gray-900 truncate" : "text-gray-400"}>
          {selected ? selected.name : "Select product…"}
        </span>
        <ChevronUpDownIcon className="h-4 w-4 text-gray-400 shrink-0" />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
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
          <div className="max-h-44 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="px-3 py-3 text-sm text-gray-400 text-center">No products found</p>
            ) : (
              filtered.map((p) => {
                const isSelected = p.id === value;
                const stockColor = p.totalUnits === 0 ? "text-red-500" : p.totalUnits <= 10 ? "text-amber-500" : "text-green-600";
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => { onChange(p.id); setOpen(false); setQuery(""); }}
                    className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 text-sm hover:bg-gray-50 transition-colors ${isSelected ? "bg-blue-50" : ""}`}
                  >
                    <span className={`flex-1 text-left truncate ${isSelected ? "font-medium text-blue-700" : "text-gray-800"}`}>{p.name}</span>
                    <span className={`text-xs font-medium shrink-0 ${stockColor}`}>{p.totalUnits} in stock</span>
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
export default function EditOrderModal({ order, onClose, onSuccess }: Props) {
  const { data: productList } = useSWR<Product[]>("/api/products", fetcher);

  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<LineItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState("");
  const [insufficientItems, setInsufficientItems] = useState<InsufficientItem[]>([]);

  // Pre-fill from existing order whenever it changes
  useEffect(() => {
    if (order) {
      setNotes(order.notes ?? "");
      setLines(
        order.items.length > 0
          ? order.items.map((i) => ({
              productId: i.productId ?? 0,
              quantityRequested: i.quantityRequested,
            }))
          : [{ productId: 0, quantityRequested: "" }]
      );
      setServerError("");
      setInsufficientItems([]);
    }
  }, [order]);

  if (!order) return null;

  const getProduct = (id: number) => productList?.find((p) => p.id === id);

  const addLine = () => setLines((p) => [...p, { productId: 0, quantityRequested: "" }]);
  const removeLine = (idx: number) => setLines((p) => p.filter((_, i) => i !== idx));

  const updateProductId = (idx: number, productId: number) => {
    setLines((prev) => { const n = [...prev]; n[idx] = { ...n[idx], productId }; return n; });
  };

  const updateQty = (idx: number, raw: string) => {
    const parsed = raw === "" ? "" : Math.max(1, parseInt(raw) || 1);
    setLines((prev) => { const n = [...prev]; n[idx] = { ...n[idx], quantityRequested: parsed }; return n; });
  };

  const isOver = (line: LineItem) => {
    if (!line.productId || line.quantityRequested === "") return false;
    const p = getProduct(line.productId);
    return !!p && (line.quantityRequested as number) > p.totalUnits;
  };

  const hasErrors = lines.some((l) => !l.productId || l.quantityRequested === "" || (l.quantityRequested as number) < 1);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError("");
    setInsufficientItems([]);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/inventory/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notes: notes.trim() || null,
          items: lines.map((l) => ({ productId: l.productId, quantityRequested: l.quantityRequested })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === "insufficient_stock") {
          setInsufficientItems(data.items);
        } else {
          setServerError(data.error ?? "Failed to update order");
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
              <h2 className="text-lg font-semibold text-gray-900">Edit Order #{order.id}</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                {order.departmentName && <span className="font-medium text-gray-700">{order.departmentName}</span>}
                {" · "}Only pending orders can be edited
              </p>
            </div>
            <button type="button" onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="px-6 py-5 space-y-5 overflow-y-auto flex-1 relative z-10">

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
                      <span><span className="font-medium">{item.name}</span> — requested {item.requested}, only {item.available} available</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

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
                            product.totalUnits === 0 ? "text-red-600" : over ? "text-amber-600" : "text-green-600"
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              product.totalUnits === 0 ? "bg-red-500" : over ? "bg-amber-500" : "bg-green-500"
                            }`} />
                            {product.totalUnits === 0 ? "Out of stock" : over ? `Only ${product.totalUnits} available` : `${product.totalUnits} in stock`}
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
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || hasErrors}
              className="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

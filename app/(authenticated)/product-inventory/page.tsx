"use client";

import { useState, useMemo } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { MagnifyingGlassIcon, ArrowPathIcon, PencilSquareIcon } from "@heroicons/react/24/outline";
import AdjustStockModal from "./components/AdjustStockModal";

interface Product {
  id: number;
  name: string;
  description: string | null;
  casesInStock: number;
  unitsPerCase: number;
  looseUnitsInStock: number;
  totalUnits: number;
  reorderLevel: number;
  updatedAt: string;
}

// ─── Stock badge ─────────────────────────────────────────────────────────────
// function StockBadge({ totalUnits, reorderLevel }: { totalUnits: number; reorderLevel: number }) {
//   if (totalUnits === 0)
//     return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">Out of Stock</span>;
//   if (totalUnits <= reorderLevel)
//     return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">Low Stock</span>;
//   return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">In Stock</span>;
// }

// ─── Inline stock bar ─────────────────────────────────────────────────────────
function StockBar({ totalUnits, reorderLevel }: { totalUnits: number; reorderLevel: number }) {
  // Treat 3× reorderLevel as "full"
  const max = Math.max(reorderLevel * 3, totalUnits, 1);
  const pct = Math.min((totalUnits / max) * 100, 100);
  const color = totalUnits === 0 ? "bg-red-400" : totalUnits <= reorderLevel ? "bg-amber-400" : "bg-green-400";
  return (
    <div className="w-full bg-gray-100 rounded-full h-1.5 mt-1">
      <div className={`${color} h-1.5 rounded-full transition-all`} style={{ width: `${pct}%` }} />
    </div>
  );
}

// ─── Summary stat card ────────────────────────────────────────────────────────
function StatCard({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string | number;
  sub?: string;
  color: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-4">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

export default function ProductsPage() {
  const { data, isLoading, mutate } = useSWR<Product[]>("/api/products", fetcher);

  const [search, setSearch] = useState("");
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustProductId, setAdjustProductId] = useState<number | null>(null);

  const products = data ?? [];

  // ─── Derived analytics ───────────────────────────────────────────────────
  const stats = useMemo(() => {
    const inStock = products.filter((p) => p.totalUnits > p.reorderLevel).length;
    const lowStock = products.filter((p) => p.totalUnits > 0 && p.totalUnits <= p.reorderLevel).length;
    const outOfStock = products.filter((p) => p.totalUnits === 0).length;
    const totalUnits = products.reduce((s, p) => s + p.totalUnits, 0);
    return { inStock, lowStock, outOfStock, totalUnits, total: products.length };
  }, [products]);

  const filtered = useMemo(
    () => products.filter((p) => p.name.toLowerCase().includes(search.toLowerCase())),
    [products, search]
  );

  const openAdjust = (id?: number) => {
    setAdjustProductId(id ?? null);
    setAdjustOpen(true);
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory</h1>
          <p className="text-gray-500 text-sm mt-1">
            Live stock overview — cases &amp; unit-level tracking
          </p>
        </div>
        <button
          onClick={() => openAdjust()}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-sm"
        >
          <ArrowPathIcon className="h-4 w-4" />
          Adjust Stock
        </button>
      </div>

      {/* ── Analytics cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard label="Total Products"  value={stats.total}      color="text-gray-800" />
        <StatCard label="In Stock"        value={stats.inStock}    color="text-green-600" sub="above reorder level" />
        <StatCard label="Low Stock"       value={stats.lowStock}   color="text-amber-600" sub="at or below reorder" />
        <StatCard label="Out of Stock"    value={stats.outOfStock} color="text-red-600" />
        <StatCard
          label="Total Units"
          value={stats.totalUnits.toLocaleString()}
          color="text-blue-700"
          sub="across all products"
        />
      </div>

      {/* ── Search ── */}
      <div className="relative max-w-sm">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
        <input
          type="text"
          placeholder="Search products…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* ── Product table ── */}
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Units / Case</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-52">Stock Level</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Breakdown</th>
                {/* <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th> */}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reorder At</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Updated</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-sm text-gray-500">
                    {search ? "No products match your search." : "No products yet. Add them in Setup → Organisation → Products."}
                  </td>
                </tr>
              ) : (
                filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="text-sm font-semibold text-gray-900">{p.name}</p>
                      {p.description && (
                        <p className="text-xs text-gray-400 mt-0.5">{p.description}</p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{p.unitsPerCase}/case</td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-gray-900">{p.totalUnits.toLocaleString()} units</p>
                      <StockBar totalUnits={p.totalUnits} reorderLevel={p.reorderLevel} />
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-500 whitespace-nowrap">
                      <span className="font-medium text-gray-700">{p.casesInStock}</span> cases ×{" "}
                      <span className="font-medium text-gray-700">{p.unitsPerCase}</span>
                      {p.looseUnitsInStock > 0 && (
                        <span className="text-gray-400"> + {p.looseUnitsInStock} loose</span>
                      )}
                    </td>
                    {/* <td className="px-6 py-4">
                      <StockBadge totalUnits={p.totalUnits} reorderLevel={p.reorderLevel} />
                    </td> */}
                    <td className="px-6 py-4 text-sm text-gray-500">{p.reorderLevel} units</td>
                    <td className="px-6 py-4 text-xs text-gray-400">{formatDate(p.updatedAt)}</td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => openAdjust(p.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                        title="Adjust stock"
                      >
                        <PencilSquareIcon className="h-3.5 w-3.5" />
                        Adjust
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      <AdjustStockModal
        open={adjustOpen}
        preselectedId={adjustProductId}
        onClose={() => { setAdjustOpen(false); setAdjustProductId(null); }}
        onSuccess={() => mutate()}
      />
    </div>
  );
}

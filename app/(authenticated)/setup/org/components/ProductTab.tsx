"use client";

import { useState, useMemo } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { createColumnHelper } from "@tanstack/react-table";
import { PencilSquareIcon, TrashIcon, PlusIcon } from "@heroicons/react/24/outline";
import Table from "@/app/components/ui/Table";
import Modal from "@/app/components/ui/Modal";
import ProductFormModal, { type ProductForm, type ProductCategory } from "./ProductFormModal";

interface Product {
  id: number;
  name: string;
  description: string | null;
  category: ProductCategory;
  casesInStock: number;
  unitsPerCase: number;
  looseUnitsInStock: number;
  totalUnits: number;
  reorderLevel: number;
  price: number;
  createdAt: string;
}

// ── Category config ───────────────────────────────────────────────────────────
type TabKey = "all" | ProductCategory;

const TABS: { key: TabKey; label: string }[] = [
  { key: "all",        label: "All" },
  { key: "pharmacy",   label: "Pharmacy" },
  { key: "laboratory", label: "Laboratory" },
  { key: "radiology",  label: "Radiology" },
  { key: "general",    label: "General" },
];

const CATEGORY_BADGE: Record<ProductCategory, string> = {
  pharmacy:   "bg-green-100 text-green-800",
  laboratory: "bg-blue-100 text-blue-800",
  radiology:  "bg-purple-100 text-purple-800",
  general:    "bg-gray-100 text-gray-700",
};

function CategoryBadge({ category }: { category: ProductCategory }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${CATEGORY_BADGE[category] ?? "bg-gray-100 text-gray-700"}`}>
      {category}
    </span>
  );
}

function formatPrice(naira: number) {
  if (naira === 0) return <span className="text-gray-400 text-xs">—</span>;
  return <span className="font-medium text-gray-800">₦ {naira.toLocaleString("en-NG")}</span>;
}

function StockBadge({ totalUnits, reorderLevel }: { totalUnits: number; reorderLevel: number }) {
  if (totalUnits === 0)
    return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">Out of Stock</span>;
  if (totalUnits <= reorderLevel)
    return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">Low Stock</span>;
  return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">In Stock</span>;
}

export default function ProductTab() {
  const { data: products, error, mutate } = useSWR<Product[]>("/api/products", fetcher);

  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState<Product | null>(null);
  const [deleteError, setDeleteError] = useState("");

  const openCreate = () => { setEditing(null); setIsFormModalOpen(true); };
  const openEdit = (p: Product) => { setEditing(p); setIsFormModalOpen(true); };
  const openDelete = (p: Product) => { setDeleting(p); setDeleteError(""); setIsDeleteModalOpen(true); };

  const handleSave = async (form: ProductForm, id?: number) => {
    const url = id ? `/api/products/${id}` : "/api/products";
    const res = await fetch(url, {
      method: id ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error ?? "Failed to save product");
    }
    mutate();
  };

  const handleDeleteConfirm = async () => {
    if (!deleting) return;
    setDeleteError("");
    const res = await fetch(`/api/products/${deleting.id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      setDeleteError(data.error ?? "Failed to delete product");
      return;
    }
    mutate();
    setIsDeleteModalOpen(false);
    setDeleting(null);
  };

  // Filtered products by active tab
  const filtered = useMemo(() => {
    if (!products) return [];
    if (activeTab === "all") return products;
    return products.filter((p) => p.category === activeTab);
  }, [products, activeTab]);

  // Tab counts
  const counts = useMemo(() => {
    const all = products ?? [];
    return {
      all:       all.length,
      pharmacy:  all.filter((p) => p.category === "pharmacy").length,
      laboratory:all.filter((p) => p.category === "laboratory").length,
      radiology: all.filter((p) => p.category === "radiology").length,
      general:   all.filter((p) => p.category === "general").length,
    } as Record<TabKey, number>;
  }, [products]);

  const columnHelper = createColumnHelper<Product>();

  const columns = useMemo(
    () => [
      columnHelper.accessor("name", {
        header: "Product Name",
        cell: (info) => (
          <div>
            <p className="font-semibold text-gray-900">{info.getValue()}</p>
            {info.row.original.description && (
              <p className="text-xs text-gray-400 mt-0.5">{info.row.original.description}</p>
            )}
          </div>
        ),
      }),
      columnHelper.accessor("category", {
        header: "Category",
        cell: (info) => <CategoryBadge category={info.getValue()} />,
      }),
      columnHelper.accessor("unitsPerCase", {
        header: "Units / Case",
        cell: (info) => <span className="text-gray-600">{info.getValue()} units/case</span>,
      }),
      columnHelper.display({
        id: "quantity",
        header: "Quantity",
        cell: ({ row }) => {
          const p = row.original;
          return (
            <div>
              <p className="font-semibold text-gray-900">{p.totalUnits} units</p>
              <p className="text-xs text-gray-500">
                {p.casesInStock} case{p.casesInStock !== 1 ? "s" : ""} × {p.unitsPerCase}/case
                {p.looseUnitsInStock > 0 && (
                  <span className="text-gray-400"> + {p.looseUnitsInStock} loose</span>
                )}
              </p>
            </div>
          );
        },
      }),
      columnHelper.display({
        id: "status",
        header: "Status",
        cell: ({ row }) => (
          <StockBadge totalUnits={row.original.totalUnits} reorderLevel={row.original.reorderLevel} />
        ),
      }),
      columnHelper.accessor("reorderLevel", {
        header: "Reorder At",
        cell: (info) => <span className="text-gray-600">{info.getValue()} units</span>,
      }),
      columnHelper.accessor("price", {
        header: "Price / Unit",
        cell: (info) => formatPrice(info.getValue()),
      }),
      columnHelper.display({
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
          <div className="flex gap-2">
            <button
              onClick={() => openEdit(row.original)}
              className="p-1 text-yellow-600 hover:text-yellow-800 transition-colors"
              title="Edit"
            >
              <PencilSquareIcon className="w-5 h-5" />
            </button>
            <button
              onClick={() => openDelete(row.original)}
              className="p-1 text-red-600 hover:text-red-800 transition-colors"
              title="Delete"
            >
              <TrashIcon className="w-5 h-5" />
            </button>
          </div>
        ),
      }),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
        Failed to load products. Please try again.
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">
          {products ? `${filtered.length} of ${products.length} products` : "Loading…"}
        </p>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
        >
          <PlusIcon className="w-5 h-5" />
          Add Product
        </button>
      </div>

      {/* Category tabs */}
      <div className="border-b border-gray-200 mb-4">
        <nav className="-mb-px flex gap-1 overflow-x-auto scrollbar-none">
          {TABS.map((t) => {
            const count = counts[t.key] ?? 0;
            const isActive = activeTab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                  isActive
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                {t.label}
                {count > 0 && (
                  <span className={`inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-semibold ${
                    isActive ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Table */}
      {!products ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <p className="text-gray-500 mb-4">
            {activeTab === "all"
              ? "No products yet."
              : `No ${activeTab} products yet.`}{" "}
            Add your first one!
          </p>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <PlusIcon className="w-5 h-5" />
            Add Product
          </button>
        </div>
      ) : (
        <Table data={filtered} columns={columns} />
      )}

      <ProductFormModal
        open={isFormModalOpen}
        initial={editing}
        onClose={() => { setIsFormModalOpen(false); setEditing(null); }}
        onSave={handleSave}
      />

      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => { setIsDeleteModalOpen(false); setDeleting(null); }}
        title="Delete Product"
      >
        <div className="space-y-4">
          {deleteError && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{deleteError}</p>
          )}
          <p className="text-gray-600">
            Are you sure you want to delete <strong>{deleting?.name}</strong>? This cannot be undone.
          </p>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => { setIsDeleteModalOpen(false); setDeleting(null); }}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteConfirm}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
            >
              Delete
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}

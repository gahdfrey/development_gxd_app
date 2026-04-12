"use client";

/**
 * /inventory/orders — Supply team view
 *
 * Each supplyOrder row is its own product line with its own unique Order ID.
 * Multiple orders from the same department requisition share a Dept Order ID.
 *
 * Flow per row:
 *   pending  → Accept | Cancel | View
 *   approved → Deliver | View
 *   delivered / cancelled → View only
 *
 * PATCH /api/inventory/orders/:orderId  ← individual order id
 */

import { useState, useMemo } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import {
  TruckIcon,
  XCircleIcon,
  EyeIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";

// ── Types ─────────────────────────────────────────────────────────────────────

interface OrderItem {
  id: number;
  productId: number | null;
  itemName: string | null;
  itemTotalUnits: number | null;
  quantityRequested: number;
  itemStatus: string;
  deliveredAt: string | null;
}

interface SupplyOrder {
  id: number;
  departmentOrderId: number | null;
  status: string;
  notes: string | null;
  cancellationReason: string | null;
  createdAt: string;
  updatedAt: string;
  departmentId: number;
  departmentName: string | null;
  requestedBy: number;
  requestedByFirstname: string | null;
  requestedByLastname: string | null;
  items: OrderItem[];
}

// ── Constants ─────────────────────────────────────────────────────────────────

const ORDER_BADGE: Record<string, { label: string; className: string }> = {
  pending:   { label: "Pending",   className: "bg-yellow-100 text-yellow-800" },
  approved:  { label: "Accepted",  className: "bg-blue-100 text-blue-800" },
  delivered: { label: "Delivered", className: "bg-green-100 text-green-800" },
  cancelled: { label: "Cancelled", className: "bg-red-100 text-red-700" },
};

const TABS = [
  { key: "all",       label: "All",       dbStatus: null        },
  { key: "pending",   label: "Pending",   dbStatus: "pending"   },
  { key: "approved",  label: "Accepted",  dbStatus: "approved"  },
  { key: "delivered", label: "Delivered", dbStatus: "delivered" },
  { key: "cancelled", label: "Cancelled", dbStatus: "cancelled" },
] as const;
type TabKey = typeof TABS[number]["key"];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

// Helper: get the single product for an order (first item, since each order = 1 product)
function getProduct(order: SupplyOrder) {
  return order.items[0] ?? null;
}

// ── View Modal ────────────────────────────────────────────────────────────────

function ViewOrderModal({ order, onClose }: { order: SupplyOrder; onClose: () => void }) {
  const badge = ORDER_BADGE[order.status] ?? { label: order.status, className: "bg-gray-100 text-gray-600" };
  const product = getProduct(order);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">
        <div className="px-6 pt-6 pb-4 border-b border-gray-100 shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-0.5">
                <h2 className="text-lg font-semibold text-gray-900">Order #{order.id}</h2>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${badge.className}`}>{badge.label}</span>
              </div>
              <p className="text-sm text-gray-500">
                {order.departmentName && <span className="font-medium text-gray-700">{order.departmentName}</span>}
                {order.departmentName && " · "}Raised {formatDate(order.createdAt)}
              </p>
              {order.departmentOrderId && order.departmentOrderId !== order.id && (
                <p className="text-xs text-gray-400 mt-0.5">Part of Dept Order #{order.departmentOrderId}</p>
              )}
            </div>
            <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">Raised By</p>
              <p className="text-gray-900 font-medium">{order.requestedByFirstname} {order.requestedByLastname}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">Department</p>
              <p className="text-gray-900 font-medium">{order.departmentName ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">Order ID</p>
              <p className="text-gray-900 font-mono font-bold">#{order.id}</p>
            </div>
            {order.departmentOrderId && (
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">Dept Order ID</p>
                <p className="text-gray-900 font-mono">#{order.departmentOrderId}</p>
              </div>
            )}
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">Date Raised</p>
              <p className="text-gray-900">{formatDate(order.createdAt)}</p>
            </div>
            {order.status === "delivered" && (
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">Delivered On</p>
                <p className="text-gray-900">{formatDate(order.updatedAt)}</p>
              </div>
            )}
          </div>

          {order.notes && (
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Notes</p>
              <p className="text-sm text-gray-700 bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">{order.notes}</p>
            </div>
          )}

          {order.status === "cancelled" && order.cancellationReason && (
            <div>
              <p className="text-xs font-medium text-red-500 uppercase tracking-wide mb-1">Cancellation Reason</p>
              <p className="text-sm text-red-700 bg-red-50 rounded-lg px-3 py-2 border border-red-100">{order.cancellationReason}</p>
            </div>
          )}

          {product && (
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Product</p>
              <div className="rounded-xl border border-gray-200 overflow-hidden">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Name</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-600 uppercase tracking-wide">Qty Requested</th>
                      {order.status !== "delivered" && (
                        <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-600 uppercase tracking-wide">In Stock</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="bg-white">
                      <td className="px-4 py-3 text-gray-800 font-medium">{product.itemName ?? "—"}</td>
                      <td className="px-4 py-3 text-right text-gray-700 tabular-nums">{product.quantityRequested}</td>
                      {order.status !== "delivered" && (
                        <td className="px-4 py-3 text-right tabular-nums">
                          <span className={`font-medium ${
                            (product.itemTotalUnits ?? 0) === 0 ? "text-red-600"
                              : (product.itemTotalUnits ?? 0) < product.quantityRequested ? "text-amber-600"
                              : "text-green-600"
                          }`}>{product.itemTotalUnits ?? 0}</span>
                        </td>
                      )}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl flex justify-end shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">Close</button>
        </div>
      </div>
    </div>
  );
}

// ── Cancel Modal ──────────────────────────────────────────────────────────────

function CancelModal({ order, reason, onReasonChange, saving, error, onClose, onConfirm }: {
  order: SupplyOrder; reason: string; onReasonChange: (v: string) => void;
  saving: boolean; error: string; onClose: () => void; onConfirm: () => void;
}) {
  const product = getProduct(order);
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="px-6 py-5 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Cancel Order #{order.id}</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {product?.itemName ?? "—"} · <span className="font-medium text-gray-700">{order.departmentName ?? "—"}</span>
          </p>
        </div>
        <div className="px-6 py-5 space-y-3">
          {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Reason for cancellation <span className="text-red-500">*</span>
            </label>
            <textarea value={reason} onChange={(e) => onReasonChange(e.target.value)}
              placeholder="Explain why this order is being cancelled…" rows={3}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 resize-none" autoFocus />
          </div>
        </div>
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50">Go back</button>
          <button onClick={onConfirm} disabled={saving || !reason.trim()}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed">
            {saving ? "Cancelling…" : "Confirm Cancellation"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Mobile card — one per order ───────────────────────────────────────────────

function OrderCard({ order, actionLoading, onAccept, onDeliver, onCancel, onView }: {
  order: SupplyOrder; actionLoading: number | null;
  onAccept: (id: number) => void; onDeliver: (id: number) => void;
  onCancel: (o: SupplyOrder) => void; onView: (o: SupplyOrder) => void;
}) {
  const badge = ORDER_BADGE[order.status] ?? { label: order.status, className: "bg-gray-100 text-gray-600" };
  const busy = actionLoading === order.id;
  const product = getProduct(order);

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold text-gray-900">Order #{order.id}</span>
            {order.departmentOrderId && order.departmentOrderId !== order.id && (
              <span className="text-xs text-gray-400 font-mono">Dept #{order.departmentOrderId}</span>
            )}
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${badge.className}`}>{badge.label}</span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5 truncate">{order.departmentName ?? "—"} · {formatDate(order.createdAt)}</p>
        </div>
      </div>

      {product && (
        <div className="flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg bg-gray-50 border border-gray-100">
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-800 truncate">{product.itemName ?? "—"}</p>
            <p className="text-xs text-gray-400 mt-0.5">Qty: {product.quantityRequested}</p>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-gray-100">
        {order.status === "pending" && (
          <>
            <button onClick={() => onAccept(order.id)} disabled={busy}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
              <CheckCircleIcon className="h-3.5 w-3.5" />{busy ? "…" : "Accept"}
            </button>
            <button onClick={() => onCancel(order)} disabled={busy}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 disabled:opacity-50 transition-colors">
              <XCircleIcon className="h-3.5 w-3.5" />Cancel
            </button>
          </>
        )}
        {order.status === "approved" && (
          <button onClick={() => onDeliver(order.id)} disabled={busy}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors">
            <TruckIcon className="h-3.5 w-3.5" />{busy ? "Processing…" : "Deliver"}
          </button>
        )}
        <button onClick={() => onView(order)}
          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors ml-auto">
          <EyeIcon className="h-3.5 w-3.5" />View
        </button>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SupplyOrdersPage() {
  const [tab, setTab] = useState<TabKey>("all");
  const [viewOrder, setViewOrder] = useState<SupplyOrder | null>(null);
  const [cancelOrder, setCancelOrder] = useState<SupplyOrder | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelSaving, setCancelSaving] = useState(false);
  const [cancelError, setCancelError] = useState("");
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const activeTab = TABS.find((t) => t.key === tab)!;

  const url = useMemo(() => {
    if (activeTab.dbStatus) return `/api/inventory/orders?status=${activeTab.dbStatus}`;
    return "/api/inventory/orders";
  }, [activeTab]);

  const { data: orders, isLoading, mutate } = useSWR<SupplyOrder[]>(url, fetcher);
  const { data: allRaw, mutate: mutateAll } = useSWR<SupplyOrder[]>("/api/inventory/orders", fetcher);

  const counts = useMemo(() => {
    const all = allRaw ?? [];
    return {
      all:       all.length,
      pending:   all.filter((o) => o.status === "pending").length,
      approved:  all.filter((o) => o.status === "approved").length,
      delivered: all.filter((o) => o.status === "delivered").length,
      cancelled: all.filter((o) => o.status === "cancelled").length,
    };
  }, [allRaw]);

  const displayOrders = orders ?? [];
  const revalidate = () => { mutate(); mutateAll(); };

  // PATCH orderId → approved
  const handleAccept = async (orderId: number) => {
    setActionLoading(orderId);
    try {
      const res = await fetch(`/api/inventory/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "approved" }),
      });
      if (res.ok) revalidate();
    } finally { setActionLoading(null); }
  };

  // PATCH orderId → delivered (depletes stock for that order's item)
  const handleDeliver = async (orderId: number) => {
    setActionLoading(orderId);
    try {
      const res = await fetch(`/api/inventory/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "delivered" }),
      });
      if (res.ok) revalidate();
    } finally { setActionLoading(null); }
  };

  const openCancel = (order: SupplyOrder) => { setCancelOrder(order); setCancelReason(""); setCancelError(""); };

  const handleCancel = async () => {
    if (!cancelOrder) return;
    if (!cancelReason.trim()) { setCancelError("Please provide a reason for cancellation."); return; }
    setCancelSaving(true); setCancelError("");
    try {
      const res = await fetch(`/api/inventory/orders/${cancelOrder.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "cancelled", cancellationReason: cancelReason }),
      });
      if (res.ok) { revalidate(); setCancelOrder(null); }
      else { const d = await res.json(); setCancelError(d.error ?? "Failed to cancel order."); }
    } finally { setCancelSaving(false); }
  };

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Supply Orders</h1>
        <p className="text-gray-500 text-sm mt-1">Every product line has its own Order ID — accept, deliver, or cancel independently</p>
      </div>

      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-1 overflow-x-auto scrollbar-none">
          {TABS.map((t) => {
            const count = counts[t.key as keyof typeof counts];
            return (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                  tab === t.key ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}>
                {t.label}
                {count > 0 && (
                  <span className={`inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-semibold ${
                    tab === t.key ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"
                  }`}>{count}</span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : displayOrders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
            <TruckIcon className="w-6 h-6 text-gray-400" />
          </div>
          <p className="text-sm font-medium text-gray-600">No orders found</p>
          <p className="text-xs text-gray-400 mt-1 max-w-xs">
            {tab === "pending" ? "No orders currently pending"
              : tab === "approved" ? "No accepted orders awaiting delivery"
              : tab !== "all" ? `No ${TABS.find((t) => t.key === tab)?.label.toLowerCase()} orders`
              : "No orders have been raised yet"}
          </p>
        </div>
      ) : (
        <>
          {/* Desktop table — one row per order */}
          <div className="hidden sm:block bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Order ID</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Dept Order ID</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Department</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Product</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Qty</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Status</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Date Raised</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {displayOrders.map((order) => {
                    const badge = ORDER_BADGE[order.status] ?? { label: order.status, className: "bg-gray-100 text-gray-600" };
                    const busy = actionLoading === order.id;
                    const product = getProduct(order);

                    return (
                      <tr key={order.id} className="hover:bg-gray-50/50 transition-colors">

                        {/* Order ID */}
                        <td className="px-5 py-4 whitespace-nowrap">
                          <span className="text-sm font-bold text-gray-900 font-mono">#{order.id}</span>
                        </td>

                        {/* Dept Order ID */}
                        <td className="px-5 py-4 whitespace-nowrap">
                          {order.departmentOrderId
                            ? <span className="text-sm text-gray-500 font-mono">#{order.departmentOrderId}</span>
                            : <span className="text-gray-300">—</span>}
                        </td>

                        {/* Department */}
                        <td className="px-5 py-4 text-sm text-gray-700 whitespace-nowrap">
                          {order.departmentName ?? "—"}
                        </td>

                        {/* Product */}
                        <td className="px-5 py-4">
                          <span className="text-sm font-medium text-gray-800">
                            {product?.itemName ?? <span className="text-gray-400 italic text-xs">No product</span>}
                          </span>
                        </td>

                        {/* Qty */}
                        <td className="px-5 py-4 text-sm text-gray-600 tabular-nums whitespace-nowrap">
                          {product?.quantityRequested ?? "—"}
                        </td>

                        {/* Status */}
                        <td className="px-5 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${badge.className}`}>
                            {badge.label}
                          </span>
                        </td>

                        {/* Date */}
                        <td className="px-5 py-4 text-sm text-gray-600 whitespace-nowrap">
                          {formatDate(order.createdAt)}
                        </td>

                        {/* Actions — full set on every row */}
                        <td className="px-5 py-4">
                          <div className="flex items-center justify-end gap-2 flex-wrap">
                            {order.status === "pending" && (
                              <>
                                <button onClick={() => handleAccept(order.id)} disabled={busy}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors whitespace-nowrap">
                                  <CheckCircleIcon className="h-3.5 w-3.5" />{busy ? "…" : "Accept"}
                                </button>
                                <button onClick={() => openCancel(order)} disabled={busy}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 disabled:opacity-50 transition-colors whitespace-nowrap">
                                  <XCircleIcon className="h-3.5 w-3.5" />Cancel
                                </button>
                              </>
                            )}
                            {order.status === "approved" && (
                              <button onClick={() => handleDeliver(order.id)} disabled={busy}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors whitespace-nowrap">
                                <TruckIcon className="h-3.5 w-3.5" />{busy ? "Processing…" : "Deliver"}
                              </button>
                            )}
                            <button onClick={() => setViewOrder(order)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors whitespace-nowrap">
                              <EyeIcon className="h-3.5 w-3.5" />View
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile — one card per order */}
          <div className="sm:hidden space-y-3">
            {displayOrders.map((order) => (
              <OrderCard key={order.id} order={order} actionLoading={actionLoading}
                onAccept={handleAccept} onDeliver={handleDeliver}
                onCancel={openCancel} onView={setViewOrder} />
            ))}
          </div>
        </>
      )}

      {viewOrder && <ViewOrderModal order={viewOrder} onClose={() => setViewOrder(null)} />}
      {cancelOrder && (
        <CancelModal order={cancelOrder} reason={cancelReason} onReasonChange={setCancelReason}
          saving={cancelSaving} error={cancelError}
          onClose={() => setCancelOrder(null)} onConfirm={handleCancel} />
      )}
    </div>
  );
}

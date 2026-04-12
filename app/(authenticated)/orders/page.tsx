"use client";

/**
 * /orders — Department view
 *
 * Layout:
 *   Desktop → full table
 *   Mobile  → stacked cards
 *
 * Actions:
 *   pending  → Accept, Edit, View
 *   other    → View only (Edit + Accept hidden)
 *
 * Department scoping:
 *   Dept users see only their dept; modal pre-selects dept (locked).
 *   Superadmin / no-dept users see all orders; modal has full dept picker.
 */

import { useState, useMemo } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import RaiseOrderModal from "../inventory/components/RaiseOrderModal";
import EditOrderModal from "../inventory/components/EditOrderModal";
import {
  PlusIcon,
  CheckCircleIcon,
  EyeIcon,
  PencilSquareIcon,
} from "@heroicons/react/24/outline";

// ── Types ─────────────────────────────────────────────────────────────────────

interface OrderItem {
  id: number;
  productId: number | null;
  quantityRequested: number;
  itemName: string | null;
  itemTotalUnits: number | null;
}

interface SupplyOrder {
  id: number;
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

interface CurrentUser {
  id: number;
  userrole: string | null;
  departmentId: number | null;
  departmentName: string | null;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  pending:   { label: "Pending",   className: "bg-yellow-100 text-yellow-800" },
  approved:  { label: "Accepted",  className: "bg-blue-100 text-blue-800" },
  delivered: { label: "Delivered", className: "bg-green-100 text-green-800" },
  cancelled: { label: "Cancelled", className: "bg-red-100 text-red-700" },
};

const TABS = ["all", "pending", "approved", "delivered", "cancelled"] as const;
const TAB_LABELS: Record<string, string> = {
  all: "All", pending: "Pending", approved: "Accepted",
  delivered: "Delivered", cancelled: "Cancelled",
};
type Tab = typeof TABS[number];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

function isSuperAdmin(user: CurrentUser | undefined): boolean {
  if (!user) return false;
  return (user.userrole ?? "").toLowerCase().includes("super") || !user.departmentId;
}

// ── View Modal ────────────────────────────────────────────────────────────────

function ViewOrderModal({
  order,
  onClose,
}: {
  order: SupplyOrder;
  onClose: () => void;
}) {
  const badge = STATUS_BADGE[order.status] ?? {
    label: order.status,
    className: "bg-gray-100 text-gray-600",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-gray-100 shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-0.5">
                <h2 className="text-lg font-semibold text-gray-900">Order #{order.id}</h2>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${badge.className}`}>
                  {badge.label}
                </span>
              </div>
              <p className="text-sm text-gray-500">
                {order.departmentName && (
                  <span className="font-medium text-gray-700">{order.departmentName}</span>
                )}
                {order.departmentName && " · "}
                Raised {formatDate(order.createdAt)}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors shrink-0"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5 overflow-y-auto flex-1">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">Raised By</p>
              <p className="text-gray-900 font-medium">
                {order.requestedByFirstname} {order.requestedByLastname}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">Department</p>
              <p className="text-gray-900 font-medium">{order.departmentName ?? "—"}</p>
            </div>
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
              <p className="text-sm text-gray-700 bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
                {order.notes}
              </p>
            </div>
          )}

          {order.status === "cancelled" && order.cancellationReason && (
            <div>
              <p className="text-xs font-medium text-red-500 uppercase tracking-wide mb-1">Cancellation Reason</p>
              <p className="text-sm text-red-700 bg-red-50 rounded-lg px-3 py-2 border border-red-100">
                {order.cancellationReason}
              </p>
            </div>
          )}

          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
              Products ({order.items.length})
            </p>
            {order.items.length === 0 ? (
              <p className="text-sm text-gray-400">No items recorded.</p>
            ) : (
              <div className="rounded-xl border border-gray-200 overflow-hidden">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Product</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-600 uppercase tracking-wide">Qty Requested</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {order.items.map((item, i) => (
                      <tr key={item.id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                        <td className="px-4 py-3 text-gray-800 font-medium">{item.itemName ?? "—"}</td>
                        <td className="px-4 py-3 text-right text-gray-700 tabular-nums">{item.quantityRequested} units</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Order Card (mobile) ───────────────────────────────────────────────────────

function OrderCard({
  order,
  isAdmin,
  actionLoading,
  onAccept,
  onEdit,
  onView,
}: {
  order: SupplyOrder;
  isAdmin: boolean;
  actionLoading: number | null;
  onAccept: (id: number) => void;
  onEdit: (order: SupplyOrder) => void;
  onView: (order: SupplyOrder) => void;
}) {
  const badge = STATUS_BADGE[order.status] ?? {
    label: order.status,
    className: "bg-gray-100 text-gray-600",
  };
  const loading = actionLoading === order.id;
  const isPending = order.status === "pending";

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 space-y-3">
      {/* Top row */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-bold text-gray-900">Order #{order.id}</p>
          {isAdmin && (
            <p className="text-xs text-gray-500 mt-0.5 truncate">{order.departmentName ?? "—"}</p>
          )}
          <p className="text-xs text-gray-400 mt-0.5">
            {order.requestedByFirstname} {order.requestedByLastname} · {formatDate(order.createdAt)}
          </p>
        </div>
        <span className={`inline-flex shrink-0 items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${badge.className}`}>
          {badge.label}
        </span>
      </div>

      {/* Product chips */}
      <div className="flex flex-wrap gap-1.5">
        {order.items.length === 0 ? (
          <span className="text-xs text-gray-400">No items</span>
        ) : (
          order.items.map((item) => (
            <span
              key={item.id}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gray-100 text-xs text-gray-700 font-medium"
            >
              {item.itemName ?? "Unknown"}
              <span className="text-gray-400">×{item.quantityRequested}</span>
            </span>
          ))
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-gray-100">
        {isPending && (
          <>
            <button
              onClick={() => onAccept(order.id)}
              disabled={loading}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              <CheckCircleIcon className="h-3.5 w-3.5" />
              {loading ? "…" : "Accept"}
            </button>
            <button
              onClick={() => onEdit(order)}
              disabled={loading}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              <PencilSquareIcon className="h-3.5 w-3.5" />
              Edit
            </button>
          </>
        )}
        <button
          onClick={() => onView(order)}
          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors ml-auto"
        >
          <EyeIcon className="h-3.5 w-3.5" />
          View
        </button>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function OrdersPage() {
  const [tab, setTab] = useState<Tab>("all");
  const [raiseOpen, setRaiseOpen] = useState(false);
  const [viewOrder, setViewOrder] = useState<SupplyOrder | null>(null);
  const [editOrder, setEditOrder] = useState<SupplyOrder | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const { data: currentUser } = useSWR<CurrentUser>("/api/wai", fetcher, {
    shouldRetryOnError: false,
    revalidateOnFocus: false,
    dedupingInterval: 60000,
  });

  const userDeptId = currentUser?.departmentId ?? null;
  const userDeptName = currentUser?.departmentName ?? null;
  const isAdmin = isSuperAdmin(currentUser);

  const apiUrl = useMemo(() => {
    const p = new URLSearchParams();
    if (userDeptId) p.set("departmentId", String(userDeptId));
    if (tab !== "all") p.set("status", tab);
    return `/api/inventory/orders?${p.toString()}`;
  }, [userDeptId, tab]);

  const { data: orders, isLoading, mutate } = useSWR<SupplyOrder[]>(apiUrl, fetcher);

  const allUrl = useMemo(() => {
    const p = new URLSearchParams();
    if (userDeptId) p.set("departmentId", String(userDeptId));
    return `/api/inventory/orders?${p.toString()}`;
  }, [userDeptId]);

  const { data: allOrders, mutate: mutateAll } = useSWR<SupplyOrder[]>(allUrl, fetcher);

  const counts = useMemo(() => {
    const all = allOrders ?? [];
    return {
      all: all.length,
      pending:   all.filter((o) => o.status === "pending").length,
      approved:  all.filter((o) => o.status === "approved").length,
      delivered: all.filter((o) => o.status === "delivered").length,
      cancelled: all.filter((o) => o.status === "cancelled").length,
    };
  }, [allOrders]);

  const pageTitle = userDeptName ? `${userDeptName} Orders` : "Orders";
  const revalidate = () => { mutate(); mutateAll(); };

  const handleAccept = async (orderId: number) => {
    setActionLoading(orderId);
    try {
      const res = await fetch(`/api/inventory/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "approved" }),
      });
      if (res.ok) revalidate();
    } finally {
      setActionLoading(null);
    }
  };

  if (!currentUser) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  const displayOrders = orders ?? [];

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-gray-900 truncate">{pageTitle}</h1>
          <p className="text-gray-500 text-sm mt-1">
            {userDeptName
              ? `Supply orders for the ${userDeptName} department`
              : "Supply orders across all departments"}
          </p>
        </div>
        <button
          onClick={() => setRaiseOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-sm transition-colors shrink-0"
        >
          <PlusIcon className="h-4 w-4" />
          <span className="hidden sm:inline">New Order</span>
          <span className="sm:hidden">New</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-1 overflow-x-auto scrollbar-none">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                tab === t
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              {TAB_LABELS[t]}
              {counts[t] > 0 && (
                <span className={`inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-semibold ${
                  tab === t ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"
                }`}>
                  {counts[t]}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : displayOrders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-600">No orders found</p>
          <p className="text-xs text-gray-400 mt-1 max-w-xs">
            {tab !== "all"
              ? `No ${TAB_LABELS[tab].toLowerCase()} orders`
              : "No orders have been raised yet"}
            {userDeptName && ` for ${userDeptName}`}
          </p>
        </div>
      ) : (
        <>
          {/* ── Desktop table (sm+) ── */}
          <div className="hidden sm:block bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Order #</th>
                    {isAdmin && (
                      <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Department</th>
                    )}
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Products</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Status</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Date Raised</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {displayOrders.map((order) => {
                    const badge = STATUS_BADGE[order.status] ?? {
                      label: order.status,
                      className: "bg-gray-100 text-gray-600",
                    };
                    const loading = actionLoading === order.id;
                    const isPending = order.status === "pending";

                    return (
                      <tr key={order.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-5 py-4 text-sm font-bold text-gray-900 whitespace-nowrap">
                          #{order.id}
                        </td>
                        {isAdmin && (
                          <td className="px-5 py-4 text-sm text-gray-700 whitespace-nowrap">
                            {order.departmentName ?? "—"}
                          </td>
                        )}
                        <td className="px-5 py-4">
                          <div className="flex flex-wrap gap-1.5 max-w-xs">
                            {order.items.length === 0 ? (
                              <span className="text-xs text-gray-400">No items</span>
                            ) : (
                              order.items.map((item) => (
                                <span
                                  key={item.id}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gray-100 text-xs text-gray-700 font-medium whitespace-nowrap"
                                >
                                  {item.itemName ?? "Unknown"}
                                  <span className="text-gray-400">×{item.quantityRequested}</span>
                                </span>
                              ))
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${badge.className}`}>
                            {badge.label}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-sm text-gray-600 whitespace-nowrap">
                          {formatDate(order.createdAt)}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center justify-end gap-2">
                            {isPending && (
                              <button
                                onClick={() => handleAccept(order.id)}
                                disabled={loading}
                                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors whitespace-nowrap"
                              >
                                <CheckCircleIcon className="h-3.5 w-3.5" />
                                {loading ? "…" : "Accept"}
                              </button>
                            )}
                            {isPending && (
                              <button
                                onClick={() => setEditOrder(order)}
                                disabled={loading}
                                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors whitespace-nowrap"
                              >
                                <PencilSquareIcon className="h-3.5 w-3.5" />
                                Edit
                              </button>
                            )}
                            <button
                              onClick={() => setViewOrder(order)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors whitespace-nowrap"
                            >
                              <EyeIcon className="h-3.5 w-3.5" />
                              View
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

          {/* ── Mobile cards (< sm) ── */}
          <div className="sm:hidden space-y-3">
            {displayOrders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                isAdmin={isAdmin}
                actionLoading={actionLoading}
                onAccept={handleAccept}
                onEdit={setEditOrder}
                onView={setViewOrder}
              />
            ))}
          </div>
        </>
      )}

      {/* Raise Order Modal */}
      <RaiseOrderModal
        open={raiseOpen}
        departmentId={userDeptId ?? undefined}
        onClose={() => setRaiseOpen(false)}
        onSuccess={revalidate}
      />

      {/* Edit Order Modal */}
      <EditOrderModal
        order={editOrder}
        onClose={() => setEditOrder(null)}
        onSuccess={() => { revalidate(); setEditOrder(null); }}
      />

      {/* View Order Modal */}
      {viewOrder && (
        <ViewOrderModal order={viewOrder} onClose={() => setViewOrder(null)} />
      )}
    </div>
  );
}

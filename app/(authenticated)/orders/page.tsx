"use client";

/**
 * /orders — Department view
 *
 * Actions:
 *   pending  → Edit, View
 *   other    → View only
 *
 * Department scoping is role-based (lib/supplyOrders.ts): roles with Supply
 * Orders view see every department and can filter by one; everyone else sees
 * only their own department (enforced by the API). Orders can also be
 * filtered by the date they were raised.
 */

import { useState, useMemo } from "react";
import useSWR from "swr";
import { createColumnHelper } from "@tanstack/react-table";
import { fetcher } from "@/lib/fetcher";
import Table from "@/app/components/ui/Table";
import { useDateRange } from "@/lib/hooks/useDateRange";
import { canViewAllDepartmentOrders } from "@/lib/supplyOrders";
import OrdersFilterBar from "../inventory/components/OrdersFilterBar";
import RaiseOrderModal from "../inventory/components/RaiseOrderModal";
import EditOrderModal from "../inventory/components/EditOrderModal";
import {
  PlusIcon,
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
  departmentStatus: string;
  supplyStatus: string;
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
  permissions: Record<string, unknown> | null;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  pending: { label: "Pending", className: "bg-yellow-100 text-yellow-800" },
  accepted: { label: "Accepted", className: "bg-blue-100 text-blue-800" },
  delivered: { label: "Delivered", className: "bg-green-100 text-green-800" },
  cancelled: { label: "Cancelled", className: "bg-red-100 text-red-700" },
};

const TABS = ["all", "pending", "accepted", "delivered", "cancelled"] as const;
const TAB_LABELS: Record<string, string> = {
  all: "All",
  pending: "Pending",
  accepted: "Accepted",
  delivered: "Delivered",
  cancelled: "Cancelled",
};
type Tab = (typeof TABS)[number];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// ── View Modal ────────────────────────────────────────────────────────────────

function ViewOrderModal({
  order,
  onClose,
}: {
  order: SupplyOrder;
  onClose: () => void;
}) {
  const badge = STATUS_BADGE[order.supplyStatus] ?? {
    label: order.supplyStatus,
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
                <h2 className="text-lg font-semibold text-gray-900">
                  Order #{order.id}
                </h2>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${badge.className}`}
                >
                  {badge.label}
                </span>
              </div>
              <p className="text-sm text-gray-500">
                {order.departmentName && (
                  <span className="font-medium text-gray-700">
                    {order.departmentName}
                  </span>
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
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5 overflow-y-auto flex-1">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">
                Raised By
              </p>
              <p className="text-gray-900 font-medium">
                {order.requestedByFirstname} {order.requestedByLastname}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">
                Department
              </p>
              <p className="text-gray-900 font-medium">
                {order.departmentName ?? "—"}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">
                Date Raised
              </p>
              <p className="text-gray-900">{formatDate(order.createdAt)}</p>
            </div>
            {order.supplyStatus === "delivered" && (
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">
                  Delivered On
                </p>
                <p className="text-gray-900">{formatDate(order.updatedAt)}</p>
              </div>
            )}
          </div>

          {order.notes && (
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                Notes
              </p>
              <p className="text-sm text-gray-700 bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
                {order.notes}
              </p>
            </div>
          )}

          {order.supplyStatus === "cancelled" && order.cancellationReason && (
            <div>
              <p className="text-xs font-medium text-red-500 uppercase tracking-wide mb-1">
                Cancellation Reason
              </p>
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
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                        Product
                      </th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-600 uppercase tracking-wide">
                        Qty Requested
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {order.items.map((item, i) => (
                      <tr
                        key={item.id}
                        className={i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}
                      >
                        <td className="px-4 py-3 text-gray-800 font-medium">
                          {item.itemName ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-700 tabular-nums">
                          {item.quantityRequested} units
                        </td>
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

// ── Page ──────────────────────────────────────────────────────────────────────

const columnHelper = createColumnHelper<SupplyOrder>();

export default function OrdersPage() {
  const [tab, setTab] = useState<Tab>("all");
  const [raiseOpen, setRaiseOpen] = useState(false);
  const [viewOrder, setViewOrder] = useState<SupplyOrder | null>(null);
  const [editOrder, setEditOrder] = useState<SupplyOrder | null>(null);
  const [departmentId, setDepartmentId] = useState<number | "">("");
  const { range, setRange, apiUrl } = useDateRange("all");

  const { data: currentUser } = useSWR<CurrentUser>("/api/wai", fetcher, {
    shouldRetryOnError: false,
    revalidateOnFocus: false,
    dedupingInterval: 60000,
  });

  const userDeptId = currentUser?.departmentId ?? null;
  // Supply team (Supply Orders view) sees every department; others only theirs.
  const seesAll = canViewAllDepartmentOrders(currentUser?.permissions);
  const userDeptName = seesAll ? null : currentUser?.departmentName ?? null;

  // One request for the current department/date filters; the status tabs and
  // their counts are worked out from it.
  const url = useMemo(() => {
    const p = new URLSearchParams();
    if (seesAll && departmentId) p.set("departmentId", String(departmentId));
    const qs = p.toString();
    return apiUrl(`/api/inventory/orders${qs ? `?${qs}` : ""}`);
  }, [seesAll, departmentId, apiUrl]);
  const { data: allOrders, isLoading, mutate } = useSWR<SupplyOrder[]>(currentUser ? url : null, fetcher);

  const counts = useMemo(() => {
    const all = allOrders ?? [];
    return {
      all: all.length,
      pending: all.filter((o) => o.supplyStatus === "pending").length,
      accepted: all.filter((o) => o.supplyStatus === "accepted").length,
      delivered: all.filter((o) => o.supplyStatus === "delivered").length,
      cancelled: all.filter((o) => o.supplyStatus === "cancelled").length,
    };
  }, [allOrders]);

  const displayOrders = useMemo(
    () => (tab === "all" ? allOrders ?? [] : (allOrders ?? []).filter((o) => o.supplyStatus === tab)),
    [allOrders, tab],
  );

  const columns = useMemo(
    () => [
      columnHelper.accessor("id", {
        header: "Order #",
        cell: (info) => <span className="font-bold text-gray-900">#{info.getValue()}</span>,
      }),
      ...(seesAll
        ? [
            columnHelper.accessor((o) => o.departmentName ?? "", {
              id: "department",
              header: "Department",
              cell: (info) => info.getValue() || "—",
            }),
          ]
        : []),
      columnHelper.accessor((o) => o.items.map((i) => i.itemName ?? "").join(", "), {
        id: "products",
        header: "Products",
        enableSorting: false,
        cell: (info) => {
          const items = info.row.original.items;
          if (items.length === 0) return <span className="text-xs text-gray-400">No items</span>;
          return (
            <div className="flex max-w-xs flex-wrap gap-1.5 normal-case">
              {items.map((item) => (
                <span key={item.id} className="inline-flex items-center gap-1 whitespace-nowrap rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                  {item.itemName ?? "Unknown"}
                  <span className="text-gray-400">×{item.quantityRequested}</span>
                </span>
              ))}
            </div>
          );
        },
      }),
      columnHelper.accessor("supplyStatus", {
        header: "Status",
        cell: (info) => {
          const badge = STATUS_BADGE[info.getValue()] ?? { label: info.getValue(), className: "bg-gray-100 text-gray-600" };
          return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${badge.className}`}>{badge.label}</span>;
        },
      }),
      columnHelper.accessor("createdAt", {
        header: "Date Raised",
        sortingFn: "datetime",
        cell: (info) => <span className="text-gray-600">{formatDate(info.getValue())}</span>,
      }),
      columnHelper.display({
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
          const order = row.original;
          return (
            <div className="flex items-center justify-end gap-2">
              {order.supplyStatus === "pending" && (
                <button
                  onClick={() => setEditOrder(order)}
                  className="inline-flex items-center gap-1 whitespace-nowrap rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50"
                >
                  <PencilSquareIcon className="h-3.5 w-3.5" />
                  Edit
                </button>
              )}
              <button
                onClick={() => setViewOrder(order)}
                className="inline-flex items-center gap-1 whitespace-nowrap rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-500 transition-colors hover:bg-gray-200 hover:text-gray-700"
              >
                <EyeIcon className="h-3.5 w-3.5" />
                View
              </button>
            </div>
          );
        },
      }),
    ],
    [seesAll],
  );

  if (!currentUser) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  const pageTitle = userDeptName ? `${userDeptName} Orders` : "Orders";

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-gray-900 truncate">{pageTitle}</h1>
          <p className="text-gray-500 text-sm mt-1">
            {userDeptName
              ? `Supply orders for the ${userDeptName} department`
              : seesAll
                ? "Supply orders across all departments"
                : "Your account isn't assigned to a department, so there are no orders to show"}
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

      <OrdersFilterBar
        range={range}
        onRangeChange={setRange}
        showDepartment={seesAll}
        departmentId={departmentId}
        onDepartmentChange={setDepartmentId}
      />

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
                <span
                  className={`inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-semibold ${
                    tab === t ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"
                  }`}
                >
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
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center">
          <p className="text-sm font-medium text-gray-600">No orders found</p>
          <p className="text-xs text-gray-400 mt-1">
            {tab !== "all" ? `No ${(TAB_LABELS[tab] ?? tab).toLowerCase()} orders` : "No orders match these filters"}
            {userDeptName && ` for ${userDeptName}`}
          </p>
        </div>
      ) : (
        <Table data={displayOrders} columns={columns} />
      )}

      {/* Raise Order Modal */}
      <RaiseOrderModal
        open={raiseOpen}
        departmentId={userDeptId ?? undefined}
        onClose={() => setRaiseOpen(false)}
        onSuccess={() => mutate()}
      />

      {/* Edit Order Modal */}
      <EditOrderModal
        order={editOrder}
        onClose={() => setEditOrder(null)}
        onSuccess={() => {
          mutate();
          setEditOrder(null);
        }}
      />

      {/* View Order Modal */}
      {viewOrder && <ViewOrderModal order={viewOrder} onClose={() => setViewOrder(null)} />}
    </div>
  );
}

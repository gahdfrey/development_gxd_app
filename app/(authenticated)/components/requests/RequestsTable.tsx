"use client";

import { useMemo } from "react";
import { createColumnHelper } from "@tanstack/react-table";
import Table from "@/app/components/ui/Table";

export interface RequestRow {
  id: number;
  status: string;
  paymentStatus: string;
  createdAt: string | Date;
  patientFirstname: string | null;
  patientLastname: string | null;
  departmentName: string | null;
  testName: string | null;
  testPrice: number | null;
  requestedByFirstname: string | null;
  requestedByLastname: string | null;
}

interface RequestsTableProps {
  data: RequestRow[];
  /** If true, renders a "Mark as Paid / Mark as Unpaid" action button (finance module) */
  showPaymentToggle?: boolean;
  onTogglePayment?: (id: number, current: string) => void;
  updatingId?: number | null;
}

export default function RequestsTable({
  data,
  showPaymentToggle = false,
  onTogglePayment,
  updatingId,
}: RequestsTableProps) {
  const columnHelper = createColumnHelper<RequestRow>();

  const columns = useMemo(
    () => [
      columnHelper.accessor(
        (row) =>
          `${row.patientFirstname ?? ""} ${row.patientLastname ?? ""}`.trim(),
        {
          id: "patient",
          header: "Patient Name",
          cell: (info) => (
            <span className="font-medium text-gray-900">{info.getValue() || "—"}</span>
          ),
        },
      ),
      columnHelper.accessor("createdAt", {
        header: "Date Requested",
        cell: (info) => (
          <span className="text-gray-600 text-sm">
            {new Date(info.getValue()).toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })}
          </span>
        ),
      }),
      columnHelper.accessor(
        (row) =>
          `${row.requestedByFirstname ?? ""} ${row.requestedByLastname ?? ""}`.trim(),
        {
          id: "doctor",
          header: "Doctor",
          cell: (info) => (
            <span className="text-gray-700">{info.getValue() || "—"}</span>
          ),
        },
      ),
      columnHelper.accessor("testName", {
        header: "Test",
        cell: (info) => (
          <span className="text-gray-700">{info.getValue() ?? "—"}</span>
        ),
      }),
      columnHelper.accessor("testPrice", {
        header: "Price (₦)",
        cell: (info) => {
          const price = info.getValue();
          return (
            <span className="font-medium text-gray-900">
              {price != null ? `₦${price.toLocaleString()}` : "—"}
            </span>
          );
        },
      }),
      columnHelper.accessor("paymentStatus", {
        header: "Payment Status",
        cell: (info) => {
          const status = info.getValue();
          const isPaid = status === "paid";
          return (
            <span
              className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                isPaid
                  ? "bg-green-100 text-green-800 border border-green-300"
                  : "bg-red-100 text-red-800 border border-red-300"
              }`}
            >
              {isPaid ? "Paid" : "Not Paid"}
            </span>
          );
        },
      }),
      ...(showPaymentToggle
        ? [
            columnHelper.display({
              id: "actions",
              header: "Actions",
              cell: (props) => {
                const row = props.row.original;
                const isPaid = row.paymentStatus === "paid";
                const isUpdating = updatingId === row.id;
                return (
                  <button
                    onClick={() => onTogglePayment?.(row.id, row.paymentStatus)}
                    disabled={isUpdating}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                      isPaid
                        ? "bg-red-50 text-red-700 border border-red-300 hover:bg-red-100"
                        : "bg-green-50 text-green-700 border border-green-300 hover:bg-green-100"
                    }`}
                  >
                    {isUpdating ? "Updating..." : isPaid ? "Mark Unpaid" : "Mark Paid"}
                  </button>
                );
              },
            }),
          ]
        : []),
    ],
    [showPaymentToggle, updatingId, onTogglePayment],
  );

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center">
        <p className="text-gray-500">No requests found.</p>
      </div>
    );
  }

  return <Table data={data} columns={columns} />;
}

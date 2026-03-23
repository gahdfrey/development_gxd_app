"use client";

import { useMemo, useState } from "react";
import { createColumnHelper } from "@tanstack/react-table";
import Table from "@/app/components/ui/Table";
import UploadResultModal from "./UploadResultModal";
import { CheckCircleIcon, LockClosedIcon } from "@heroicons/react/24/outline";

export interface RequestRow {
  id: number;
  status: string;
  paymentStatus: string;
  hasResult: boolean;
  createdAt: string | Date;
  patientId: number | null;
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
  /** Finance module: one-way mark as paid */
  showPaymentToggle?: boolean;
  onMarkPaid?: (id: number) => void;
  updatingId?: number | null;
  /** Lab / Radiography modules: show Upload Result button for paid rows */
  showUploadResult?: boolean;
  onUploadSuccess?: () => void;
}

export default function RequestsTable({
  data,
  showPaymentToggle = false,
  onMarkPaid,
  updatingId,
  showUploadResult = false,
  onUploadSuccess,
}: RequestsTableProps) {
  const columnHelper = createColumnHelper<RequestRow>();

  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState<RequestRow | null>(null);
  // Tracks which row is showing the inline "confirm payment" prompt
  const [confirmingId, setConfirmingId] = useState<number | null>(null);

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
      // Finance: one-way mark as paid
      ...(showPaymentToggle
        ? [
            columnHelper.display({
              id: "actions",
              header: "Actions",
              cell: (props) => {
                const row = props.row.original;
                const isPaid = row.paymentStatus === "paid";
                const isUpdating = updatingId === row.id;
                const isConfirming = confirmingId === row.id;

                // Already paid — show a locked finalised badge
                if (isPaid) {
                  return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-green-700 bg-green-50 border border-green-200 rounded-lg cursor-default select-none">
                      <CheckCircleIcon className="h-3.5 w-3.5" />
                      Paid
                      <LockClosedIcon className="h-3 w-3 text-green-400 ml-0.5" />
                    </span>
                  );
                }

                // Confirming step — ask before making the irreversible change
                if (isConfirming) {
                  return (
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-gray-600 whitespace-nowrap">
                        Confirm payment?
                      </span>
                      <button
                        onClick={() => {
                          setConfirmingId(null);
                          onMarkPaid?.(row.id);
                        }}
                        disabled={isUpdating}
                        className="px-2.5 py-1 text-xs font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                      >
                        Yes
                      </button>
                      <button
                        onClick={() => setConfirmingId(null)}
                        disabled={isUpdating}
                        className="px-2.5 py-1 text-xs font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
                      >
                        No
                      </button>
                    </div>
                  );
                }

                // Default: "Mark as Paid" button
                return (
                  <button
                    onClick={() => setConfirmingId(row.id)}
                    disabled={isUpdating}
                    className="px-3 py-1.5 text-xs font-medium text-yellow-800 bg-yellow-50 border border-yellow-300 rounded-lg hover:bg-yellow-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isUpdating ? "Updating..." : "Mark as Paid"}
                  </button>
                );
              },
            }),
          ]
        : []),
      // Lab / Radiography: upload result when paid
      ...(showUploadResult
        ? [
            columnHelper.display({
              id: "actions",
              header: "Actions",
              cell: (props) => {
                const row = props.row.original;
                const isPaid = row.paymentStatus === "paid";
                if (!isPaid) return null;
                if (row.hasResult) {
                  return (
                    <span className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-600 text-white border border-blue-600">
                      Result Sent
                    </span>
                  );
                }
                return (
                  <button
                    onClick={() => {
                      setSelectedRow(row);
                      setUploadModalOpen(true);
                    }}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg bg-yellow-50 text-yellow-800 border border-yellow-400 hover:bg-yellow-100 transition-colors"
                  >
                    Upload Result
                  </button>
                );
              },
            }),
          ]
        : []),
    ],
    [showPaymentToggle, updatingId, onMarkPaid, confirmingId, showUploadResult],
  );

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center">
        <p className="text-gray-500">No requests found.</p>
      </div>
    );
  }

  return (
    <>
      <Table data={data} columns={columns} />

      <UploadResultModal
        isOpen={uploadModalOpen}
        onClose={() => {
          setUploadModalOpen(false);
          setSelectedRow(null);
        }}
        row={selectedRow}
        onSuccess={() => {
          setUploadModalOpen(false);
          setSelectedRow(null);
          onUploadSuccess?.();
        }}
      />
    </>
  );
}

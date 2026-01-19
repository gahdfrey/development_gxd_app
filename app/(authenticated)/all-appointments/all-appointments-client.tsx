"use client";

import { useMemo, useState } from "react";
import { Session } from "next-auth";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import PermissionDenied from "@/app/components/ui/PermissionDenied";
import Table from "@/app/components/ui/Table";
import { createColumnHelper } from "@tanstack/react-table";
import {
  CalendarIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationCircleIcon,
} from "@heroicons/react/24/outline";
import { usePatientFilters } from "@/lib/hooks/usePatientFilters";

import Link from "next/link";
import StatusAppointmentsModal from "./StatusAppointmentsModal";

export interface AllAppointment {
  id: number;
  patientName: string;
  patientGender: string;
  doctorName: string;
  status: "scheduled" | "completed" | "cancelled" | "no-show";
  visitType: string;
  appointmentDate: string;
  appointmentTime: string;
  notes?: string;
  createdAt: string;
}

interface AllAppointmentsClientProps {
  session: Session;
}

const STATUS_COLORS = {
  scheduled: "bg-blue-100 text-blue-800 border-blue-300",
  completed: "bg-green-100 text-green-800 border-green-300",
  cancelled: "bg-red-100 text-red-800 border-red-300",
  "no-show": "bg-yellow-100 text-yellow-800 border-yellow-300",
};

export default function AllAppointmentsClient({
  session,
}: AllAppointmentsClientProps) {
  const { filterState, setFilters, resetFilters, queryString } =
    usePatientFilters();

  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);

  const {
    data: appointments = [],
    error,
    isLoading,
  } = useSWR<AllAppointment[]>(`/api/all-appointments${queryString}`, fetcher);

  const columnHelper = createColumnHelper<AllAppointment>();

  const columns = useMemo(
    () => [
      columnHelper.accessor("patientName", {
        header: "Patient Name",
        cell: (info) => info.getValue(),
      }),
      columnHelper.accessor("patientGender", {
        header: "Gender",
        cell: (info) => <span className="capitalize">{info.getValue()}</span>,
      }),
      columnHelper.accessor("doctorName", {
        header: "Doctor",
        cell: (info) => info.getValue(),
      }),
      columnHelper.accessor("status", {
        header: "Status",
        cell: (info) => {
          const status = info.getValue();
          return (
            <span
              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${STATUS_COLORS[status]}`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </span>
          );
        },
      }),
      columnHelper.accessor("visitType", {
        header: "Visit Type",
        cell: (info) => {
          const visitType = info.getValue();
          return (
            <span className="text-sm text-gray-700 capitalize">
              {visitType}
            </span>
          );
        },
      }),
      columnHelper.accessor("appointmentDate", {
        header: "Appointment Date",
        cell: (info) => {
          const row = info.row.original;
          const date = new Date(row.appointmentDate);
          const options: Intl.DateTimeFormatOptions = {
            year: "numeric",
            month: "short",
            day: "numeric",
          };
          return `${date.toLocaleDateString("en-US", options)} ${row.appointmentTime}`;
        },
      }),
    ],
    [],
  );

  // Check for permission error (403)
  if (
    error &&
    (error.message?.includes("Forbidden") ||
      error.message?.includes("permission"))
  ) {
    return <PermissionDenied moduleName="All Appointments" />;
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-linear-to-br from-purple-500 to-indigo-600 rounded-2xl shadow-lg">
            <CalendarIcon className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
              All Appointments
            </h1>
          </div>
        </div>
        <div className="bg-linear-to-br from-slate-50 to-gray-100 rounded-xl p-6 border border-gray-200/60 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5">
          <div className="text-right space-y-1">
            <p className="text-4xl font-bold bg-linear-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
              {appointments.length}
            </p>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Total Appointments
            </p>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {(() => {
          // Define known status configurations
          const statusConfig: Record<string, any> = {
            scheduled: {
              label: "Scheduled",
              icon: CalendarIcon,
              gradient: "from-blue-500 to-blue-600",
              bg: "bg-blue-50",
              text: "text-blue-600",
            },
            completed: {
              label: "Completed",
              icon: CheckCircleIcon,
              gradient: "from-emerald-500 to-emerald-600",
              bg: "bg-emerald-50",
              text: "text-emerald-600",
            },
            cancelled: {
              label: "Cancelled",
              icon: XCircleIcon,
              gradient: "from-red-500 to-red-600",
              bg: "bg-red-50",
              text: "text-red-600",
            },
            "no-show": {
              label: "No-Show",
              icon: ExclamationCircleIcon,
              gradient: "from-amber-500 to-amber-600",
              bg: "bg-amber-50",
              text: "text-amber-600",
            },
            // Fallback for any other statuses
            default: {
              label: "Other",
              icon: ExclamationCircleIcon,
              gradient: "from-gray-500 to-gray-600",
              bg: "bg-gray-50",
              text: "text-gray-600",
            },
          };

          // Get all unique statuses from appointments
          const allStatuses = Array.from(
            new Set([
              "scheduled",
              "completed",
              "cancelled",
              "no-show",
              ...appointments.map((a) => a.status),
            ]),
          );

          return allStatuses.map((status) => {
            const count = appointments.filter(
              (apt) => apt.status === status,
            ).length;

            const config = statusConfig[status] || {
              ...statusConfig.default,
              label: status.charAt(0).toUpperCase() + status.slice(1),
            };

            return (
              <div
                key={status}
                onClick={() => setSelectedStatus(status)}
                className="relative overflow-hidden bg-white rounded-2xl p-6 shadow-sm border border-gray-100 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 group cursor-pointer"
              >
                <div className="relative z-10 flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-1">
                      {config.label}
                    </p>
                    <h3 className="text-3xl font-bold text-gray-900">
                      {count}
                    </h3>
                  </div>
                  <div
                    className={`p-3 rounded-xl ${config.bg} ${config.text} transition-colors duration-300 group-hover:scale-110`}
                  >
                    <config.icon className="w-6 h-6" />
                  </div>
                </div>

                {/* Decorative gradient overlay */}
                <div
                  className={`absolute -right-6 -bottom-6 w-24 h-24 rounded-full opacity-10 bg-linear-to-br ${config.gradient} blur-2xl group-hover:opacity-20 transition-opacity duration-300`}
                />
              </div>
            );
          });
        })()}
      </div>

      {/* Search and Filter Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Date Range Filters */}
        <div className="flex gap-2">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              From Date
            </label>
            <input
              type="date"
              value={filterState.startDate}
              onChange={(e) => setFilters({ startDate: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              To Date
            </label>
            <input
              type="date"
              value={filterState.endDate}
              onChange={(e) => setFilters({ endDate: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
            />
          </div>
        </div>

        {/* Search Input */}
        <div className="relative flex-1">
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Search Patient or Doctor
          </label>
          <input
            type="text"
            placeholder="Search by patient or doctor name..."
            value={filterState.search}
            onChange={(e) => setFilters({ search: e.target.value })}
            className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <svg
            className="absolute left-3 bottom-2.5 h-5 w-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          {filterState.search && (
            <button
              onClick={() => setFilters({ search: "" })}
              className="absolute right-3 bottom-2.5 text-gray-400 hover:text-gray-600"
            >
              <svg
                className="h-5 w-5"
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
          )}
        </div>

        {/* Clear Filters Button */}
        {(filterState.startDate ||
          filterState.endDate ||
          filterState.search) && (
          <div className="flex items-end">
            <button
              onClick={resetFilters}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Clear Filters
            </button>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
        </div>
      ) : error ? (
        <div className="p-6">
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
            <p className="text-red-700 font-medium">
              {error.message || "Failed to load appointments"}
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Table with Pagination */}
          <Table data={appointments} columns={columns} />

          {/* Statistics Footer Removed */}
        </>
      )}

      {/* Detail Modal */}
      <StatusAppointmentsModal
        isOpen={!!selectedStatus}
        onClose={() => setSelectedStatus(null)}
        status={selectedStatus}
      />
    </div>
  );
}

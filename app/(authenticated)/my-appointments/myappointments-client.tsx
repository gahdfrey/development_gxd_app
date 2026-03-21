"use client";

import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { useAppointmentFilters } from "@/lib/hooks/useAppointmentFilters";
import DoctorAppointmentsTable from "./components/DoctorAppointmentsTable";
import { ClipboardDocumentListIcon } from "@heroicons/react/24/outline";
import type { Session } from "next-auth";
import PermissionDenied from "@/app/components/ui/PermissionDenied";

interface Patient {
  id: number;
  firstname: string;
  lastname: string;
  gender: string;
  dob: string;
  phone: string;
  countryCode: string;
  insuranceType: string;
  hmoId: number | null;
  policyNumber: string | null;
  hmoName: string | null;
}

interface Appointment {
  id: number;
  appointmentDate: string;
  appointmentTime: string;
  status: string;
  visitType: string;
  notes: string | null;
  patient: Patient | null;
  hasRequest: boolean;
}

interface MyAppointmentsClientProps {
  session: Session | null;
}

export default function MyAppointmentsClient({
  session,
}: MyAppointmentsClientProps) {
  // Get today's date in YYYY-MM-DD format
  const today = new Date().toISOString().split("T")[0];

  const { filterState, setFilters, resetFilters, queryString } =
    useAppointmentFilters({
      initialStartDate: today,
      initialEndDate: today,
    });

  const {
    data: appointments = [],
    isLoading,
    error,
  } = useSWR<Appointment[]>(`/api/my-appointments${queryString}`, fetcher);

  return (
    <main className="min-h-screen  p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-linear-to-br from-green-500 to-emerald-600 rounded-2xl">
                <ClipboardDocumentListIcon className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-800">
                  My Appointments
                </h1>
                <p className="text-gray-600 text-sm">
                  View and manage your scheduled patient appointments
                </p>
              </div>
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
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
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
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                  />
                </div>
              </div>

              {/* Search Input */}
              <div className="relative flex-1">
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Search Patient
                </label>
                <input
                  type="text"
                  placeholder="Search by patient name..."
                  value={filterState.search}
                  onChange={(e) => setFilters({ search: e.target.value })}
                  className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
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
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-xs uppercase font-semibold">
                  Total
                </p>
                <p className="text-2xl font-bold text-gray-800 mt-1">
                  {appointments.length}
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              </div>
            </div>
          </div>
          {/* 
          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-xs uppercase font-semibold">
                  Scheduled
                </p>
                <p className="text-2xl font-bold text-gray-800 mt-1">
                  {
                    appointments.filter((apt) => apt.status === "scheduled")
                      .length
                  }
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              </div>
            </div>
          </div> */}

          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-xs uppercase font-semibold">
                  Completed
                </p>
                <p className="text-2xl font-bold text-gray-800 mt-1">
                  {
                    appointments.filter((apt) => apt.status === "completed")
                      .length
                  }
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-xs uppercase font-semibold">
                  No-Show
                </p>
                <p className="text-2xl font-bold text-gray-800 mt-1">
                  {
                    appointments.filter((apt) => apt.status === "no-show")
                      .length
                  }
                </p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-lg">
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-xs uppercase font-semibold">
                  Cancelled
                </p>
                <p className="text-2xl font-bold text-gray-800 mt-1">
                  {
                    appointments.filter((apt) => apt.status === "cancelled")
                      .length
                  }
                </p>
              </div>
              <div className="p-3 bg-red-100 rounded-lg">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
          </div>
        )}

        {/* Permission Denied */}
        {error &&
          (error.message?.includes("Forbidden") ||
            error.message?.includes("permission")) && (
            <PermissionDenied moduleName="My Appointments" />
          )}

        {/* Error State */}
        {error &&
          !(
            error.message?.includes("Forbidden") ||
            error.message?.includes("permission")
          ) && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
              <p className="text-red-700 text-center">
                Failed to load appointments. Please try again.
              </p>
            </div>
          )}

        {/* Appointments Table */}
        {!isLoading && !error && (
          <DoctorAppointmentsTable
            appointments={appointments}
            session={session}
          />
        )}
      </div>
    </main>
  );
}

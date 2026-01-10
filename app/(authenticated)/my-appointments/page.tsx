"use client";

import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import DoctorAppointmentsTable from "./components/DoctorAppointmentsTable";
import { ClipboardDocumentListIcon } from "@heroicons/react/24/outline";

interface Patient {
  id: number;
  firstname: string;
  lastname: string;
  gender: string;
  dob: string;
  phone: string;
}

interface Appointment {
  id: number;
  appointmentDate: string;
  appointmentTime: string;
  status: string;
  notes: string | null;
  patient: Patient | null;
}

export default function MyAppointmentsPage() {
  const {
    data: appointments = [],
    isLoading,
    error,
  } = useSWR<Appointment[]>("/api/my-appointments", fetcher);

  return (
    <main className="min-h-screen  p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
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
          </div>

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
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
            <p className="text-red-700 text-center">
              Failed to load appointments. Please try again.
            </p>
          </div>
        )}

        {/* Appointments Table */}
        {!isLoading && !error && (
          <DoctorAppointmentsTable appointments={appointments} />
        )}
      </div>
    </main>
  );
}

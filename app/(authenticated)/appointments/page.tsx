"use client";

import { useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import AppointmentCalendar from "./components/AppointmentCalendar";
import AppointmentList from "./components/AppointmentList";
import CreateAppointmentModal from "./components/CreateAppointmentModal";
import { CalendarDaysIcon, PlusIcon } from "@heroicons/react/24/outline";

interface Appointment {
  id: number;
  appointmentDate: string;
  appointmentTime: string;
  status: string;
  notes: string | null;
  patient: {
    id: number;
    firstname: string;
    lastname: string;
    phone: string;
  } | null;
  doctor: {
    id: number;
    firstname: string;
    lastname: string;
    email: string;
  } | null;
}

export default function AppointmentsPage() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

  const {
    data: appointments = [],
    isLoading,
    error,
  } = useSWR<Appointment[]>("/api/appointments", fetcher);

  return (
    <main className="min-h-screen bg-linear-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-linear-to-br from-blue-500 to-indigo-600 rounded-2xl">
                <CalendarDaysIcon className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">
                  Appointments
                </h1>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Manage patient appointments and schedules
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-linear-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 transition-all duration-300"
            >
              <PlusIcon className="h-5 w-5" />
              Create Appointment
            </button>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-6">
            <p className="text-red-700 dark:text-red-300 text-center">
              Failed to load appointments. Please try again.
            </p>
          </div>
        )}

        {/* Content */}
        {!isLoading && !error && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Calendar Section */}
            <div className="lg:col-span-1">
              <AppointmentCalendar
                appointments={appointments}
                selectedDate={selectedDate}
                onDateSelect={setSelectedDate}
              />

              {selectedDate && (
                <div className="mt-4 text-center">
                  <button
                    onClick={() => setSelectedDate(undefined)}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Clear date filter
                  </button>
                </div>
              )}
            </div>

            {/* Appointments List Section */}
            <div className="lg:col-span-2">
              <AppointmentList
                appointments={appointments}
                selectedDate={selectedDate}
              />
            </div>
          </div>
        )}

        {/* Create Appointment Modal */}
        <CreateAppointmentModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
        />
      </div>
    </main>
  );
}

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
    <main className="min-h-screen bg-linear-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-linear-to-br from-blue-500 to-indigo-600 rounded-2xl">
                <CalendarDaysIcon className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-800">
                  Appointments
                </h1>
                <p className="text-gray-600 text-sm">
                  Manage patient appointments and schedules
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
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
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
            <p className="text-red-700 text-center">
              Failed to load appointments. Please try again.
            </p>
          </div>
        )}

        {/* Content */}
        {!isLoading && !error && (
          <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
            {/* Calendar Section */}
            <div className="lg:col-span-7">
              <AppointmentCalendar
                appointments={appointments}
                selectedDate={selectedDate}
                onDateSelect={setSelectedDate}
              />

              {selectedDate && (
                <div className="mt-4 text-center">
                  <button
                    onClick={() => setSelectedDate(undefined)}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    Clear date filter
                  </button>
                </div>
              )}
            </div>

            {/* Appointments List Section */}
            <div className="lg:col-span-3">
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

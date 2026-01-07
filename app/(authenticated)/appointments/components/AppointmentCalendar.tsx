"use client";

import { useMemo } from "react";
import { DayPicker } from "react-day-picker";
import { format } from "date-fns";
import "react-day-picker/style.css";

interface Appointment {
  id: number;
  appointmentDate: string;
  appointmentTime: string;
  status: string;
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
  } | null;
}

interface AppointmentCalendarProps {
  appointments: Appointment[];
  onDateSelect?: (date: Date | undefined) => void;
  selectedDate?: Date;
}

export default function AppointmentCalendar({
  appointments,
  onDateSelect,
  selectedDate,
}: AppointmentCalendarProps) {
  // Group appointments by date
  const appointmentsByDate = useMemo(() => {
    const grouped: Record<string, Appointment[]> = {};
    appointments.forEach((appointment) => {
      if (!grouped[appointment.appointmentDate]) {
        grouped[appointment.appointmentDate] = [];
      }
      grouped[appointment.appointmentDate].push(appointment);
    });
    return grouped;
  }, [appointments]);

  // Get dates with appointments
  const datesWithAppointments = useMemo(() => {
    return Object.keys(appointmentsByDate).map((dateStr) => new Date(dateStr));
  }, [appointmentsByDate]);

  // Modifiers for different statuses
  const scheduledDates = useMemo(() => {
    return appointments
      .filter((a) => a.status === "scheduled")
      .map((a) => new Date(a.appointmentDate));
  }, [appointments]);

  const completedDates = useMemo(() => {
    return appointments
      .filter((a) => a.status === "completed")
      .map((a) => new Date(a.appointmentDate));
  }, [appointments]);

  const cancelledDates = useMemo(() => {
    return appointments
      .filter((a) => a.status === "cancelled")
      .map((a) => new Date(a.appointmentDate));
  }, [appointments]);

  const noShowDates = useMemo(() => {
    return appointments
      .filter((a) => a.status === "no-show")
      .map((a) => new Date(a.appointmentDate));
  }, [appointments]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
      <style jsx global>{`
        .rdp {
          --rdp-accent-color: #3b82f6;
          --rdp-background-color: #dbeafe;
          margin: 0;
        }

        .rdp-day_button {
          border-radius: 0.5rem;
          font-weight: 500;
        }

        .rdp-day_button:hover:not([disabled]) {
          background-color: #e0e7ff;
        }

        .rdp-day_selected {
          background-color: #3b82f6 !important;
          color: white !important;
        }

        .rdp-month_caption {
          font-size: 1.125rem;
          font-weight: 700;
          color: #1f2937;
          margin-bottom: 1rem;
        }

        .dark .rdp-month_caption {
          color: #f3f4f6;
        }

        .scheduled-day .rdp-day_button {
          background-color: #bfdbfe;
          border: 2px solid #3b82f6;
        }

        .dark .scheduled-day .rdp-day_button {
          background-color: #1e40af;
          border-color: #60a5fa;
        }

        .completed-day .rdp-day_button {
          background-color: #bbf7d0;
          border: 2px solid #10b981;
        }

        .dark .completed-day .rdp-day_button {
          background-color: #065f46;
          border-color: #34d399;
        }

        .cancelled-day .rdp-day_button {
          background-color: #fecaca;
          border: 2px solid #ef4444;
        }

        .dark .cancelled-day .rdp-day_button {
          background-color: #991b1b;
          border-color: #f87171;
        }

        .no-show-day .rdp-day_button {
          background-color: #fef08a;
          border: 2px solid #eab308;
        }

        .dark .no-show-day .rdp-day_button {
          background-color: #854d0e;
          border-color: #facc15;
        }

        .rdp-weekday {
          font-weight: 600;
          color: #6b7280;
        }

        .dark .rdp-weekday {
          color: #9ca3af;
        }

        .rdp-day_button:disabled {
          opacity: 0.3;
        }
      `}</style>

      <div className="mb-4">
        <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-2">
          Appointment Calendar
        </h3>
        <div className="flex flex-wrap gap-3 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-blue-200 border-2 border-blue-500"></div>
            <span className="text-gray-600 dark:text-gray-400">Scheduled</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-green-200 border-2 border-green-500"></div>
            <span className="text-gray-600 dark:text-gray-400">Completed</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-red-200 border-2 border-red-500"></div>
            <span className="text-gray-600 dark:text-gray-400">Cancelled</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-yellow-200 border-2 border-yellow-500"></div>
            <span className="text-gray-600 dark:text-gray-400">No-Show</span>
          </div>
        </div>
      </div>

      <DayPicker
        mode="single"
        selected={selectedDate}
        onSelect={onDateSelect}
        modifiers={{
          scheduled: scheduledDates,
          completed: completedDates,
          cancelled: cancelledDates,
          "no-show": noShowDates,
        }}
        modifiersClassNames={{
          scheduled: "scheduled-day",
          completed: "completed-day",
          cancelled: "cancelled-day",
          "no-show": "no-show-day",
        }}
        className="mx-auto"
      />
    </div>
  );
}

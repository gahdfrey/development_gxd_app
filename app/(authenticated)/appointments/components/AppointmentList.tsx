"use client";

import { format } from "date-fns";

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

interface AppointmentListProps {
  appointments: Appointment[];
  selectedDate?: Date;
}

export default function AppointmentList({
  appointments,
  selectedDate,
}: AppointmentListProps) {
  // Filter appointments by selected date if provided, otherwise show today's appointments
  const today = format(new Date(), "yyyy-MM-dd");
  const filteredAppointments = selectedDate
    ? appointments.filter(
        (apt) => apt.appointmentDate === format(selectedDate, "yyyy-MM-dd")
      )
    : appointments.filter((apt) => apt.appointmentDate === today);

  // Sort by date and time
  const sortedAppointments = [...filteredAppointments].sort((a, b) => {
    const dateCompare = b.appointmentDate.localeCompare(a.appointmentDate);
    if (dateCompare !== 0) return dateCompare;
    return b.appointmentTime.localeCompare(a.appointmentTime);
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "scheduled":
        return "bg-blue-500 text-white";
      case "completed":
        return "bg-green-500 text-white";
      case "cancelled":
        return "bg-red-500 text-white";
      case "no-show":
        return "bg-yellow-500 text-white";
      default:
        return "bg-gray-500 text-white";
    }
  };

  const formatTime = (time: string) => {
    try {
      const [hours, minutes] = time.split(":");
      const date = new Date();
      date.setHours(parseInt(hours), parseInt(minutes));
      return format(date, "h:mm a");
    } catch {
      return time;
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), "MMM d, yyyy");
    } catch {
      return dateStr;
    }
  };

  if (sortedAppointments.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {selectedDate
              ? `No appointments for ${format(selectedDate, "MMM d, yyyy")}`
              : "No appointments today"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-4">
      <h3 className="text-base font-bold text-gray-800 dark:text-gray-100 mb-4">
        {selectedDate
          ? `${format(selectedDate, "MMM d, yyyy")}`
          : "Today's Appointments"}
      </h3>

      <div className="space-y-3 max-h-[calc(100vh-300px)] overflow-y-auto pr-2">
        {sortedAppointments.map((appointment) => (
          <div
            key={appointment.id}
            className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 hover:shadow-md transition-shadow bg-white dark:bg-gray-900"
          >
            {/* Status Badge - Full Width at Top */}
            <div className="mb-2">
              <span
                className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-semibold ${getStatusColor(
                  appointment.status
                )}`}
              >
                {appointment.status.charAt(0).toUpperCase() +
                  appointment.status.slice(1)}
              </span>
            </div>

            {/* Date and Time */}
            <div className="mb-2">
              <div className="text-xs font-semibold text-gray-800 dark:text-gray-100">
                {formatDate(appointment.appointmentDate)}
              </div>
              <div className="text-sm font-medium text-blue-600 dark:text-blue-400">
                {formatTime(appointment.appointmentTime)}
              </div>
            </div>

            {/* Patient Info */}
            <div className="mb-2">
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Patient:
              </div>
              <div className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                {appointment.patient
                  ? `${appointment.patient.firstname} ${appointment.patient.lastname}`
                  : "N/A"}
              </div>
            </div>

            {/* Doctor Info */}
            <div className="mb-2">
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Doctor:
              </div>
              <div className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                {appointment.doctor
                  ? `Dr. ${appointment.doctor.firstname} ${appointment.doctor.lastname}`
                  : "N/A"}
              </div>
            </div>

            {/* Notes */}
            {appointment.notes && (
              <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                  Notes:
                </div>
                <div className="text-xs text-gray-700 dark:text-gray-300 line-clamp-2">
                  {appointment.notes}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

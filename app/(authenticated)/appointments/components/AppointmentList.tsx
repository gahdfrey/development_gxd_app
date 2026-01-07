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
  // Filter appointments by selected date if provided
  const filteredAppointments = selectedDate
    ? appointments.filter(
        (apt) => apt.appointmentDate === format(selectedDate, "yyyy-MM-dd")
      )
    : appointments;

  // Sort by date and time
  const sortedAppointments = [...filteredAppointments].sort((a, b) => {
    const dateCompare = b.appointmentDate.localeCompare(a.appointmentDate);
    if (dateCompare !== 0) return dateCompare;
    return b.appointmentTime.localeCompare(a.appointmentTime);
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "scheduled":
        return "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700";
      case "completed":
        return "bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700";
      case "cancelled":
        return "bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700";
      case "no-show":
        return "bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-700";
      default:
        return "bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-900/30 dark:text-gray-300 dark:border-gray-700";
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
      return format(new Date(dateStr), "MMMM d, yyyy");
    } catch {
      return dateStr;
    }
  };

  if (sortedAppointments.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-8">
        <div className="text-center">
          <p className="text-gray-500 dark:text-gray-400">
            {selectedDate
              ? `No appointments scheduled for ${format(
                  selectedDate,
                  "MMMM d, yyyy"
                )}`
              : "No appointments scheduled"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4">
        {selectedDate
          ? `Appointments for ${format(selectedDate, "MMMM d, yyyy")}`
          : "All Appointments"}
      </h3>

      <div className="space-y-3">
        {sortedAppointments.map((appointment) => (
          <div
            key={appointment.id}
            className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-semibold text-gray-800 dark:text-gray-100">
                    {formatDate(appointment.appointmentDate)}
                  </span>
                  <span className="text-gray-600 dark:text-gray-400">•</span>
                  <span className="font-medium text-blue-600 dark:text-blue-400">
                    {formatTime(appointment.appointmentTime)}
                  </span>
                </div>

                <div className="space-y-1 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 dark:text-gray-400">
                      Patient:
                    </span>
                    <span className="font-medium text-gray-800 dark:text-gray-200">
                      {appointment.patient
                        ? `${appointment.patient.firstname} ${appointment.patient.lastname}`
                        : "N/A"}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 dark:text-gray-400">
                      Doctor:
                    </span>
                    <span className="font-medium text-gray-800 dark:text-gray-200">
                      {appointment.doctor
                        ? `Dr. ${appointment.doctor.firstname} ${appointment.doctor.lastname}`
                        : "N/A"}
                    </span>
                  </div>

                  {appointment.notes && (
                    <div className="flex items-start gap-2 mt-2">
                      <span className="text-gray-500 dark:text-gray-400">
                        Notes:
                      </span>
                      <span className="text-gray-700 dark:text-gray-300">
                        {appointment.notes}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <span
                  className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(
                    appointment.status
                  )}`}
                >
                  {appointment.status.charAt(0).toUpperCase() +
                    appointment.status.slice(1)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

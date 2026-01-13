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
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
        <div className="text-center">
          <p className="text-sm text-gray-500">
            {selectedDate
              ? `No appointments for ${format(selectedDate, "MMM d, yyyy")}`
              : "No appointments today"}
          </p>
        </div>
      </div>
    );
  }

  // Calculate counts by status
  const statusCounts = {
    scheduled: filteredAppointments.filter((apt) => apt.status === "scheduled")
      .length,
    completed: filteredAppointments.filter((apt) => apt.status === "completed")
      .length,
    cancelled: filteredAppointments.filter((apt) => apt.status === "cancelled")
      .length,
    noShow: filteredAppointments.filter((apt) => apt.status === "no-show")
      .length,
  };

  return (
    <div className="space-y-4">
      {/* Status Count Cards */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="text-xs text-blue-600 font-medium mb-1">
            Scheduled
          </div>
          <div className="text-2xl font-bold text-blue-700">
            {statusCounts.scheduled}
          </div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <div className="text-xs text-green-600 font-medium mb-1">
            Completed
          </div>
          <div className="text-2xl font-bold text-green-700">
            {statusCounts.completed}
          </div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <div className="text-xs text-red-600 font-medium mb-1">Cancelled</div>
          <div className="text-2xl font-bold text-red-700">
            {statusCounts.cancelled}
          </div>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <div className="text-xs text-yellow-600 font-medium mb-1">
            No-Show
          </div>
          <div className="text-2xl font-bold text-yellow-700">
            {statusCounts.noShow}
          </div>
        </div>
      </div>

      {/* Appointments List */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-4">
        <h3 className="text-base font-bold text-gray-800 mb-4">
          {selectedDate
            ? `${format(selectedDate, "MMM d, yyyy")}`
            : "Today's Appointments"}
        </h3>

        <div className="space-y-3 max-h-[calc(100vh-300px)] overflow-y-auto pr-2">
          {sortedAppointments.map((appointment) => (
            <div
              key={appointment.id}
              className="border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow bg-white"
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
                <div className="text-xs font-semibold text-gray-800">
                  {formatDate(appointment.appointmentDate)}
                </div>
                <div className="text-sm font-medium text-blue-600">
                  {formatTime(appointment.appointmentTime)}
                </div>
              </div>

              {/* Patient Info */}
              <div className="mb-2">
                <div className="text-xs text-gray-500">Patient:</div>
                <div className="text-sm font-medium text-gray-800 truncate">
                  {appointment.patient
                    ? `${appointment.patient.firstname} ${appointment.patient.lastname}`
                    : "N/A"}
                </div>
              </div>

              {/* Doctor Info */}
              <div className="mb-2">
                <div className="text-xs text-gray-500">Doctor:</div>
                <div className="text-sm font-medium text-gray-800 truncate">
                  {appointment.doctor
                    ? `Dr. ${appointment.doctor.firstname} ${appointment.doctor.lastname}`
                    : "N/A"}
                </div>
              </div>

              {/* Notes */}
              {appointment.notes && (
                <div className="pt-2 border-t border-gray-100">
                  <div className="text-xs text-gray-500 mb-1">Notes:</div>
                  <div className="text-xs text-gray-700 line-clamp-2">
                    {appointment.notes}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { mutate } from "swr";
import { format } from "date-fns";

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

interface DoctorAppointmentsTableProps {
  appointments: Appointment[];
}

export default function DoctorAppointmentsTable({
  appointments,
}: DoctorAppointmentsTableProps) {
  const [updatingId, setUpdatingId] = useState<number | null>(null);

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
      return format(new Date(dateStr), "MMM d, yyyy");
    } catch {
      return dateStr;
    }
  };

  const hasAppointmentTimePassed = (dateStr: string, timeStr: string) => {
    try {
      // Parse the appointment date and time
      const [hours, minutes] = timeStr.split(":");
      const appointmentDateTime = new Date(dateStr);
      appointmentDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      // Get current date and time
      const now = new Date();

      // Check if the appointment date is today
      const isToday =
        appointmentDateTime.getDate() === now.getDate() &&
        appointmentDateTime.getMonth() === now.getMonth() &&
        appointmentDateTime.getFullYear() === now.getFullYear();

      // Only show buttons if it's today AND the time has passed
      return isToday && now >= appointmentDateTime;
    } catch {
      return false;
    }
  };

  const handleStatusUpdate = async (
    appointmentId: number,
    newStatus: string
  ) => {
    setUpdatingId(appointmentId);

    try {
      const response = await fetch(`/api/appointments/${appointmentId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error("Failed to update appointment status");
      }

      // Refresh the appointments list
      await mutate("/api/my-appointments");
    } catch (error) {
      console.error("Error updating appointment:", error);
      alert("Failed to update appointment status");
    } finally {
      setUpdatingId(null);
    }
  };

  if (appointments.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-12">
        <div className="text-center">
          <p className="text-gray-500 dark:text-gray-400 text-lg">
            No appointments scheduled
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Date & Time
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Patient Name
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Gender
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Notes
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {appointments.map((appointment) => (
              <tr
                key={appointment.id}
                className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {formatDate(appointment.appointmentDate)}
                  </div>
                  <div className="text-sm text-blue-600 dark:text-blue-400">
                    {formatTime(appointment.appointmentTime)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {appointment.patient
                      ? `${appointment.patient.firstname} ${appointment.patient.lastname}`
                      : "N/A"}
                  </div>
                  {appointment.patient && (
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      DOB: {appointment.patient.dob}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm text-gray-900 dark:text-gray-100 capitalize">
                    {appointment.patient?.gender || "N/A"}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getStatusColor(
                      appointment.status
                    )}`}
                  >
                    {appointment.status.charAt(0).toUpperCase() +
                      appointment.status.slice(1)}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate">
                    {appointment.notes || "-"}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {appointment.status === "scheduled" &&
                  hasAppointmentTimePassed(
                    appointment.appointmentDate,
                    appointment.appointmentTime
                  ) ? (
                    <div className="flex gap-2">
                      <button
                        onClick={() =>
                          handleStatusUpdate(appointment.id, "completed")
                        }
                        disabled={updatingId === appointment.id}
                        className="px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white text-xs font-medium rounded-lg transition-colors disabled:cursor-not-allowed"
                      >
                        {updatingId === appointment.id ? "..." : "Complete"}
                      </button>
                      <button
                        onClick={() =>
                          handleStatusUpdate(appointment.id, "no-show")
                        }
                        disabled={updatingId === appointment.id}
                        className="px-3 py-1.5 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-400 text-white text-xs font-medium rounded-lg transition-colors disabled:cursor-not-allowed"
                      >
                        {updatingId === appointment.id ? "..." : "No-Show"}
                      </button>
                      <button
                        onClick={() =>
                          handleStatusUpdate(appointment.id, "cancelled")
                        }
                        disabled={updatingId === appointment.id}
                        className="px-3 py-1.5 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white text-xs font-medium rounded-lg transition-colors disabled:cursor-not-allowed"
                      >
                        {updatingId === appointment.id ? "..." : "Cancel"}
                      </button>
                    </div>
                  ) : appointment.status !== "scheduled" ? (
                    <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                      Status finalized
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400 dark:text-gray-500 italic">
                      Available after appointment time
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

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
        return "bg-blue-100 text-blue-800 border-blue-300";
      case "completed":
        return "bg-green-100 text-green-800 border-green-300";
      case "cancelled":
        return "bg-red-100 text-red-800 border-red-300";
      case "no-show":
        return "bg-yellow-100 text-yellow-800 border-yellow-300";
      default:
        return "bg-gray-100 text-gray-800 border-gray-300";
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
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-12">
        <div className="text-center">
          <p className="text-gray-500 text-lg">
            No appointments scheduled
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Date & Time
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Patient Name
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Gender
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Notes
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {appointments.map((appointment) => (
              <tr
                key={appointment.id}
                className="hover:bg-gray-50 transition-colors"
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {formatDate(appointment.appointmentDate)}
                  </div>
                  <div className="text-sm text-blue-600">
                    {formatTime(appointment.appointmentTime)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {appointment.patient
                      ? `${appointment.patient.firstname} ${appointment.patient.lastname}`
                      : "N/A"}
                  </div>
                  {appointment.patient && (
                    <div className="text-xs text-gray-500">
                      DOB: {appointment.patient.dob}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm text-gray-900 capitalize">
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
                  <div className="text-sm text-gray-500 max-w-xs truncate">
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
                    <span className="text-xs text-gray-500 font-medium">
                      Status finalized
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400 italic">
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

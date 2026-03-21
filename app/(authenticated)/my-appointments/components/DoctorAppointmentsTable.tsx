"use client";

import { useState, useMemo } from "react";
import { mutate } from "swr";
import { createColumnHelper } from "@tanstack/react-table";
import Table from "@/app/components/ui/Table";
import ConsultationModal from "./ConsultationModal";
import RaiseRequestModal from "./RaiseRequestModal";
import type { Session } from "next-auth";
import {
  formatTime,
  formatDate,
  hasAppointmentDatePassed,
} from "@/lib/appointmentUtils";

interface Patient {
  id: number;
  firstname: string;
  lastname: string;
  gender: string;
  dob: string;
  phone: string;
  countryCode: string;
}

interface Appointment {
  id: number;
  appointmentDate: string;
  appointmentTime: string;
  status: string;
  visitType: string;
  notes: string | null;
  patient: Patient | null;
}

interface DoctorAppointmentsTableProps {
  appointments: Appointment[];
  session: Session | null;
}

export default function DoctorAppointmentsTable({
  appointments,
  session,
}: DoctorAppointmentsTableProps) {
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [isConsultationModalOpen, setIsConsultationModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] =
    useState<Appointment | null>(null);
  const [activeConsultation, setActiveConsultation] = useState(false);
  const [isRaiseRequestModalOpen, setIsRaiseRequestModalOpen] = useState(false);
  const [selectedRaiseRequestAppointment, setSelectedRaiseRequestAppointment] =
    useState<Appointment | null>(null);

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

  const handleStatusUpdate = async (
    appointmentId: number,
    newStatus: string,
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
      await mutate(
        (key) =>
          typeof key === "string" && key.startsWith("/api/my-appointments"),
        undefined,
        { revalidate: true },
      );
    } catch (error) {
      console.error("Error updating appointment:", error);
      alert("Failed to update appointment status");
    } finally {
      setUpdatingId(null);
    }
  };

  const columnHelper = createColumnHelper<Appointment>();

  const columns = useMemo(
    () => [
      columnHelper.accessor("appointmentDate", {
        header: "Date & Time",
        cell: (info) => {
          const appointment = info.row.original;
          return (
            <div>
              <div className="text-sm font-medium text-gray-900">
                {formatDate(appointment.appointmentDate)}
              </div>
              <div className="text-sm text-blue-600">
                {formatTime(appointment.appointmentTime)}
              </div>
            </div>
          );
        },
      }),
      columnHelper.accessor("patient", {
        header: "Patient Name",
        cell: (info) => {
          const patient = info.getValue();
          return (
            <div>
              <div className="text-sm font-medium text-gray-900">
                {patient ? `${patient.firstname} ${patient.lastname}` : "N/A"}
              </div>
              {patient && (
                <div className="text-xs text-gray-500">DOB: {patient.dob}</div>
              )}
            </div>
          );
        },
      }),
      columnHelper.accessor("patient.gender", {
        header: "Gender",
        cell: (info) => (
          <span className="text-sm text-gray-900 capitalize">
            {info.getValue() || "N/A"}
          </span>
        ),
      }),
      columnHelper.accessor("patient.phone", {
        header: "Phone",
        cell: (info) => (
          <span className="text-sm text-gray-900 capitalize">
            {info.getValue() || "N/A"}
          </span>
        ),
      }),
      columnHelper.accessor("visitType", {
        header: "Visit Type",
        cell: (info) => (
          <span className="text-sm text-gray-700 capitalize">
            {info.getValue()}
          </span>
        ),
      }),
      columnHelper.accessor("status", {
        header: "Status",
        cell: (info) => {
          const status = info.getValue();
          return (
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getStatusColor(
                status,
              )}`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </span>
          );
        },
      }),
      columnHelper.accessor("notes", {
        header: "Notes",
        cell: (info) => (
          <div className="text-sm text-gray-500 max-w-xs truncate">
            {info.getValue() || "-"}
          </div>
        ),
      }),
      columnHelper.display({
        id: "actions",
        header: "Actions",
        cell: (props) => {
          const appointment = props.row.original;
          return (
            <div>
              {appointment.status === "scheduled" &&
              hasAppointmentDatePassed(appointment.appointmentDate) ? (
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setSelectedAppointment(appointment);
                      setIsConsultationModalOpen(true);
                      setActiveConsultation(true);
                    }}
                    disabled={activeConsultation}
                    className="px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white text-xs font-medium rounded-lg transition-colors disabled:cursor-not-allowed"
                  >
                    Start Consultation
                  </button>
                  <button
                    onClick={() =>
                      handleStatusUpdate(appointment.id, "no-show")
                    }
                    disabled={
                      updatingId === appointment.id || activeConsultation
                    }
                    className="px-3 py-1.5 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-400 text-white text-xs font-medium rounded-lg transition-colors disabled:cursor-not-allowed"
                  >
                    {updatingId === appointment.id ? "..." : "No-Show"}
                  </button>
                  <button
                    onClick={() =>
                      handleStatusUpdate(appointment.id, "cancelled")
                    }
                    disabled={
                      updatingId === appointment.id || activeConsultation
                    }
                    className="px-3 py-1.5 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white text-xs font-medium rounded-lg transition-colors disabled:cursor-not-allowed"
                  >
                    {updatingId === appointment.id ? "..." : "Cancel"}
                  </button>
                </div>
              ) : appointment.status === "completed" ? (
                <button
                  onClick={() => {
                    setSelectedRaiseRequestAppointment(appointment);
                    setIsRaiseRequestModalOpen(true);
                  }}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors"
                >
                  Raise Request
                </button>
              ) : appointment.status !== "scheduled" ? (
                <span className="text-xs text-gray-500 font-medium">
                  Status finalized
                </span>
              ) : (
                <span className="text-xs text-gray-400 italic">
                  Available after appointment time
                </span>
              )}
            </div>
          );
        },
      }),
    ],
    [updatingId],
  );

  if (appointments.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-12">
        <div className="text-center">
          <p className="text-gray-500 text-lg">No appointments scheduled</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Table data={appointments} columns={columns} />

      {selectedAppointment && (
        <ConsultationModal
          isOpen={isConsultationModalOpen}
          onClose={() => {
            setIsConsultationModalOpen(false);
            setSelectedAppointment(null);
            setActiveConsultation(false);
          }}
          appointment={selectedAppointment}
          session={session}
        />
      )}

      {selectedRaiseRequestAppointment && (
        <RaiseRequestModal
          isOpen={isRaiseRequestModalOpen}
          onClose={() => {
            setIsRaiseRequestModalOpen(false);
            setSelectedRaiseRequestAppointment(null);
          }}
        />
      )}
    </>
  );
}

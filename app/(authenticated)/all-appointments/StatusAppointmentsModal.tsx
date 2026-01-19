"use client";

import { useMemo } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import Modal from "@/app/components/ui/Modal";
import Table from "@/app/components/ui/Table";
import { createColumnHelper } from "@tanstack/react-table";
import { AllAppointment } from "./all-appointments-client";

interface StatusAppointmentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  status: string | null;
}

const columnHelper = createColumnHelper<AllAppointment>();

export default function StatusAppointmentsModal({
  isOpen,
  onClose,
  status,
}: StatusAppointmentsModalProps) {
  // Only fetch if open and status is set
  const { data: appointments, isLoading } = useSWR<AllAppointment[]>(
    isOpen && status ? `/api/all-appointments?status=${status}` : null,
    fetcher,
  );

  const columns = useMemo(
    () => [
      columnHelper.accessor("patientName", {
        header: "Patient Name",
        cell: (info) => info.getValue(),
      }),
      columnHelper.accessor("patientGender", {
        header: "Gender",
        cell: (info) => (
          <span className="capitalize">{info.getValue() || "N/A"}</span>
        ),
      }),
      columnHelper.accessor("doctorName", {
        header: "Doctor",
        cell: (info) => info.getValue(),
      }),
      // Status column excluded as requested
      columnHelper.accessor("appointmentDate", {
        header: "Appointment Date",
        cell: (info) => {
          const row = info.row.original;
          const date = new Date(row.appointmentDate);
          const options: Intl.DateTimeFormatOptions = {
            weekday: "short",
            year: "numeric",
            month: "short",
            day: "numeric",
          };
          return `${date.toLocaleDateString("en-US", options)} ${
            row.appointmentTime
          }`;
        },
      }),
    ],
    [],
  );

  const titleStatus = status
    ? status.charAt(0).toUpperCase() + status.slice(1)
    : "";

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${titleStatus} Appointments`}
      size="large"
    >
      <div className="mt-4 min-h-[300px]">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : appointments && appointments.length > 0 ? (
          <Table data={appointments} columns={columns} />
        ) : (
          <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-lg">
            No {status} appointments found.
          </div>
        )}
      </div>
    </Modal>
  );
}

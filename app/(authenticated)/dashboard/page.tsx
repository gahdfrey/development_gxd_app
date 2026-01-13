"use client";

import { useState, useEffect, useMemo } from "react";
import { createColumnHelper } from "@tanstack/react-table";
import useSWR, { mutate } from "swr";
import { fetcher } from "@/lib/fetcher";
import Table from "@/app/components/ui/Table";
import Modal from "@/app/components/ui/Modal";
import CreatePatientModal from "./components/CreatePatientModal";
import EditPatientModal from "./components/EditPatientModal";
import ViewPatientModal from "./components/ViewPatientModal";
import {
  PencilSquareIcon,
  TrashIcon,
  EyeIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";
import { useToast } from "@/app/contexts/ToastContext";

interface Patient {
  id: number;
  firstname: string;
  lastname: string;
  gender: string;
  dob: string;
  maidenName: string;
  countryCode: string;
  phone: string;
  insuranceType: string;
  createdAt: string;
  updatedAt: string;
}

export default function DashboardPage() {
  const {
    data: patients = [],
    error,
    isLoading,
  } = useSWR<Patient[]>("/api/patients", fetcher);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(
    null
  );
  const { showToast } = useToast();

  const handleCreatePatient = async (data: any) => {
    const response = await fetch("/api/patients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      showToast(error.error || "Failed to create patient", "error");
      throw new Error(error.error || "Failed to create patient");
    }

    mutate("/api/patients");
    setIsCreateModalOpen(false);
    showToast("Patient created successfully", "success");
  };

  const handleUpdatePatient = async (data: any) => {
    if (!selectedPatient) return;

    const response = await fetch(`/api/patients/${selectedPatient.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      showToast(error.error || "Failed to update patient", "error");
      throw new Error(error.error || "Failed to update patient");
    }

    mutate("/api/patients");
    setIsEditModalOpen(false);
    setSelectedPatient(null);
    showToast("Patient updated successfully", "success");
  };

  const handleDeletePatient = async () => {
    if (!selectedPatient) return;

    const response = await fetch(`/api/patients/${selectedPatient.id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      console.error("Failed to delete patient");
      showToast("Failed to delete patient", "error");
      return;
    }

    mutate("/api/patients");
    setIsDeleteModalOpen(false);
    setSelectedPatient(null);
    showToast("Patient deleted successfully", "success");
  };

  const columnHelper = createColumnHelper<Patient>();

  const columns = useMemo(
    () => [
      columnHelper.accessor("firstname", {
        header: "First Name",
        cell: (info) => info.getValue(),
      }),
      columnHelper.accessor("lastname", {
        header: "Last Name",
        cell: (info) => info.getValue(),
      }),
      columnHelper.accessor("gender", {
        header: "Gender",
        cell: (info) => info.getValue(),
      }),
      columnHelper.accessor("dob", {
        header: "Date of Birth",
        cell: (info) => new Date(info.getValue()).toLocaleDateString(),
      }),
      columnHelper.accessor("phone", {
        header: "Phone",
        cell: (info) => {
          const patient = info.row.original;
          return `${patient.countryCode} ${info.getValue()}`;
        },
      }),
      columnHelper.accessor("insuranceType", {
        header: "Insurance",
        cell: (info) => info.getValue(),
      }),
      columnHelper.display({
        id: "actions",
        header: "Actions",
        cell: (props) => (
          <div className="flex gap-2">
            <button
              onClick={() => {
                setSelectedPatientId(props.row.original.id);
                setIsViewModalOpen(true);
              }}
              className="p-1 text-blue-600 hover:text-blue-800 transition-colors"
              title="View"
            >
              <EyeIcon className="w-5 h-5" />
            </button>
            <button
              onClick={() => {
                setSelectedPatient(props.row.original);
                setIsEditModalOpen(true);
              }}
              className="p-1 text-yellow-600 hover:text-yellow-800 transition-colors"
              title="Edit"
            >
              <PencilSquareIcon className="w-5 h-5" />
            </button>
            <button
              onClick={() => {
                setSelectedPatient(props.row.original);
                setIsDeleteModalOpen(true);
              }}
              className="p-1 text-red-600 hover:text-red-800 transition-colors"
              title="Delete"
            >
              <TrashIcon className="w-5 h-5" />
            </button>
          </div>
        ),
      }),
    ],
    []
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
        >
          <PlusIcon className="w-5 h-5" />
          Create Patient
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <Table data={patients} columns={columns} />
      )}

      {/* Create Modal */}
      <CreatePatientModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />

      {/* Edit Modal */}
      <EditPatientModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedPatient(null);
        }}
        patientId={selectedPatient?.id ?? null}
        onSuccess={() => {
          setIsEditModalOpen(false);
          setSelectedPatient(null);
        }}
      />

      {/* View Modal */}
      {selectedPatientId && (
        <ViewPatientModal
          patientId={selectedPatientId}
          onClose={() => {
            setIsViewModalOpen(false);
            setSelectedPatientId(null);
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSelectedPatient(null);
        }}
        title="Delete Patient"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Are you sure you want to delete patient{" "}
            <strong>
              {selectedPatient?.firstname} {selectedPatient?.lastname}
            </strong>
            ? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => {
                setIsDeleteModalOpen(false);
                setSelectedPatient(null);
              }}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              onClick={handleDeletePatient}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              Delete
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

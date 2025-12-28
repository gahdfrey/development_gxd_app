"use client";

import { useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import CreatePatientModal from "./components/CreatePatientModal";
import PatientTable from "./components/PatientTable";
import ViewPatientModal from "./components/ViewPatientModal";
import { UserPlusIcon } from "@heroicons/react/24/outline";

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
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  const {
    data: patients = [],
    isLoading,
    error,
  } = useSWR<Patient[]>("/api/patients", fetcher);

  return (
    <main className="min-h-screen bg-linear-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto flex flex-col gap-4">
        {/* Header */}
        <div className="flex justify-end w-full">
          {/* Create Patient Button */}
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex  gap-2 px-6 py-3 bg-linear-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 transition-all duration-300"
          >
            <UserPlusIcon className="h-5 w-5" />
            Create New Patient
          </button>
        </div>

        {/* Patient Table */}
        <PatientTable
          patients={patients}
          isLoading={isLoading}
          error={error}
          onViewDetails={setSelectedPatient}
        />

        {/* Modals */}
        <CreatePatientModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
        />

        <ViewPatientModal
          patient={selectedPatient}
          onClose={() => setSelectedPatient(null)}
        />
      </div>
    </main>
  );
}

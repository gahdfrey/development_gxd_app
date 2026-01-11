"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { FunnelIcon, XMarkIcon } from "@heroicons/react/24/outline";

interface Doctor {
  id: number;
  firstname: string;
  lastname: string;
  email: string;
}

interface Patient {
  id: number;
  firstname: string;
  lastname: string;
  phone: string;
}

interface AppointmentFiltersProps {
  selectedDoctorId: number | null;
  selectedPatientId: number | null;
  onDoctorChange: (doctorId: number | null) => void;
  onPatientChange: (patientId: number | null) => void;
  onClearFilters: () => void;
}

export default function AppointmentFilters({
  selectedDoctorId,
  selectedPatientId,
  onDoctorChange,
  onPatientChange,
  onClearFilters,
}: AppointmentFiltersProps) {
  const { data: doctors = [], isLoading: loadingDoctors } = useSWR<Doctor[]>(
    "/api/doctors",
    fetcher
  );

  const { data: patients = [], isLoading: loadingPatients } = useSWR<Patient[]>(
    "/api/patients",
    fetcher
  );

  const hasActiveFilters =
    selectedDoctorId !== null || selectedPatientId !== null;

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 mb-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-linear-to-br from-purple-500 to-indigo-600 rounded-xl">
          <FunnelIcon className="h-5 w-5 text-white" />
        </div>
        <h3 className="text-lg font-bold text-gray-800">Filter Appointments</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Doctor Filter */}
        <div>
          <label
            htmlFor="doctor-filter"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Filter by Doctor
          </label>
          <select
            id="doctor-filter"
            value={selectedDoctorId || ""}
            onChange={(e) =>
              onDoctorChange(e.target.value ? Number(e.target.value) : null)
            }
            disabled={loadingDoctors}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white text-gray-900 disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            <option value="">All Doctors</option>
            {doctors.map((doctor) => (
              <option key={doctor.id} value={doctor.id}>
                Dr. {doctor.firstname} {doctor.lastname}
              </option>
            ))}
          </select>
        </div>

        {/* Patient Filter */}
        <div>
          <label
            htmlFor="patient-filter"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Filter by Patient
          </label>
          <select
            id="patient-filter"
            value={selectedPatientId || ""}
            onChange={(e) =>
              onPatientChange(e.target.value ? Number(e.target.value) : null)
            }
            disabled={loadingPatients}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white text-gray-900 disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            <option value="">All Patients</option>
            {patients.map((patient) => (
              <option key={patient.id} value={patient.id}>
                {patient.firstname} {patient.lastname}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Clear Filters Button */}
      {hasActiveFilters && (
        <div className="mt-4 flex justify-end">
          <button
            onClick={onClearFilters}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors shadow-sm"
          >
            <XMarkIcon className="h-4 w-4" />
            Clear Filters
          </button>
        </div>
      )}
    </div>
  );
}

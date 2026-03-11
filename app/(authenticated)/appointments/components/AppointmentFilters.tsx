"use client";

import { useState, useMemo } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import {
  MagnifyingGlassIcon,
  XMarkIcon,
  ChevronDownIcon,
} from "@heroicons/react/24/outline";

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

interface SearchableSelectProps {
  options: Array<{ id: number; label: string }>;
  value: number | null;
  onChange: (value: number | null) => void;
  placeholder: string;
  disabled?: boolean;
}

function SearchableSelect({
  options,
  value,
  onChange,
  placeholder,
  disabled,
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredOptions = useMemo(() => {
    return options.filter((option) =>
      option.label.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [options, searchQuery]);

  const selectedOption = options.find((opt) => opt.id === value);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className="w-full px-3 py-2 text-left border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white text-gray-900 disabled:bg-gray-100 disabled:cursor-not-allowed flex items-center justify-between text-sm"
      >
        <span className={selectedOption ? "text-gray-900" : "text-gray-500"}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDownIcon
          className={`h-4 w-4 text-gray-400 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-hidden">
            {/* Search Input */}
            <div className="p-2 border-b border-gray-200">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search..."
                  className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </div>

            {/* Options List */}
            <div className="max-h-48 overflow-y-auto">
              <button
                type="button"
                onClick={() => {
                  onChange(null);
                  setIsOpen(false);
                  setSearchQuery("");
                }}
                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 text-gray-700"
              >
                {placeholder}
              </button>
              {filteredOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => {
                    onChange(option.id);
                    setIsOpen(false);
                    setSearchQuery("");
                  }}
                  className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-100 ${
                    value === option.id
                      ? "bg-blue-50 text-blue-700 font-medium"
                      : "text-gray-900"
                  }`}
                >
                  {option.label}
                </button>
              ))}
              {filteredOptions.length === 0 && (
                <div className="px-3 py-2 text-sm text-gray-500">
                  No results found
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function AppointmentFilters({
  selectedDoctorId,
  selectedPatientId,
  onDoctorChange,
  onPatientChange,
  onClearFilters,
}: AppointmentFiltersProps) {
  const { data: doctors = [], isLoading: loadingDoctors } = useSWR<Doctor[]>(
    "/api/doctors?orderBy=asc",
    fetcher,
  );

  const { data: patients = [], isLoading: loadingPatients } = useSWR<Patient[]>(
    "/api/patients?orderBy=asc",
    fetcher,
  );

  // Map doctors and patients to options (already sorted by API by firstname)
  const sortedDoctors = useMemo(() => {
    if (!doctors || doctors.length === 0) return [];

    return doctors.map((doctor) => ({
      id: doctor.id,
      label: `Dr. ${doctor.firstname} ${doctor.lastname}`,
    }));
  }, [doctors]);

  const sortedPatients = useMemo(() => {
    if (!patients || patients.length === 0) return [];

    return patients.map((patient) => ({
      id: patient.id,
      label: `${patient.firstname} ${patient.lastname}`,
    }));
  }, [patients]);

  const hasActiveFilters =
    selectedDoctorId !== null || selectedPatientId !== null;

  return (
    // <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-4">
    <div className="flex items-center justify-between gap-4 flex-wrap mb-4">
      {/* Filters */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="flex-1 min-w-[200px]">
          <SearchableSelect
            options={sortedDoctors}
            value={selectedDoctorId}
            onChange={onDoctorChange}
            placeholder="All Doctors"
            disabled={loadingDoctors}
          />
        </div>
        <div className="flex-1 min-w-[200px]">
          <SearchableSelect
            options={sortedPatients}
            value={selectedPatientId}
            onChange={onPatientChange}
            placeholder="All Patients"
            disabled={loadingPatients}
          />
        </div>
      </div>

      {/* Clear Filters Button */}
      {hasActiveFilters && (
        <button
          onClick={onClearFilters}
          className="flex items-center gap-1.5 px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors whitespace-nowrap"
        >
          <XMarkIcon className="h-4 w-4" />
          Clear
        </button>
      )}
    </div>
    // </div>
  );
}

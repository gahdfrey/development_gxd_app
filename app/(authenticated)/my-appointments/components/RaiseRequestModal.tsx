"use client";

import { useState } from "react";
import useSWR from "swr";
import Modal from "@/app/components/ui/Modal";
import SearchableSelect, {
  type SearchableSelectOption,
} from "@/app/components/ui/SearchableSelect";
import {fetcher} from "@/lib/fetcher";

interface Patient {
  id: number;
  firstname: string;
  lastname: string;
  gender: string;
  dob: string;
  countryCode: string;
  phone: string;
  insuranceType: string;
  hmoId: number | null;
  policyNumber: string | null;
}

interface RaiseRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const formatAge = (dob: string): string => {
  const today = new Date();
  const birth = new Date(dob);

  let years = today.getFullYear() - birth.getFullYear();
  let months = today.getMonth() - birth.getMonth();
  let days = today.getDate() - birth.getDate();

  if (days < 0) {
    months--;
    days += new Date(today.getFullYear(), today.getMonth(), 0).getDate();
  }
  if (months < 0) {
    years--;
    months += 12;
  }

  if (years >= 1) return `${years} ${years === 1 ? "year" : "years"}`;
  if (months >= 1) return `${months} ${months === 1 ? "month" : "months"}`;
  return `${days} ${days === 1 ? "day" : "days"}`;
};

const formatInsuranceType = (type: string): string => {
  if (type === "hmo") return "HMO";
  return type.charAt(0).toUpperCase() + type.slice(1);
};

export default function RaiseRequestModal({
  isOpen,
  onClose,
}: RaiseRequestModalProps) {
  const { data: patients, isLoading } = useSWR<Patient[]>(
    "/api/patients",
    fetcher,
  );
  const [selectedOption, setSelectedOption] =
    useState<SearchableSelectOption | null>(null);

  const patientOptions: SearchableSelectOption[] = (patients ?? []).map(
    (p) => ({
      id: p.id,
      label: `${p.firstname} ${p.lastname}`,
      sublabel: `${p.countryCode} ${p.phone}`,
    }),
  );

  const selectedPatient =
    selectedOption && patients
      ? patients.find((p) => p.id === selectedOption.id) ?? null
      : null;

  const handleClose = () => {
    setSelectedOption(null);
    onClose();
  };

  const handleSubmit = () => {
    if (!selectedPatient) return;
    // Placeholder: ready for future API integration
    console.log("Raise request for patient:", selectedPatient);
    handleClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Raise Request"
      size="default"
    >
      <div className="space-y-6">
        {/* Patient Selection */}
        <div>
          <SearchableSelect
            label="Select Patient"
            options={patientOptions}
            value={selectedOption}
            onChange={setSelectedOption}
            placeholder={
              isLoading ? "Loading patients..." : "Search by name..."
            }
            disabled={isLoading}
          />
        </div>

        {/* Auto-populated Read-only Details */}
        {selectedPatient && (
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Patient Details
            </p>
            <div className="grid grid-cols-3 gap-4">
              {/* Gender */}
              <div className="space-y-1">
                <label className="block text-xs font-medium text-gray-500">
                  Gender
                </label>
                <div className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 select-none cursor-default">
                  {selectedPatient.gender
                    ? selectedPatient.gender.charAt(0).toUpperCase() +
                      selectedPatient.gender.slice(1)
                    : "—"}
                </div>
              </div>

              {/* Insurance Type */}
              <div className="space-y-1">
                <label className="block text-xs font-medium text-gray-500">
                  Insurance Type
                </label>
                <div className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 select-none cursor-default">
                  {selectedPatient.insuranceType
                    ? formatInsuranceType(selectedPatient.insuranceType)
                    : "—"}
                </div>
              </div>

              {/* Age */}
              <div className="space-y-1">
                <label className="block text-xs font-medium text-gray-500">
                  Age
                </label>
                <div className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 select-none cursor-default">
                  {selectedPatient.dob
                    ? formatAge(selectedPatient.dob)
                    : "—"}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
          <button
            onClick={handleClose}
            className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!selectedPatient}
            className="px-5 py-2.5 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Submit Request
          </button>
        </div>
      </div>
    </Modal>
  );
}

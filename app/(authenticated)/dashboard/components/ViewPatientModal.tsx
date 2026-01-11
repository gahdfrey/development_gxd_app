"use client";

import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import {
  UserIcon,
  XMarkIcon,
  PhoneIcon,
  CalendarIcon,
  IdentificationIcon,
  HeartIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";

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

interface ViewPatientModalProps {
  patientId: number | null;
  onClose: () => void;
}

export default function ViewPatientModal({
  patientId,
  onClose,
}: ViewPatientModalProps) {
  const {
    data: patient,
    isLoading,
    error,
  } = useSWR<Patient>(patientId ? `/api/patients/${patientId}` : null, fetcher);

  if (!patientId) return null;

  if (isLoading) {
    return (
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in"
        onClick={onClose}
      >
        <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full p-12 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (error || !patient) {
    return (
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in"
        onClick={onClose}
      >
        <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full p-12">
          <p className="text-red-600 text-center">
            Failed to load patient data
          </p>
          <button
            onClick={onClose}
            className="mt-4 w-full py-3 px-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  const InfoCard = ({
    label,
    value,
    icon: Icon,
  }: {
    label: string;
    value: string;
    icon: any;
  }) => (
    <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="h-4 w-4 text-blue-600" />
        <p className="text-xs font-semibold text-gray-500 uppercase">{label}</p>
      </div>
      <p className="text-base font-semibold text-gray-900">{value}</p>
    </div>
  );

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-200 animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-linear-to-br from-blue-500 to-indigo-600 rounded-2xl">
              <UserIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-800">
                {patient.firstname} {patient.lastname}
              </h2>
              <p className="text-sm text-gray-500">
                Patient ID: #{String(patient.id).padStart(4, "0")}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <XMarkIcon className="h-6 w-6 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Personal Information Section */}
          <div>
            <h3 className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wide">
              Personal Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InfoCard
                label="First Name"
                value={patient.firstname}
                icon={UserIcon}
              />
              <InfoCard
                label="Last Name"
                value={patient.lastname}
                icon={UserIcon}
              />
              <InfoCard
                label="Gender"
                value={
                  patient.gender.charAt(0).toUpperCase() +
                  patient.gender.slice(1)
                }
                icon={HeartIcon}
              />
              <InfoCard
                label="Date of Birth"
                value={new Date(patient.dob).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
                icon={CalendarIcon}
              />
              {patient.maidenName && (
                <InfoCard
                  label="Maiden Name"
                  value={patient.maidenName}
                  icon={IdentificationIcon}
                />
              )}
            </div>
          </div>

          {/* Contact Information Section */}
          <div>
            <h3 className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wide">
              Contact Information
            </h3>
            <div className="grid grid-cols-1 gap-4">
              <InfoCard
                label="Phone Number"
                value={`${patient.countryCode} ${patient.phone}`}
                icon={PhoneIcon}
              />
            </div>
          </div>

          {/* Insurance Information Section */}
          <div>
            <h3 className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wide">
              Insurance Information
            </h3>
            <div className="grid grid-cols-1 gap-4">
              <InfoCard
                label="Insurance Type"
                value={patient.insuranceType.toUpperCase()}
                icon={ShieldCheckIcon}
              />
            </div>
          </div>

          {/* Metadata */}
          <div className="pt-4 border-t border-gray-200">
            <div className="flex justify-between text-xs text-gray-500">
              <span>
                Created: {new Date(patient.createdAt).toLocaleDateString()}
              </span>
              <span>
                Updated: {new Date(patient.updatedAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="w-full py-3 px-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-md hover:shadow-lg transform hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

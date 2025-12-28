"use client";

import { UserIcon, XMarkIcon } from "@heroicons/react/24/outline";

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
  patient: Patient | null;
  onClose: () => void;
}

export default function ViewPatientModal({
  patient,
  onClose,
}: ViewPatientModalProps) {
  if (!patient) return null;

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl max-w-2xl w-full p-8 border border-gray-200 dark:border-gray-700 animate-scale-in max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-3">
            <div className="p-3 bg-linear-to-br from-blue-500 to-purple-600 rounded-2xl">
              <UserIcon className="h-6 w-6 text-white" />
            </div>
            Patient Details
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
          >
            <XMarkIcon className="h-6 w-6 text-gray-500" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-2xl">
            <div>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">
                Patient ID
              </p>
              <p className="font-mono text-sm text-gray-900 dark:text-gray-100">
                #{String(patient.id).padStart(4, "0")}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">
                Created At
              </p>
              <p className="text-sm text-gray-900 dark:text-gray-100">
                {new Date(patient.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-100 dark:border-blue-800">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">
                First Name
              </p>
              <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                {patient.firstname}
              </p>
            </div>
            <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl border border-indigo-100 dark:border-indigo-800">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">
                Last Name
              </p>
              <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                {patient.lastname}
              </p>
            </div>
          </div>

          <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-2xl border border-purple-100 dark:border-purple-800">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">
              Gender
            </p>
            <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
              {patient.gender.charAt(0).toUpperCase() + patient.gender.slice(1)}
            </p>
          </div>

          <div className="p-4 bg-pink-50 dark:bg-pink-900/20 rounded-2xl border border-pink-100 dark:border-pink-800">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">
              Date of Birth
            </p>
            <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
              {new Date(patient.dob).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>

          {patient.maidenName && (
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-2xl border border-green-100 dark:border-green-800">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">
                Maiden Name
              </p>
              <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                {patient.maidenName}
              </p>
            </div>
          )}

          <div className="p-4 bg-cyan-50 dark:bg-cyan-900/20 rounded-2xl border border-cyan-100 dark:border-cyan-800">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">
              Phone Number
            </p>
            <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
              {patient.countryCode} {patient.phone}
            </p>
          </div>

          <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-2xl border border-orange-100 dark:border-orange-800">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">
              Insurance Type
            </p>
            <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
              {patient.insuranceType.toUpperCase()}
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full mt-6 py-3 px-6 bg-linear-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white font-semibold rounded-xl shadow-md hover:shadow-lg transform hover:scale-[1.02] active:scale-[0.98] transition-all"
        >
          Close
        </button>
      </div>
    </div>
  );
}

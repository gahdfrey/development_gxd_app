"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import useSWR, { mutate } from "swr";
import { fetcher } from "@/lib/fetcher";
import { COUNTRY_CODES } from "@/lib/constants/countryCodes";
import {
  UserPlusIcon,
  UserIcon,
  CalendarIcon,
  IdentificationIcon,
  HeartIcon,
  ShieldCheckIcon,
  PhoneIcon,
} from "@heroicons/react/24/outline";

interface PatientFormData {
  firstname: string;
  lastname: string;
  gender: string;
  dob: string;
  maidenName: string;
  countryCode: string;
  phone: string;
  insuranceType: string;
}

interface Patient extends PatientFormData {
  id: number;
  createdAt: string;
  updatedAt: string;
}

export default function DashboardPage() {
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    data: patients = [],
    isLoading,
    error,
  } = useSWR<Patient[]>("/api/patients", fetcher);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<PatientFormData>({
    defaultValues: {
      firstname: "",
      lastname: "",
      gender: "",
      dob: "",
      maidenName: "",
      countryCode: "+234",
      phone: "",
      insuranceType: "",
    },
    mode: "onChange",
  });

  const onSubmit = async (data: PatientFormData) => {
    setIsSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const response = await fetch("/api/patients", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create patient");
      }

      await mutate("/api/patients");
      setSuccessMessage("Patient created successfully!");
      reset();

      setTimeout(() => {
        setSuccessMessage("");
      }, 3000);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to create patient"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleViewDetails = (patient: Patient) => {
    setSelectedPatient(patient);
  };

  const closeModal = () => {
    setSelectedPatient(null);
  };

  return (
    <main className="min-h-screen bg-linear-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold bg-linear-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">
            Patient Management
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Create and manage patient records with ease
          </p>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="mb-6 max-w-2xl mx-auto animate-fade-in">
            <div className="bg-linear-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800 rounded-2xl p-4">
              <p className="text-green-700 dark:text-green-300 text-center font-medium">
                ✓ {successMessage}
              </p>
            </div>
          </div>
        )}

        {/* Error Message */}
        {errorMessage && (
          <div className="mb-6 max-w-2xl mx-auto animate-fade-in">
            <div className="bg-red-50 dark:from-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-4">
              <p className="text-red-700 dark:text-red-300 text-center font-medium">
                ✗ {errorMessage}
              </p>
            </div>
          </div>
        )}

        {/* Patient Form */}
        <div className="mb-8 max-w-2xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl p-6 md:p-8 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-linear-to-br from-blue-500 to-indigo-600 rounded-2xl">
                <UserPlusIcon className="h-6 w-6 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                Create New Patient
              </h2>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              {/* Name Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label
                    htmlFor="firstname"
                    className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300"
                  >
                    <UserIcon className="h-4 w-4" />
                    First Name *
                  </label>
                  <input
                    {...register("firstname", {
                      required: "First name is required",
                      minLength: {
                        value: 2,
                        message: "Minimum 2 characters required",
                      },
                    })}
                    type="text"
                    id="firstname"
                    className={`w-full px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                      errors.firstname
                        ? "border-red-500 bg-red-50 dark:bg-red-900/20"
                        : "border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700"
                    }`}
                    placeholder="John"
                  />
                  {errors.firstname && (
                    <p className="text-xs text-red-600 dark:text-red-400">
                      {errors.firstname.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="lastname"
                    className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300"
                  >
                    <UserIcon className="h-4 w-4" />
                    Last Name *
                  </label>
                  <input
                    {...register("lastname", {
                      required: "Last name is required",
                      minLength: {
                        value: 2,
                        message: "Minimum 2 characters required",
                      },
                    })}
                    type="text"
                    id="lastname"
                    className={`w-full px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                      errors.lastname
                        ? "border-red-500 bg-red-50 dark:bg-red-900/20"
                        : "border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700"
                    }`}
                    placeholder="Doe"
                  />
                  {errors.lastname && (
                    <p className="text-xs text-red-600 dark:text-red-400">
                      {errors.lastname.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Gender and DOB */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label
                    htmlFor="gender"
                    className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300"
                  >
                    <HeartIcon className="h-4 w-4" />
                    Gender *
                  </label>
                  <div className="relative">
                    <select
                      {...register("gender", {
                        required: "Please select a gender",
                      })}
                      id="gender"
                      className={`w-full px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all appearance-none bg-gray-50 dark:bg-gray-700 cursor-pointer ${
                        errors.gender
                          ? "border-red-500 bg-red-50 dark:bg-red-900/20"
                          : "border-gray-300 dark:border-gray-600"
                      }`}
                    >
                      <option value="">Select Gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </div>
                  </div>
                  {errors.gender && (
                    <p className="text-xs text-red-600 dark:text-red-400">
                      {errors.gender.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="dob"
                    className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300"
                  >
                    <CalendarIcon className="h-4 w-4" />
                    Date of Birth *
                  </label>
                  <input
                    {...register("dob", {
                      required: "Date of birth is required",
                    })}
                    type="date"
                    id="dob"
                    className={`w-full px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                      errors.dob
                        ? "border-red-500 bg-red-50 dark:bg-red-900/20"
                        : "border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700"
                    }`}
                  />
                  {errors.dob && (
                    <p className="text-xs text-red-600 dark:text-red-400">
                      {errors.dob.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Maiden Name */}
              <div className="space-y-2">
                <label
                  htmlFor="maidenName"
                  className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300"
                >
                  <IdentificationIcon className="h-4 w-4" />
                  Maiden Name
                </label>
                <input
                  {...register("maidenName")}
                  type="text"
                  id="maidenName"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700 transition-all"
                  placeholder="Optional"
                />
              </div>

              {/* Phone Number with Country Code */}
              <div className="space-y-2">
                <label
                  htmlFor="phone"
                  className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300"
                >
                  <PhoneIcon className="h-4 w-4" />
                  Phone Number *
                </label>
                <div className="grid grid-cols-5 gap-2">
                  <div className="col-span-2 relative">
                    <select
                      {...register("countryCode", {
                        required: "Country code is required",
                      })}
                      id="countryCode"
                      className={`w-full px-2 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all appearance-none bg-gray-50 dark:bg-gray-700 cursor-pointer ${
                        errors.countryCode
                          ? "border-red-500 bg-red-50 dark:bg-red-900/20"
                          : "border-gray-300 dark:border-gray-600"
                      }`}
                    >
                      {COUNTRY_CODES.map((country) => (
                        <option key={country.code} value={country.code}>
                          {country.flag} {country.code}
                        </option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </div>
                  </div>
                  <div className="col-span-3">
                    <input
                      {...register("phone", {
                        required: "Phone number is required",
                        pattern: {
                          value: /^[0-9]{7,15}$/,
                          message: "Enter a valid phone number",
                        },
                      })}
                      type="tel"
                      id="phone"
                      className={`w-full px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                        errors.phone
                          ? "border-red-500 bg-red-50 dark:bg-red-900/20"
                          : "border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700"
                      }`}
                      placeholder="8012345678"
                    />
                  </div>
                </div>
                {(errors.countryCode || errors.phone) && (
                  <p className="text-xs text-red-600 dark:text-red-400">
                    {errors.countryCode?.message || errors.phone?.message}
                  </p>
                )}
              </div>

              {/* Insurance Type */}
              <div className="space-y-2">
                <label
                  htmlFor="insuranceType"
                  className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300"
                >
                  <ShieldCheckIcon className="h-4 w-4" />
                  Insurance Type *
                </label>
                <div className="relative">
                  <select
                    {...register("insuranceType", {
                      required: "Please select an insurance type",
                    })}
                    id="insuranceType"
                    className={`w-full px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all appearance-none bg-gray-50 dark:bg-gray-700 cursor-pointer ${
                      errors.insuranceType
                        ? "border-red-500 bg-red-50 dark:bg-red-900/20"
                        : "border-gray-300 dark:border-gray-600"
                    }`}
                  >
                    <option value="">Select Insurance Type</option>
                    <option value="private">Private</option>
                    <option value="hmo">HMO</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </div>
                </div>
                {errors.insuranceType && (
                  <p className="text-xs text-red-600 dark:text-red-400">
                    {errors.insuranceType.message}
                  </p>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 px-6 bg-linear-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 disabled:cursor-not-allowed disabled:transform-none"
              >
                <span className="flex items-center justify-center gap-2">
                  {isSubmitting ? (
                    <>
                      <svg
                        className="animate-spin h-5 w-5 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Creating...
                    </>
                  ) : (
                    <>
                      <UserPlusIcon className="h-5 w-5" />
                      Create Patient
                    </>
                  )}
                </span>
              </button>
            </form>
          </div>
        </div>

        {/* Patients Table */}
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-700">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
              <div className="p-2 bg-linear-to-br from-purple-500 to-pink-600 rounded-xl">
                <svg
                  className="h-5 w-5 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>
              </div>
              Patient Records ({isLoading ? "..." : patients.length})
            </h2>
          </div>

          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="p-12 text-center">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-full mb-4">
                  <svg
                    className="animate-spin h-10 w-10 text-blue-600"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                </div>
                <p className="text-gray-500 dark:text-gray-400 font-medium">
                  Loading patients...
                </p>
              </div>
            ) : error ? (
              <div className="p-12 text-center">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-red-100 dark:bg-red-900/20 rounded-full mb-4">
                  <svg
                    className="h-10 w-10 text-red-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <p className="text-red-600 dark:text-red-400 font-medium">
                  Failed to load patients
                </p>
              </div>
            ) : patients.length === 0 ? (
              <div className="p-12 text-center">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-full mb-4">
                  <UserIcon className="h-10 w-10 text-gray-400" />
                </div>
                <p className="text-gray-500 dark:text-gray-400 mb-2 font-medium">
                  No patients yet
                </p>
                <p className="text-sm text-gray-400 dark:text-gray-500">
                  Create your first patient using the form above
                </p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="bg-linear-to-r from-blue-50 to-indigo-50 dark:from-gray-700 dark:to-gray-700 border-b border-gray-200 dark:border-gray-600">
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Patient ID
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Full Name
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Gender
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Phone
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Insurance
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {patients.map((patient) => (
                    <tr
                      key={patient.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-mono text-gray-600 dark:text-gray-400">
                          #{String(patient.id).padStart(4, "0")}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {patient.firstname} {patient.lastname}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                          {patient.gender.charAt(0).toUpperCase() +
                            patient.gender.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900 dark:text-gray-100">
                          {patient.countryCode} {patient.phone}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                            patient.insuranceType === "private"
                              ? "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300"
                              : "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                          }`}
                        >
                          {patient.insuranceType.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => handleViewDetails(patient)}
                          className="inline-flex items-center gap-1 px-4 py-2 bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-medium rounded-lg shadow-md hover:shadow-lg transform hover:scale-105 active:scale-95 transition-all"
                        >
                          <svg
                            className="h-4 w-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                            />
                          </svg>
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* View Details Modal */}
        {selectedPatient && (
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in"
            onClick={closeModal}
          >
            <div
              className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl max-w-2xl w-full p-8 border border-gray-200 dark:border-gray-700 animate-scale-in"
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
                  onClick={closeModal}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                >
                  <svg
                    className="h-6 w-6 text-gray-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-2xl">
                  <div>
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">
                      Patient ID
                    </p>
                    <p className="font-mono text-sm text-gray-900 dark:text-gray-100">
                      #{String(selectedPatient.id).padStart(4, "0")}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">
                      Created At
                    </p>
                    <p className="text-sm text-gray-900 dark:text-gray-100">
                      {new Date(selectedPatient.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-100 dark:border-blue-800">
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">
                      First Name
                    </p>
                    <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                      {selectedPatient.firstname}
                    </p>
                  </div>
                  <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl border border-indigo-100 dark:border-indigo-800">
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">
                      Last Name
                    </p>
                    <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                      {selectedPatient.lastname}
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-2xl border border-purple-100 dark:border-purple-800">
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">
                    Gender
                  </p>
                  <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                    {selectedPatient.gender.charAt(0).toUpperCase() +
                      selectedPatient.gender.slice(1)}
                  </p>
                </div>

                <div className="p-4 bg-pink-50 dark:bg-pink-900/20 rounded-2xl border border-pink-100 dark:border-pink-800">
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">
                    Date of Birth
                  </p>
                  <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                    {new Date(selectedPatient.dob).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>

                {selectedPatient.maidenName && (
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-2xl border border-green-100 dark:border-green-800">
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">
                      Maiden Name
                    </p>
                    <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                      {selectedPatient.maidenName}
                    </p>
                  </div>
                )}

                <div className="p-4 bg-cyan-50 dark:bg-cyan-900/20 rounded-2xl border border-cyan-100 dark:border-cyan-800">
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">
                    Phone Number
                  </p>
                  <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                    {selectedPatient.countryCode} {selectedPatient.phone}
                  </p>
                </div>

                <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-2xl border border-orange-100 dark:border-orange-800">
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">
                    Insurance Type
                  </p>
                  <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                    {selectedPatient.insuranceType.toUpperCase()}
                  </p>
                </div>
              </div>

              <button
                onClick={closeModal}
                className="w-full mt-6 py-3 px-6 bg-linear-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white font-semibold rounded-xl shadow-md hover:shadow-lg transform hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes scale-in {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }

        .animate-scale-in {
          animation: scale-in 0.3s ease-out;
        }
      `}</style>
    </main>
  );
}

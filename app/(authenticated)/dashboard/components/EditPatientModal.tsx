"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import useSWR, { mutate } from "swr";
import { fetcher } from "@/lib/fetcher";
import { COUNTRY_CODES } from "@/lib/constants/countryCodes";
import {
  PencilSquareIcon,
  UserIcon,
  CalendarIcon,
  IdentificationIcon,
  HeartIcon,
  ShieldCheckIcon,
  PhoneIcon,
  XMarkIcon,
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
}

interface EditPatientModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientId: number | null;
  onSuccess?: () => void;
}

export default function EditPatientModal({
  isOpen,
  onClose,
  patientId,
  onSuccess,
}: EditPatientModalProps) {
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch patient data by ID
  const {
    data: patient,
    isLoading,
    error,
  } = useSWR<Patient>(patientId ? `/api/patients/${patientId}` : null, fetcher);

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

  // Update form values when patient data is loaded
  useEffect(() => {
    if (patient) {
      reset({
        firstname: patient.firstname,
        lastname: patient.lastname,
        gender: patient.gender,
        dob: patient.dob.split("T")[0], // Convert to YYYY-MM-DD format
        maidenName: patient.maidenName,
        countryCode: patient.countryCode,
        phone: patient.phone,
        insuranceType: patient.insuranceType,
      });
    }
  }, [patient, reset]);

  const onSubmit = async (data: PatientFormData) => {
    if (!patient) return;

    setIsSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const response = await fetch(`/api/patients/${patient.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update patient");
      }

      await mutate("/api/patients");
      setSuccessMessage("Patient updated successfully!");

      setTimeout(() => {
        setSuccessMessage("");
        onClose();
        onSuccess?.();
      }, 1500);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to update patient"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setSuccessMessage("");
      setErrorMessage("");
      onClose();
    }
  };

  if (!isOpen || !patientId) return null;

  // Show loading state while fetching patient data
  if (isLoading) {
    return (
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in"
        onClick={handleClose}
      >
        <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full p-12 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  // Show error state if patient data fails to load
  if (error || !patient) {
    return (
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in"
        onClick={handleClose}
      >
        <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full p-12">
          <p className="text-red-600 text-center mb-4">
            Failed to load patient data
          </p>
          <button
            onClick={handleClose}
            className="w-full py-3 px-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in"
      onClick={handleClose}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto border border-gray-200 animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-linear-to-br from-blue-500 to-indigo-600 rounded-2xl">
              <PencilSquareIcon className="h-6 w-6 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800">Edit Patient</h2>
          </div>
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50"
          >
            <XMarkIcon className="h-6 w-6 text-gray-500" />
          </button>
        </div>

        <div className="p-6">
          {/* Success Message */}
          {successMessage && (
            <div className="mb-6 animate-fade-in">
              <div className="bg-linear-to-r from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-4">
                <p className="text-green-700 text-center font-medium">
                  ✓ {successMessage}
                </p>
              </div>
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="mb-6 animate-fade-in">
              <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
                <p className="text-red-700 text-center font-medium">
                  ✗ {errorMessage}
                </p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Name Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label
                  htmlFor="firstname"
                  className="flex items-center gap-2 text-sm font-semibold text-gray-700"
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
                      ? "border-red-500 bg-red-50"
                      : "border-gray-300 bg-gray-50"
                  }`}
                  placeholder="John"
                />
                {errors.firstname && (
                  <p className="text-xs text-red-600">
                    {errors.firstname.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="lastname"
                  className="flex items-center gap-2 text-sm font-semibold text-gray-700"
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
                      ? "border-red-500 bg-red-50"
                      : "border-gray-300 bg-gray-50"
                  }`}
                  placeholder="Doe"
                />
                {errors.lastname && (
                  <p className="text-xs text-red-600">
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
                  className="flex items-center gap-2 text-sm font-semibold text-gray-700"
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
                    className={`w-full px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all appearance-none bg-gray-50 cursor-pointer ${
                      errors.gender
                        ? "border-red-500 bg-red-50"
                        : "border-gray-300"
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
                  <p className="text-xs text-red-600">
                    {errors.gender.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="dob"
                  className="flex items-center gap-2 text-sm font-semibold text-gray-700"
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
                      ? "border-red-500 bg-red-50"
                      : "border-gray-300 bg-gray-50"
                  }`}
                />
                {errors.dob && (
                  <p className="text-xs text-red-600">{errors.dob.message}</p>
                )}
              </div>
            </div>

            {/* Maiden Name */}
            <div className="space-y-2">
              <label
                htmlFor="maidenName"
                className="flex items-center gap-2 text-sm font-semibold text-gray-700"
              >
                <IdentificationIcon className="h-4 w-4" />
                Maiden Name
              </label>
              <input
                {...register("maidenName")}
                type="text"
                id="maidenName"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 transition-all"
                placeholder="Optional"
              />
            </div>

            {/* Phone Number with Country Code */}
            <div className="space-y-2">
              <label
                htmlFor="phone"
                className="flex items-center gap-2 text-sm font-semibold text-gray-700"
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
                    className={`w-full px-2 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all appearance-none bg-gray-50 cursor-pointer ${
                      errors.countryCode
                        ? "border-red-500 bg-red-50"
                        : "border-gray-300"
                    }`}
                  >
                    {COUNTRY_CODES.map((country) => (
                      <option key={country.countryCode} value={country.code}>
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
                        ? "border-red-500 bg-red-50"
                        : "border-gray-300 bg-gray-50"
                    }`}
                    placeholder="8012345678"
                  />
                </div>
              </div>
              {(errors.countryCode || errors.phone) && (
                <p className="text-xs text-red-600">
                  {errors.countryCode?.message || errors.phone?.message}
                </p>
              )}
            </div>

            {/* Insurance Type */}
            <div className="space-y-2">
              <label
                htmlFor="insuranceType"
                className="flex items-center gap-2 text-sm font-semibold text-gray-700"
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
                  className={`w-full px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all appearance-none bg-gray-50 cursor-pointer ${
                    errors.insuranceType
                      ? "border-red-500 bg-red-50"
                      : "border-gray-300"
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
                <p className="text-xs text-red-600">
                  {errors.insuranceType.message}
                </p>
              )}
            </div>

            {/* Submit Button */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={handleClose}
                disabled={isSubmitting}
                className="flex-1 py-3 px-6 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 py-3 px-6 bg-linear-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 disabled:cursor-not-allowed disabled:transform-none"
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
                      Updating...
                    </>
                  ) : (
                    <>
                      <PencilSquareIcon className="h-5 w-5" />
                      Update Patient
                    </>
                  )}
                </span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

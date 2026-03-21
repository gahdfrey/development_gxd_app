"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { mutate } from "swr";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { HMO } from "@/lib/db/schema";
import { useToast } from "@/app/contexts/ToastContext";
import {
  UserPlusIcon,
  UserIcon,
  HeartIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import FormSection from "./form/FormSection";
import PatientDetailsFields from "./PatientDetailsFields";
import NextOfKinFields from "./NextOfKinFields";

interface PatientFormData {
  firstname: string;
  lastname: string;
  gender: string;
  dob: string;
  maidenName: string;
  email: string;
  countryCode: string;
  phone: string;
  insuranceType: string;
  hmoId?: string;
  policyNumber?: string;
  nextOfKinFirstname: string;
  nextOfKinLastname: string;
  nextOfKinRelationship: string;
  nextOfKinAddress: string;
  nextOfKinPhone: string;
  nextOfKinEmail: string;
}

interface CreatePatientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function CreatePatientModal({
  isOpen,
  onClose,
  onSuccess,
}: CreatePatientModalProps) {
  const { data: hmos } = useSWR<HMO[]>("/api/hmo", fetcher);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showToast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setError,
  } = useForm<PatientFormData>({
    defaultValues: {
      firstname: "",
      lastname: "",
      gender: "",
      dob: "",
      maidenName: "",
      email: "",
      countryCode: "+234",
      phone: "",
      insuranceType: "",
      hmoId: "",
      policyNumber: "",
      nextOfKinFirstname: "",
      nextOfKinLastname: "",
      nextOfKinRelationship: "",
      nextOfKinAddress: "",
      nextOfKinPhone: "",
      nextOfKinEmail: "",
    },
    mode: "onSubmit",
    reValidateMode: "onChange",
  });

  const insuranceType = watch("insuranceType");

  const onSubmit = async (data: PatientFormData) => {
    setIsSubmitting(true);
    setErrorMessage("");

    if (data.insuranceType === "hmo") {
      if (!data.hmoId || data.hmoId === "") {
        setError("hmoId", { message: "Please select an HMO" });
        setIsSubmitting(false);
        return;
      }
      if (!data.policyNumber || data.policyNumber.trim() === "") {
        setError("policyNumber", {
          message: "Policy number is required for HMO insurance",
        });
        setIsSubmitting(false);
        return;
      }
    }

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

      await mutate(
        (key) => typeof key === "string" && key.startsWith("/api/patients"),
        undefined,
        { revalidate: true },
      );

      // Show success toast
      showToast("Patient created successfully!", "success");

      // Close modal immediately and clean up
      reset();
      onClose();
      onSuccess?.();
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : "Failed to create patient";
      setErrorMessage(errorMsg);
      showToast(errorMsg, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      reset();
      setErrorMessage("");
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in"
      onClick={handleClose}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-gray-200 animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between z-10 rounded-t-3xl">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-linear-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-lg">
              <UserPlusIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-800">
                Create New Patient
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Complete patient and emergency contact information
              </p>
            </div>
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

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            {/* Patient Details Section */}
            <FormSection
              icon={<UserIcon className="h-5 w-5" />}
              title="Patient Details"
              accentColor="blue"
            >
              <PatientDetailsFields
                register={register}
                errors={errors}
                hmos={hmos}
                insuranceType={insuranceType}
              />
            </FormSection>

            {/* Divider */}
            <div className="relative py-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t-2 border-dashed border-gray-300"></div>
              </div>
            </div>

            {/* Next of Kin Section */}
            <FormSection
              icon={<HeartIcon className="h-5 w-5" />}
              title="Next of Kin Information"
              subtitle="Emergency contact details"
              accentColor="purple"
            >
              <NextOfKinFields register={register} errors={errors} />
            </FormSection>

            {/* Submit Button */}
            <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={handleClose}
                disabled={isSubmitting}
                className="px-6 py-3 text-sm font-medium text-gray-700 bg-white border-2 border-gray-300 rounded-xl hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-8 py-3 text-sm font-medium text-white bg-linear-to-r from-blue-600 to-indigo-600 border border-transparent rounded-xl hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <svg
                      className="animate-spin h-4 w-4"
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
                    <UserPlusIcon className="h-4 w-4" />
                    Create Patient
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

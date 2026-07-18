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

interface DuplicateMatch {
  id: number;
  mrn: string | null;
  firstname: string;
  lastname: string;
  dob?: string;
  phone?: string;
  countryCode?: string;
}

interface PatientFormData {
  firstname: string;
  lastname: string;
  gender: string;
  dob: string;
  maidenName: string;
  nin: string;
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
  consentGiven: boolean;
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
  const [duplicateMatches, setDuplicateMatches] = useState<DuplicateMatch[] | null>(null);
  const [pendingData, setPendingData] = useState<PatientFormData | null>(null);
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
      nin: "",
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
      consentGiven: false,
    },
    mode: "onSubmit",
    reValidateMode: "onChange",
  });

  const insuranceType = watch("insuranceType");

  const submitPatient = async (data: PatientFormData, allowDuplicate: boolean) => {
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
        body: JSON.stringify({ ...data, allowDuplicate }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        // Possible duplicate: show the matches and let staff decide.
        if (response.status === 409 && errorData.duplicateWarning) {
          setDuplicateMatches(errorData.matches ?? []);
          setPendingData(data);
          setIsSubmitting(false);
          return;
        }
        throw new Error(errorData.error || "Failed to create patient");
      }

      setDuplicateMatches(null);
      setPendingData(null);

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

  const onSubmit = (data: PatientFormData) => submitPatient(data, false);

  const handleClose = () => {
    if (!isSubmitting) {
      reset();
      setErrorMessage("");
      setDuplicateMatches(null);
      setPendingData(null);
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

            {/* Duplicate warning (NDHA: one patient, one health record) */}
            {duplicateMatches && duplicateMatches.length > 0 && (
              <div className="rounded-2xl border-2 border-amber-200 bg-amber-50 p-5 animate-fade-in">
                <p className="font-semibold text-amber-900 mb-2">
                  ⚠ Possible duplicate patient
                </p>
                <p className="text-sm text-amber-800 mb-3">
                  A patient with matching details already exists. Please check
                  before creating a new record — duplicate records split a
                  patient&apos;s medical history.
                </p>
                <ul className="space-y-1.5 mb-4">
                  {duplicateMatches.map((m) => (
                    <li
                      key={m.id}
                      className="text-sm text-amber-900 bg-white/70 border border-amber-200 rounded-lg px-3 py-2"
                    >
                      <span className="font-semibold">
                        {m.firstname} {m.lastname}
                      </span>{" "}
                      — {m.mrn ?? "no MRN"}
                      {m.dob ? ` · DOB ${m.dob}` : ""}
                      {m.phone ? ` · ${m.countryCode ?? ""}${m.phone}` : ""}
                    </li>
                  ))}
                </ul>
                <div className="flex gap-3">
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => {
                      setDuplicateMatches(null);
                      setPendingData(null);
                    }}
                    className="px-4 py-2 text-sm font-medium text-amber-900 bg-white border border-amber-300 rounded-lg hover:bg-amber-100 transition-colors disabled:opacity-50"
                  >
                    Go back and check
                  </button>
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => pendingData && submitPatient(pendingData, true)}
                    className="px-4 py-2 text-sm font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50"
                  >
                    This is a different person — create anyway
                  </button>
                </div>
              </div>
            )}

            {/* Data Processing Consent (NDPA 2023) */}
            <div className="rounded-2xl border-2 border-blue-100 bg-blue-50/60 p-5">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  {...register("consentGiven", {
                    required:
                      "Patient consent is required before registration can be completed",
                  })}
                  className="mt-1 h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 leading-relaxed">
                  <span className="font-semibold text-gray-900">
                    Patient consent confirmed.
                  </span>{" "}
                  The patient (or their legal guardian) has consented to the
                  collection and processing of their personal and health
                  information for the purpose of care delivery, in line with
                  the Nigeria Data Protection Act 2023. The patient may
                  withdraw this consent at any time.
                </span>
              </label>
              {errors.consentGiven && (
                <p className="mt-2 ml-8 text-sm text-red-600">
                  {errors.consentGiven.message}
                </p>
              )}
            </div>

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

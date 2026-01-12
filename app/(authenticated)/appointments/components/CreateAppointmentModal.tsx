"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { mutate } from "swr";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import SearchableSelect, {
  SearchableSelectOption,
} from "@/app/components/ui/SearchableSelect";
import {
  CalendarIcon,
  ClockIcon,
  DocumentTextIcon,
  UserIcon,
  CheckCircleIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

interface AppointmentFormData {
  patientId: number | null;
  doctorId: number | null;
  appointmentDate: string;
  appointmentTime: string;
  status: string;
  notes: string;
}

interface CreateAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface Patient {
  id: number;
  firstname: string;
  lastname: string;
  dob: string;
}

interface Doctor {
  id: number;
  firstname: string;
  lastname: string;
  email: string;
}

export default function CreateAppointmentModal({
  isOpen,
  onClose,
  onSuccess,
}: CreateAppointmentModalProps) {
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state for searchable selects
  const [selectedPatient, setSelectedPatient] =
    useState<SearchableSelectOption | null>(null);
  const [selectedDoctor, setSelectedDoctor] =
    useState<SearchableSelectOption | null>(null);

  // Fetch patients and doctors
  const { data: patients = [] } = useSWR<Patient[]>("/api/patients", fetcher);
  const { data: doctors = [] } = useSWR<Doctor[]>("/api/doctors", fetcher);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<AppointmentFormData>({
    defaultValues: {
      patientId: null,
      doctorId: null,
      appointmentDate: "",
      appointmentTime: "",
      status: "scheduled",
      notes: "",
    },
    mode: "onChange",
  });

  // Convert patients and doctors to searchable options
  const patientOptions: SearchableSelectOption[] = patients.map((patient) => ({
    id: patient.id,
    label: `${patient.firstname} ${patient.lastname}`,
    sublabel: `DOB: ${patient.dob}`,
  }));

  const doctorOptions: SearchableSelectOption[] = doctors.map((doctor) => ({
    id: doctor.id,
    label: `Dr. ${doctor.firstname} ${doctor.lastname}`,
    sublabel: doctor.email,
  }));

  // Generate time slots (9:00 AM to 12:00 AM in 30-minute intervals)
  const timeSlots = [];
  for (let hour = 9; hour <= 23; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const timeString = `${hour.toString().padStart(2, "0")}:${minute
        .toString()
        .padStart(2, "0")}`;
      const displayTime = new Date(
        `1970-01-01T${timeString}`
      ).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
      timeSlots.push({ value: timeString, label: displayTime });
    }
  }
  // Add 12:00 AM (midnight) as the last slot
  timeSlots.push({ value: "00:00", label: "12:00 AM" });

  const onSubmit = async (data: AppointmentFormData) => {
    if (!selectedPatient || !selectedDoctor) {
      setErrorMessage("Please select both patient and doctor");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const response = await fetch("/api/appointments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          patientId: selectedPatient.id,
          doctorId: selectedDoctor.id,
          appointmentDate: data.appointmentDate,
          appointmentTime: data.appointmentTime,
          status: data.status,
          notes: data.notes,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create appointment");
      }

      await mutate("/api/appointments");
      setSuccessMessage("Appointment created successfully!");
      reset();
      setSelectedPatient(null);
      setSelectedDoctor(null);

      setTimeout(() => {
        setSuccessMessage("");
        onClose();
        onSuccess?.();
      }, 1500);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to create appointment"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      reset();
      setSelectedPatient(null);
      setSelectedDoctor(null);
      setSuccessMessage("");
      setErrorMessage("");
      onClose();
    }
  };

  if (!isOpen) return null;

  // Get today's date in YYYY-MM-DD format for min date
  const today = new Date().toISOString().split("T")[0];

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in"
      onClick={handleClose}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-200 animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-linear-to-br from-blue-500 to-indigo-600 rounded-2xl">
              <CalendarIcon className="h-6 w-6 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800">
              Create Appointment
            </h2>
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
            {/* Patient Selection */}
            <SearchableSelect
              options={patientOptions}
              value={selectedPatient}
              onChange={(value) => {
                setSelectedPatient(value);
                setValue("patientId", value ? Number(value.id) : null);
              }}
              placeholder="Search patient by name..."
              label="Patient *"
              icon={UserIcon}
              error={
                !selectedPatient && errors.patientId
                  ? "Patient is required"
                  : undefined
              }
            />

            {/* Doctor Selection */}
            <SearchableSelect
              options={doctorOptions}
              value={selectedDoctor}
              onChange={(value) => {
                setSelectedDoctor(value);
                setValue("doctorId", value ? Number(value.id) : null);
              }}
              placeholder="Search doctor by name..."
              label="Doctor *"
              icon={UserIcon}
              error={
                !selectedDoctor && errors.doctorId
                  ? "Doctor is required"
                  : undefined
              }
            />

            {/* Date and Time */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label
                  htmlFor="appointmentDate"
                  className="flex items-center gap-2 text-sm font-semibold text-gray-700"
                >
                  <CalendarIcon className="h-4 w-4" />
                  Appointment Date *
                </label>
                <input
                  {...register("appointmentDate", {
                    required: "Date is required",
                  })}
                  type="date"
                  id="appointmentDate"
                  min={today}
                  className={`w-full px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                    errors.appointmentDate
                      ? "border-red-500 bg-red-50"
                      : "border-gray-300 bg-gray-50"
                  }`}
                />
                {errors.appointmentDate && (
                  <p className="text-xs text-red-600">
                    {errors.appointmentDate.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="appointmentTime"
                  className="flex items-center gap-2 text-sm font-semibold text-gray-700"
                >
                  <ClockIcon className="h-4 w-4" />
                  Appointment Time *
                </label>
                <div className="relative">
                  <select
                    {...register("appointmentTime", {
                      required: "Time is required",
                    })}
                    id="appointmentTime"
                    className={`w-full px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all appearance-none bg-gray-50 cursor-pointer ${
                      errors.appointmentTime
                        ? "border-red-500 bg-red-50"
                        : "border-gray-300"
                    }`}
                  >
                    <option value="">Select Time</option>
                    {timeSlots.map((slot) => (
                      <option key={slot.value} value={slot.value}>
                        {slot.label}
                      </option>
                    ))}
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
                {errors.appointmentTime && (
                  <p className="text-xs text-red-600">
                    {errors.appointmentTime.message}
                  </p>
                )}
              </div>
            </div>

            {/* Status */}
            <div className="space-y-2">
              <label
                htmlFor="status"
                className="flex items-center gap-2 text-sm font-semibold text-gray-700"
              >
                <CheckCircleIcon className="h-4 w-4" />
                Status *
              </label>
              <div className="relative">
                <select
                  {...register("status", {
                    required: "Status is required",
                  })}
                  id="status"
                  className={`w-full px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all appearance-none bg-gray-50 cursor-pointer ${
                    errors.status
                      ? "border-red-500 bg-red-50"
                      : "border-gray-300"
                  }`}
                >
                  <option value="scheduled">Scheduled</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="no-show">No-Show</option>
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
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <label
                htmlFor="notes"
                className="flex items-center gap-2 text-sm font-semibold text-gray-700"
              >
                <DocumentTextIcon className="h-4 w-4" />
                Notes (Optional)
              </label>
              <textarea
                {...register("notes")}
                id="notes"
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 transition-all resize-none"
                placeholder="Add any additional notes..."
              />
            </div>

            {/* Submit Buttons */}
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
                      Creating...
                    </>
                  ) : (
                    <>
                      <CalendarIcon className="h-5 w-5" />
                      Create Appointment
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

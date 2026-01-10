"use client";

import { useState, useEffect, useRef } from "react";
import Modal from "@/app/components/ui/Modal";
import { mutate } from "swr";
import { useSession } from "next-auth/react";

interface Patient {
  id: number;
  firstname: string;
  lastname: string;
  gender: string;
  dob: string;
  phone: string;
  countryCode: string;
}

interface Appointment {
  id: number;
  appointmentDate: string;
  appointmentTime: string;
  status: string;
  notes: string | null;
  patient: Patient | null;
}

interface ConsultationModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: Appointment;
}

export default function ConsultationModal({
  isOpen,
  onClose,
  appointment,
}: ConsultationModalProps) {
  const { data: session } = useSession();
  const [doctorNotes, setDoctorNotes] = useState("");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const startTimeRef = useRef<Date | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Start timer when modal opens
  useEffect(() => {
    if (isOpen) {
      startTimeRef.current = new Date();
      setElapsedSeconds(0);
      setDoctorNotes("");

      // Start the timer
      timerIntervalRef.current = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    }

    // Cleanup timer when modal closes
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
  }, [isOpen]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  const handleEndConsultation = async () => {
    if (!startTimeRef.current || !appointment.patient || !session?.user) return;

    setIsSubmitting(true);

    try {
      const endTime = new Date();
      const durationMinutes = Math.ceil(elapsedSeconds / 60);

      const response = await fetch("/api/visits", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          appointmentId: appointment.id,
          patientId: appointment.patient.id,
          doctorId: (session.user as any).id,
          doctorNotes,
          durationMinutes,
          startTime: startTimeRef.current.toISOString(),
          endTime: endTime.toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save visit");
      }

      // Refresh appointments list
      await mutate("/api/my-appointments");

      // Close modal
      onClose();
    } catch (error) {
      console.error("Error saving visit:", error);
      alert("Failed to save consultation. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!appointment.patient) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Consultation in Progress"
      size="large"
    >
      <div className="space-y-6">
        {/* Timer in top right corner */}
        <div className="absolute top-6 right-6">
          <div className="text-right">
            <p className="text-xs text-gray-500 mb-1">Duration</p>
            <p className="text-2xl font-bold text-blue-600">
              {formatTime(elapsedSeconds)}
            </p>
          </div>
        </div>

        {/* Patient Information */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            Patient Information
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Name</p>
              <p className="text-base font-medium text-gray-900">
                {appointment.patient.firstname} {appointment.patient.lastname}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Gender</p>
              <p className="text-base font-medium text-gray-900 capitalize">
                {appointment.patient.gender}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Date of Birth</p>
              <p className="text-base font-medium text-gray-900">
                {appointment.patient.dob}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Phone</p>
              <p className="text-base font-medium text-gray-900">
                {appointment.patient.countryCode} {appointment.patient.phone}
              </p>
            </div>
          </div>
        </div>

        {/* Appointment Details */}
        <div className="bg-blue-50 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            Appointment Details
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Date</p>
              <p className="text-base font-medium text-gray-900">
                {appointment.appointmentDate}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Time</p>
              <p className="text-base font-medium text-gray-900">
                {appointment.appointmentTime}
              </p>
            </div>
          </div>
        </div>

        {/* Doctor's Notes */}
        <div>
          <label
            htmlFor="doctorNotes"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Doctor's Notes
          </label>
          <textarea
            id="doctorNotes"
            value={doctorNotes}
            onChange={(e) => setDoctorNotes(e.target.value)}
            rows={8}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            placeholder="Enter consultation notes, diagnosis, prescriptions, recommendations, etc."
          />
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="px-6 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleEndConsultation}
            disabled={isSubmitting}
            className="px-6 py-2.5 text-sm font-medium text-white bg-green-600 border border-transparent rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Saving..." : "End Consultation"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

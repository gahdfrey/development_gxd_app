"use client";

import { useState, useEffect, useRef } from "react";
import Modal from "@/app/components/ui/Modal";
import { mutate } from "swr";
import type { Session } from "next-auth";
import { useRouter } from "next/navigation";
import {
  CalendarDaysIcon,
  CheckCircleIcon,
  ClipboardDocumentListIcon,
  PhoneIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import DiagnosisPicker, { Diagnosis } from "./DiagnosisPicker";

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
  visitType: string;
  notes: string | null;
  patient: Patient | null;
}

interface ConsultationModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: Appointment;
  session: Session | null;
}

function ageFromDob(dob: string): number | null {
  const birth = new Date(dob);
  if (isNaN(birth.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
  return age >= 0 ? age : null;
}

export default function ConsultationModal({
  isOpen,
  onClose,
  appointment,
  session,
}: ConsultationModalProps) {
  const router = useRouter();
  const [doctorNotes, setDoctorNotes] = useState("");
  const [diagnoses, setDiagnoses] = useState<Diagnosis[]>([]);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDxGptModalOpen, setIsDxGptModalOpen] = useState(false);
  const startTimeRef = useRef<Date | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Start timer when modal opens
  useEffect(() => {
    if (isOpen) {
      startTimeRef.current = new Date();
      setElapsedSeconds(0);
      setDoctorNotes("");
      setDiagnoses([]);

      timerIntervalRef.current = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    }

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
          diagnoses,
          durationMinutes,
          startTime: startTimeRef.current.toISOString(),
          endTime: endTime.toISOString(),
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || "Failed to save visit");
      }

      await mutate(
        (key) =>
          typeof key === "string" && key.startsWith("/api/my-appointments"),
        undefined,
        { revalidate: true },
      );

      router.refresh();
      onClose();
    } catch (error) {
      console.error("Error saving visit:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Failed to save consultation. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!appointment.patient) return null;

  const { patient } = appointment;
  const age = ageFromDob(patient.dob);
  const initials =
    `${patient.firstname[0] ?? ""}${patient.lastname[0] ?? ""}`.toUpperCase();

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="Consultation" size="large">
        <div className="space-y-5">
          {/* Patient banner */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950 p-5">
            <div
              className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-blue-500/20 blur-3xl"
              aria-hidden
            />
            <div className="relative flex flex-wrap items-center gap-4">
              {/* Avatar */}
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-lg font-bold text-white shadow-lg shadow-blue-900/40">
                {initials}
              </div>

              {/* Identity */}
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-lg font-bold text-white">
                  {patient.firstname} {patient.lastname}
                </h3>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-slate-300">
                  <span className="capitalize">{patient.gender}</span>
                  <span className="text-slate-600">•</span>
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarDaysIcon className="h-3.5 w-3.5 text-slate-400" />
                    {age !== null ? `${age} yrs` : patient.dob}
                  </span>
                  <span className="text-slate-600">•</span>
                  <span className="inline-flex items-center gap-1.5">
                    <PhoneIcon className="h-3.5 w-3.5 text-slate-400" />
                    {patient.countryCode} {patient.phone}
                  </span>
                </div>
                <span className="mt-2 inline-flex items-center rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-blue-200 ring-1 ring-white/10">
                  {appointment.visitType}
                </span>
              </div>

              {/* Live timer */}
              <div className="flex shrink-0 flex-col items-end gap-1">
                <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-emerald-300">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                  </span>
                  In session
                </span>
                <span className="font-mono text-3xl font-bold tabular-nums text-white">
                  {formatTime(elapsedSeconds)}
                </span>
              </div>
            </div>
          </div>

          {/* Diagnoses */}
          <DiagnosisPicker value={diagnoses} onChange={setDiagnoses} />

          {/* Doctor's notes */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label
                htmlFor="doctorNotes"
                className="flex items-center gap-2 text-sm font-semibold text-gray-800"
              >
                <ClipboardDocumentListIcon className="h-4.5 w-4.5 text-blue-600" />
                Consultation Notes
              </label>
              {doctorNotes.length > 0 && (
                <span className="text-xs font-medium text-gray-400">
                  {doctorNotes.length.toLocaleString()} characters
                </span>
              )}
            </div>
            <textarea
              id="doctorNotes"
              value={doctorNotes}
              onChange={(e) => setDoctorNotes(e.target.value)}
              rows={7}
              className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50/60 px-4 py-3 text-sm leading-relaxed text-gray-900 placeholder:text-gray-400 transition-all focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10"
              placeholder="Presenting complaint, findings, treatment plan, recommendations…"
            />
          </div>

          {/* AI assistant */}
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-dashed border-gray-200 bg-gray-50/50 px-4 py-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-sm">
              <SparklesIcon className="h-4.5 w-4.5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-gray-800">
                AI Medical Assistant
              </p>
              <p className="text-xs text-gray-400">
                Advisory only — the attending physician retains full clinical
                authority for all diagnoses and treatment decisions.
              </p>
            </div>
            <button
              onClick={() => setIsDxGptModalOpen(true)}
              className="shrink-0 rounded-lg border border-emerald-200 bg-white px-3.5 py-2 text-sm font-semibold text-emerald-700 transition-colors hover:bg-emerald-50"
            >
              Open Assistant
            </button>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between gap-3 border-t border-gray-100 pt-4">
            <p className="text-xs text-gray-400">
              {diagnoses.length > 0 ? (
                <>
                  <span className="font-semibold text-gray-600">
                    {diagnoses.length}
                  </span>{" "}
                  {diagnoses.length === 1 ? "diagnosis" : "diagnoses"} recorded
                </>
              ) : (
                "No diagnosis recorded yet"
              )}
            </p>
            <div className="flex gap-2.5">
              <button
                onClick={onClose}
                disabled={isSubmitting}
                className="rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleEndConsultation}
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-600/25 transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? (
                  <>
                    <span
                      className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
                      aria-hidden
                    />
                    Saving…
                  </>
                ) : (
                  <>
                    <CheckCircleIcon className="h-4.5 w-4.5" />
                    End Consultation
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </Modal>

      {/* DxGPT Embedded Modal */}
      <Modal
        isOpen={isDxGptModalOpen}
        onClose={() => setIsDxGptModalOpen(false)}
        title="DxGPT - AI Medical Assistant"
        size="large"
      >
        <div className="h-[600px]">
          <iframe
            src="https://dxgpt.app/"
            className="w-full h-full border-0 rounded-lg"
            title="DxGPT Medical Assistant"
          />
        </div>
      </Modal>
    </>
  );
}

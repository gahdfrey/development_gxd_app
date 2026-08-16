"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import Modal from "@/app/components/ui/Modal";
import SearchableSelect, { SearchableSelectOption } from "@/app/components/ui/SearchableSelect";
import { UserIcon } from "@heroicons/react/24/outline";
import { ADMISSION_SEVERITIES } from "@/lib/constants";
import type { Ward, Bed } from "./types";

interface AdmitPatientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface Patient {
  id: number;
  firstname: string;
  lastname: string;
  mrn: string | null;
  dob: string;
}

interface Doctor {
  id: number;
  firstname: string;
  lastname: string;
}

interface AppointmentOption {
  id: number;
  appointmentDate: string;
  appointmentTime: string;
  status: string;
  doctor: { id: number; firstname: string; lastname: string } | null;
}

const ADMISSION_TYPES = [
  { value: "elective", label: "Elective" },
  { value: "emergency", label: "Emergency" },
  { value: "transfer-in", label: "Transfer In (from another facility)" },
];

export default function AdmitPatientModal({ isOpen, onClose, onSuccess }: AdmitPatientModalProps) {
  const { data: patients = [] } = useSWR<Patient[]>("/api/patients", fetcher);
  const { data: doctors = [] } = useSWR<Doctor[]>("/api/doctors", fetcher);
  const { data: wards = [] } = useSWR<Ward[]>("/api/wards", fetcher);

  const [selectedPatient, setSelectedPatient] = useState<SearchableSelectOption | null>(null);

  // Only fetch this one patient's completed appointments once they're
  // selected — the server filters by patientId, so this stays a small,
  // scoped query instead of pulling the org's entire appointment history.
  const { data: eligibleAppointments = [] } = useSWR<AppointmentOption[]>(
    selectedPatient ? `/api/appointments?patientId=${selectedPatient.id}&status=completed` : null,
    fetcher,
  );
  const [appointmentId, setAppointmentId] = useState<string>("");
  const [doctorId, setDoctorId] = useState<string>("");
  const [wardId, setWardId] = useState<string>("");
  const [bedId, setBedId] = useState<string>("");
  const [admissionType, setAdmissionType] = useState("elective");
  const [severity, setSeverity] = useState("routine");
  const [admissionReason, setAdmissionReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const { data: availableBeds, isLoading: bedsLoading } = useSWR<Bed[]>(
    wardId ? `/api/beds?wardId=${wardId}&status=available` : null,
    fetcher,
  );
  const bedOptions = availableBeds ?? [];

  const patientOptions: SearchableSelectOption[] = patients.map((p) => ({
    id: p.id,
    label: `${p.firstname} ${p.lastname}`,
    sublabel: p.mrn ? `MRN: ${p.mrn}` : `DOB: ${p.dob}`,
  }));

  const reset = () => {
    setSelectedPatient(null);
    setAppointmentId("");
    setDoctorId("");
    setWardId("");
    setBedId("");
    setAdmissionType("elective");
    setSeverity("routine");
    setAdmissionReason("");
    setErrorMessage("");
  };

  useEffect(() => {
    if (isOpen) reset();
  }, [isOpen]);

  useEffect(() => {
    setBedId("");
  }, [wardId]);

  const handleLinkAppointment = (id: string) => {
    setAppointmentId(id);
    if (!id) {
      // "Don't link — admit directly": clear the doctor an earlier linked
      // appointment may have auto-filled, so the field is free to pick again.
      setDoctorId("");
      return;
    }
    const appt = eligibleAppointments.find((a) => String(a.id) === id);
    if (appt?.doctor) setDoctorId(String(appt.doctor.id));
  };

  const handleClose = () => {
    if (!isSubmitting) {
      reset();
      onClose();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient || !doctorId || !wardId || !bedId || !admissionReason.trim()) {
      setErrorMessage("Please fill in patient, doctor, ward, bed, and admission reason.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const res = await fetch("/api/admissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: selectedPatient.id,
          appointmentId: appointmentId || undefined,
          admittingDoctorId: doctorId,
          wardId,
          bedId,
          admissionType,
          severity,
          admissionReason,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || "Failed to admit patient");
        return;
      }

      onSuccess();
      handleClose();
    } catch {
      setErrorMessage("Failed to admit patient");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Admit Patient" size="large">
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMessage && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
            {errorMessage}
          </div>
        )}

        <SearchableSelect
          options={patientOptions}
          value={selectedPatient}
          onChange={(value) => {
            setSelectedPatient(value);
            setAppointmentId("");
          }}
          placeholder="Search patient by name..."
          label="Patient *"
          icon={UserIcon}
        />

        {selectedPatient && eligibleAppointments.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Link to a completed appointment (optional)
            </label>
            <select
              value={appointmentId}
              onChange={(e) => handleLinkAppointment(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Don't link — admit directly</option>
              {eligibleAppointments.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.appointmentDate} {a.appointmentTime} — Dr. {a.doctor?.firstname} {a.doctor?.lastname}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Admitting Doctor *</label>
            <select
              value={doctorId}
              onChange={(e) => setDoctorId(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select doctor</option>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>Dr. {d.firstname} {d.lastname}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Admission Type *</label>
            <select
              value={admissionType}
              onChange={(e) => setAdmissionType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {ADMISSION_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Severity *</label>
            <select
              value={severity}
              onChange={(e) => setSeverity(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {ADMISSION_SEVERITIES.map((s) => (
                <option key={s.key} value={s.key}>{s.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ward *</label>
            <select
              value={wardId}
              onChange={(e) => setWardId(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select ward</option>
              {wards.map((w) => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bed *</label>
            <select
              value={bedId}
              onChange={(e) => setBedId(e.target.value)}
              required
              disabled={!wardId || bedsLoading}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">
                {!wardId
                  ? "Select a ward first"
                  : bedsLoading
                    ? "Loading beds..."
                    : bedOptions.length
                      ? "Select bed"
                      : "No available beds"}
              </option>
              {bedOptions.map((b) => (
                <option key={b.id} value={b.id}>Bed {b.bedNumber}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Admission Reason *</label>
          <textarea
            value={admissionReason}
            onChange={(e) => setAdmissionReason(e.target.value)}
            required
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            placeholder="Reason for admission..."
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Admitting..." : "Admit Patient"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

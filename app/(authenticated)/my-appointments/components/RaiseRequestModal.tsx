"use client";

import { useState } from "react";
import useSWR from "swr";
import Modal from "@/app/components/ui/Modal";
import SearchableSelect, {
  type SearchableSelectOption,
} from "@/app/components/ui/SearchableSelect";
import { fetcher } from "@/lib/fetcher";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Patient {
  id: number;
  firstname: string;
  lastname: string;
  gender: string;
  dob: string;
  countryCode: string;
  phone: string;
  insuranceType: string;
  hmoId: number | null;
  policyNumber: string | null;
}

interface Department {
  id: number;
  name: string;
}

interface TestRow {
  id: number;
  name: string;
  price: number;
  departmentId: number;
  departmentName: string | null;
}

interface RaiseRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface FormErrors {
  patient?: string;
  department?: string;
  test?: string;
  submit?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const formatAge = (dob: string): string => {
  const today = new Date();
  const birth = new Date(dob);

  let years = today.getFullYear() - birth.getFullYear();
  let months = today.getMonth() - birth.getMonth();
  let days = today.getDate() - birth.getDate();

  if (days < 0) {
    months--;
    days += new Date(today.getFullYear(), today.getMonth(), 0).getDate();
  }
  if (months < 0) {
    years--;
    months += 12;
  }

  if (years >= 1) return `${years} ${years === 1 ? "year" : "years"}`;
  if (months >= 1) return `${months} ${months === 1 ? "month" : "months"}`;
  return `${days} ${days === 1 ? "day" : "days"}`;
};

const formatInsuranceType = (type: string): string => {
  if (type === "hmo") return "HMO";
  return type.charAt(0).toUpperCase() + type.slice(1);
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function RaiseRequestModal({
  isOpen,
  onClose,
}: RaiseRequestModalProps) {
  const { data: patients, isLoading: patientsLoading } = useSWR<Patient[]>(
    "/api/patients",
    fetcher,
  );
  const { data: departments, isLoading: deptsLoading } = useSWR<Department[]>(
    "/api/departments",
    fetcher,
  );
  const { data: allTests, isLoading: testsLoading } = useSWR<TestRow[]>(
    "/api/tests",
    fetcher,
  );

  const [selectedPatientOption, setSelectedPatientOption] =
    useState<SearchableSelectOption | null>(null);
  const [selectedDeptOption, setSelectedDeptOption] =
    useState<SearchableSelectOption | null>(null);
  const [selectedTestOption, setSelectedTestOption] =
    useState<SearchableSelectOption | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Derived values
  const selectedPatient =
    selectedPatientOption && patients
      ? (patients.find((p) => p.id === selectedPatientOption.id) ?? null)
      : null;

  const testsForDept: SearchableSelectOption[] = selectedDeptOption
    ? (allTests ?? [])
        .filter((t) => t.departmentId === selectedDeptOption.id)
        .map((t) => ({
          id: t.id,
          label: t.name,
          sublabel: `₦${t.price.toLocaleString()}`,
        }))
    : [];

  // Options
  const patientOptions: SearchableSelectOption[] = (patients ?? []).map(
    (p) => ({
      id: p.id,
      label: `${p.firstname} ${p.lastname}`,
      sublabel: `${p.countryCode} ${p.phone}`,
    }),
  );

  const deptOptions: SearchableSelectOption[] = (departments ?? []).map(
    (d) => ({ id: d.id, label: d.name }),
  );

  // When department changes, reset the test selection
  const handleDeptChange = (opt: SearchableSelectOption | null) => {
    setSelectedDeptOption(opt);
    setSelectedTestOption(null);
    if (opt) setErrors((prev) => ({ ...prev, department: undefined }));
  };

  const handlePatientChange = (opt: SearchableSelectOption | null) => {
    setSelectedPatientOption(opt);
    if (opt) setErrors((prev) => ({ ...prev, patient: undefined }));
  };

  const handleTestChange = (opt: SearchableSelectOption | null) => {
    setSelectedTestOption(opt);
    if (opt) setErrors((prev) => ({ ...prev, test: undefined }));
  };

  // Validate and return true if valid
  const validate = (): boolean => {
    const newErrors: FormErrors = {};
    if (!selectedPatientOption) newErrors.patient = "Please select a patient";
    if (!selectedDeptOption) newErrors.department = "Please select a department";
    if (!selectedTestOption) newErrors.test = "Please select a test";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setIsSubmitting(true);
    setErrors({});

    try {
      const res = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: selectedPatientOption!.id,
          departmentId: selectedDeptOption!.id,
          testId: selectedTestOption!.id,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrors({ submit: data.error || "Failed to create request" });
        return;
      }

      handleClose();
    } catch {
      setErrors({ submit: "Something went wrong. Please try again." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setSelectedPatientOption(null);
    setSelectedDeptOption(null);
    setSelectedTestOption(null);
    setErrors({});
    setIsSubmitting(false);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Raise Request"
      size="large"
    >
      <div className="space-y-5">
        {/* Submit-level error */}
        {errors.submit && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
            {errors.submit}
          </div>
        )}

        {/* ── Patient ── */}
        <div>
          <SearchableSelect
            label="Patient"
            options={patientOptions}
            value={selectedPatientOption}
            onChange={handlePatientChange}
            placeholder={patientsLoading ? "Loading patients..." : "Search by name..."}
            disabled={patientsLoading}
            error={errors.patient}
          />
        </div>

        {/* ── Auto-populated Patient Details ── */}
        {selectedPatient && (
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Patient Details
            </p>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="block text-xs font-medium text-gray-500">
                  Gender
                </label>
                <div className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 select-none cursor-default">
                  {selectedPatient.gender
                    ? selectedPatient.gender.charAt(0).toUpperCase() +
                      selectedPatient.gender.slice(1)
                    : "—"}
                </div>
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-medium text-gray-500">
                  Insurance Type
                </label>
                <div className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 select-none cursor-default">
                  {selectedPatient.insuranceType
                    ? formatInsuranceType(selectedPatient.insuranceType)
                    : "—"}
                </div>
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-medium text-gray-500">
                  Age
                </label>
                <div className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 select-none cursor-default">
                  {selectedPatient.dob ? formatAge(selectedPatient.dob) : "—"}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Department ── */}
        <div>
          <SearchableSelect
            label="Department"
            options={deptOptions}
            value={selectedDeptOption}
            onChange={handleDeptChange}
            placeholder={
              deptsLoading
                ? "Loading departments..."
                : deptOptions.length === 0
                ? "No departments available"
                : "Search department..."
            }
            disabled={deptsLoading || deptOptions.length === 0}
            error={errors.department}
          />
        </div>

        {/* ── Test ── */}
        <div>
          <SearchableSelect
            label="Test"
            options={testsForDept}
            value={selectedTestOption}
            onChange={handleTestChange}
            placeholder={
              !selectedDeptOption
                ? "Select a department first"
                : testsLoading
                ? "Loading tests..."
                : testsForDept.length === 0
                ? "No tests for this department"
                : "Search test..."
            }
            disabled={
              !selectedDeptOption ||
              testsLoading ||
              testsForDept.length === 0
            }
            error={errors.test}
          />
        </div>

        {/* ── Action Buttons ── */}
        <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-5 py-2.5 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Submitting..." : "Submit Request"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

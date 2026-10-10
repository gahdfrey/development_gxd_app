"use client";

import { useState } from "react";
import useSWR from "swr";
import { PlusIcon } from "@heroicons/react/24/outline";
import { fetcher } from "@/lib/fetcher";
import BookVaccinationModal from "./BookVaccinationModal";
import DoseActionModal, { type DoseActionTarget } from "./DoseActionModal";
import VaccinationRecord from "./VaccinationRecord";
import { useCan, type Course } from "./shared";

/** Vaccinations tab of the staff patient record: the record plus book / give / reschedule. */
export default function PatientVaccinationsPanel({ patient }: { patient: { id: number; name: string; mrn: string | null } }) {
  const { data, isLoading, mutate } = useSWR<{ courses: Course[] }>(`/api/vaccinations?patientId=${patient.id}`, fetcher);
  const can = useCan();
  const [booking, setBooking] = useState(false);
  const [target, setTarget] = useState<DoseActionTarget | null>(null);

  return (
    <div className="space-y-3">
      {can("vaccination", "add") && (
        <div className="flex justify-end">
          <button
            onClick={() => setBooking(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            <PlusIcon className="h-4 w-4" /> Book vaccination
          </button>
        </div>
      )}
      {isLoading ? (
        <div className="flex h-32 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-blue-600" />
        </div>
      ) : (
        <VaccinationRecord
          courses={data?.courses ?? []}
          patientName={patient.name}
          onAction={can("vaccination", "edit") ? setTarget : undefined}
        />
      )}
      <BookVaccinationModal isOpen={booking} onClose={() => setBooking(false)} onBooked={() => mutate()} patient={patient} />
      <DoseActionModal key={target ? `${target.action}:${target.doseId}` : "none"} target={target} onClose={() => setTarget(null)} onDone={() => mutate()} />
    </div>
  );
}

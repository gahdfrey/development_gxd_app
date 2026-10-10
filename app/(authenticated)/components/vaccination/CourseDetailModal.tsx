"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR, { mutate as globalMutate } from "swr";
import Modal from "@/app/components/ui/Modal";
import { fetcher } from "@/lib/fetcher";
import { useToast } from "@/app/contexts/ToastContext";
import DoseActionModal, { type DoseActionTarget } from "./DoseActionModal";
import VaccinationRecord from "./VaccinationRecord";
import { naira, useCan, type Course, type Dose } from "./shared";
import SettleBillModal, { type DeskPayment } from "../../finance/components/SettleBillModal";
import { CURRENT_SHIFT_KEY } from "../../finance/components/MyShift";
import type { SettleTarget } from "../../finance/components/billing";

export interface CourseSummary {
  courseId: number;
  patientId: number;
  patientFirstname: string;
  patientLastname: string;
  patientMrn: string | null;
  patientPhone: string;
  patientCountryCode: string;
  vaccineName: string;
}

/**
 * One vaccination course, dose by dose, with every action: give, reschedule,
 * missed, cancel, and desk payment.
 *
 * Buttons depend on both the role's permissions and where it's opened:
 * "clinical" (Vaccination page) shows the schedule and dose actions to roles
 * with vaccination edit; "finance" (Finance → Vaccinations) never does —
 * finance sees only each dose's amount and payment status, and collects
 * payment if the role allows.
 */
export default function CourseDetailModal({
  summary,
  onClose,
  onChanged,
  context = "clinical",
}: {
  summary: CourseSummary | null;
  onClose: () => void;
  onChanged: () => void;
  context?: "clinical" | "finance";
}) {
  const { data, isLoading, mutate } = useSWR<{ courses: Course[] }>(
    summary ? `/api/vaccinations?patientId=${summary.patientId}` : null,
    fetcher,
  );
  const course = data?.courses.find((c) => c.id === summary?.courseId) ?? null;
  const can = useCan();
  const { showToast } = useToast();
  const [target, setTarget] = useState<DoseActionTarget | null>(null);
  const [settleTarget, setSettleTarget] = useState<SettleTarget | null>(null);
  /** Collecting every unpaid dose of the course at once (vs one dose). */
  const [settleAll, setSettleAll] = useState(false);
  const [settling, setSettling] = useState(false);

  const name = summary ? `${summary.patientFirstname} ${summary.patientLastname}` : "";
  const refresh = () => {
    mutate();
    onChanged();
  };

  const markMissed = async (dose: Dose) => {
    const res = await fetch(`/api/vaccinations/doses/${dose.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "missed" }),
    });
    if (!res.ok) return showToast((await res.json()).error || "Failed", "error");
    showToast("Marked as missed. Reschedule when the patient is ready.", "success");
    refresh();
  };

  const collect = (dose: Dose, c: Course) => {
    setSettleAll(false);
    setSettleTarget({
      itemType: "charge",
      itemId: dose.chargeId as number,
      label: `${c.vaccineName} — dose ${dose.doseNumber} of ${c.doseCount}`,
      patientId: summary?.patientId ?? null,
      patientName: name,
      basePrice: dose.amount,
      billing: null,
    });
  };

  const settle = async (code: string, payment: DeskPayment) => {
    if (!settleTarget) return;
    setSettling(true);
    try {
      const res = settleAll
        ? await fetch(`/api/vaccinations/courses/${summary?.courseId}/collect`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ authorizationCode: code, ...payment }),
          })
        : await fetch(`/api/charges/${settleTarget.itemId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ paymentStatus: "paid", authorizationCode: code, ...payment }),
          });
      const body = await res.json();
      if (!res.ok) return showToast(body.error || "Failed to record payment", "error");
      globalMutate(CURRENT_SHIFT_KEY);
      setSettleTarget(null);
      showToast("Payment recorded", "success");
      refresh();
    } finally {
      setSettling(false);
    }
  };

  const unpaid = course?.doses.filter((d) => d.paymentStatus === "not_paid" && d.status !== "cancelled") ?? [];
  const unpaidTotal = unpaid.reduce((s, d) => s + (d.amount ?? 0), 0);
  const canCollect = can("finance", "edit") || can("finance", "add");
  const canTreat = context === "clinical" && can("vaccination", "edit");
  const collectAll = () => {
    if (!course) return;
    setSettleAll(true);
    setSettleTarget({
      itemType: "charge",
      itemId: course.id,
      label: `${course.vaccineName} — ${unpaid.length} unpaid dose${unpaid.length !== 1 ? "s" : ""}`,
      patientId: summary?.patientId ?? null,
      patientName: name,
      basePrice: unpaidTotal,
      billing: null,
    });
  };

  return (
    <Modal isOpen={summary !== null} onClose={onClose} title="Vaccination details" size="large">
      {summary && (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <Link href={`/patients/${summary.patientId}/history`} className="text-base font-semibold text-gray-900 hover:text-blue-700">
                {name}
              </Link>
              <p className="text-xs text-gray-500">
                <span className="font-mono">{summary.patientMrn ?? "—"}</span> · {summary.patientCountryCode} {summary.patientPhone}
              </p>
            </div>
            {unpaid.length > 0 && (
              <div className="flex items-center gap-3">
                <p className="text-sm text-amber-800">
                  Unpaid: <span className="font-semibold">{naira(unpaidTotal)}</span> ({unpaid.length} dose{unpaid.length !== 1 ? "s" : ""})
                </p>
                {canCollect && unpaid.length > 1 && (
                  <button onClick={collectAll} className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700">
                    Collect all
                  </button>
                )}
              </div>
            )}
          </div>

          {isLoading ? (
            <div className="flex h-32 items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-blue-600" />
            </div>
          ) : course ? (
            <VaccinationRecord
              courses={[course]}
              patientName={name}
              onAction={canTreat ? setTarget : undefined}
              onMissed={canTreat ? markMissed : undefined}
              onCollect={canCollect ? collect : undefined}
              billingOnly={context === "finance"}
            />
          ) : (
            <p className="text-sm text-gray-500">This vaccination could not be found.</p>
          )}

          {/* Rendered inside this modal so they stack on top of it. */}
          <DoseActionModal key={target ? `dose:${target.action}:${target.doseId}` : "dose:none"} target={target} onClose={() => setTarget(null)} onDone={refresh} />
          <SettleBillModal
            key={settleTarget ? `settle:${settleAll ? "all" : "dose"}:${settleTarget.itemId}` : "settle:none"}
            target={settleTarget}
            isSubmitting={settling}
            onClose={() => setSettleTarget(null)}
            onConfirm={settle}
          />
        </div>
      )}
    </Modal>
  );
}

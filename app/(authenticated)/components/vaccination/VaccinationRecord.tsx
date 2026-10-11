"use client";

import { CheckCircleIcon } from "@heroicons/react/24/outline";
import type { DoseActionTarget, DoseAction } from "./DoseActionModal";
import { PaymentPill, StatusPill, formatDay, naira, type Course, type Dose } from "./shared";

interface Props {
  courses: Course[];
  /** Staff: show give / reschedule / cancel on open doses. */
  onAction?: (target: DoseActionTarget) => void;
  /** Staff: "Missed" on scheduled doses. */
  onMissed?: (dose: Dose) => void;
  /** Finance: take payment at the desk for an unpaid dose. */
  onCollect?: (dose: Dose, course: Course) => void;
  patientName?: string;
  /** Patient portal: link unpaid doses to the Pending Payment tab. */
  onPay?: () => void;
  /** Finance view: each dose's amount and payment only — no schedule, dates
   * or clinical status. Cancelled (unbilled) doses are left out. */
  billingOnly?: boolean;
}

/**
 * A patient's vaccinations: one card per course with its schedule and every
 * dose's status, date and payment. Used on the staff patient record and the
 * patient portal.
 */
export default function VaccinationRecord({ courses, onAction, onMissed, onCollect, patientName, onPay, billingOnly = false }: Props) {
  if (courses.length === 0) {
    return (
      <div className="rounded-xl sm:rounded-2xl border border-gray-200 bg-white p-10 text-center">
        <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-50">
          <CheckCircleIcon className="h-6 w-6 text-gray-400" />
        </span>
        <p className="text-sm text-gray-500">No vaccinations booked yet.</p>
      </div>
    );
  }

  // Active courses first, then the rest by start date (newest first).
  const sorted = [...courses].sort((a, b) =>
    a.status === "active" && b.status !== "active" ? -1
    : b.status === "active" && a.status !== "active" ? 1
    : b.startDate.localeCompare(a.startDate),
  );

  return (
    <div className="space-y-3">
      {sorted.map((course) => {
        const given = course.doses.filter((d) => d.status === "given").length;
        const counted = course.doses.filter((d) => d.status !== "cancelled").length;
        const next = course.doses.find((d) => d.status === "scheduled" || d.status === "overdue");
        const unpaid = course.doses.filter((d) => d.paymentStatus === "not_paid" && d.status !== "cancelled");
        const billedDoses = course.doses.filter((d) => d.status !== "cancelled" && d.chargeId != null);
        const paid = billedDoses.filter((d) => d.paymentStatus === "paid").length;
        const doses = billingOnly ? billedDoses : course.doses;
        return (
          <div key={course.id} className="overflow-hidden rounded-xl sm:rounded-2xl border border-gray-200 bg-white">
            <div className="flex flex-col gap-2 border-b border-gray-100 px-4 py-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm sm:text-base font-semibold text-gray-900">{course.vaccineName}</p>
                  {!billingOnly && <StatusPill status={course.status} />}
                </div>
                {!billingOnly && (
                  <>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {course.period} · started {formatDay(course.startDate)}
                      {course.vaccineDescription ? ` · ${course.vaccineDescription}` : ""}
                    </p>
                    {course.notes && <p className="mt-1 text-xs text-gray-500 italic">{course.notes}</p>}
                  </>
                )}
              </div>
              <div className="shrink-0 text-left sm:text-right">
                {billingOnly ? (
                  <p className="text-xs font-semibold text-gray-700">
                    {paid} of {billedDoses.length} paid
                  </p>
                ) : (
                  <>
                    <p className="text-xs font-semibold text-gray-700">
                      {given} of {counted} given
                    </p>
                    {next && <p className="text-xs text-gray-500">Next: {formatDay(next.scheduledDate)}</p>}
                  </>
                )}
              </div>
            </div>

            <ul className="divide-y divide-gray-100">
              {doses.map((dose) => {
                const open = dose.status === "scheduled" || dose.status === "overdue" || dose.status === "missed";
                const act = (action: DoseAction) =>
                  onAction?.({
                    action,
                    doseId: dose.id,
                    label: `${course.vaccineName} — dose ${dose.doseNumber} of ${course.doseCount}${patientName ? ` · ${patientName}` : ""}`,
                    scheduledDate: dose.scheduledDate,
                    paymentStatus: dose.paymentStatus,
                    hasLaterDoses: course.doses.some((d) => d.doseNumber > dose.doseNumber && (d.status === "scheduled" || d.status === "overdue" || d.status === "missed")),
                  });
                return (
                  <li key={dose.id} className={`flex flex-col gap-2 px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between ${dose.status === "cancelled" ? "opacity-60" : ""}`}>
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
                        {dose.doseNumber}
                      </span>
                      {billingOnly ? (
                        <p className="text-sm font-medium text-gray-900">Dose {dose.doseNumber}</p>
                      ) : (
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900">
                            {dose.status === "given" && dose.givenAt
                              ? `Given ${new Date(dose.givenAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}`
                              : formatDay(dose.scheduledDate)}
                          </p>
                          {dose.status === "given" && (
                            <p className="text-xs text-gray-500 truncate">
                              {[dose.givenByName && `by ${dose.givenByName}`, dose.batchNumber && `batch ${dose.batchNumber}`, dose.site]
                                .filter(Boolean)
                                .join(" · ") || "—"}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                      {!billingOnly && <StatusPill status={dose.status} />}
                      {dose.status !== "cancelled" && <PaymentPill status={dose.paymentStatus} />}
                      {dose.amount != null && dose.status !== "cancelled" && (
                        <span className="text-xs font-semibold text-gray-700">{naira(dose.amount)}</span>
                      )}
                      {dose.hmoAmount > 0 && dose.status !== "cancelled" && (
                        <span className="rounded-full bg-teal-50 px-2 py-0.5 text-[11px] font-semibold text-teal-700 ring-1 ring-teal-200">
                          {dose.hmoName ?? "HMO"} covers {naira(dose.hmoAmount)}
                        </span>
                      )}
                      {billingOnly && dose.status !== "cancelled" && (dose.pricingBasis === "excluded" || dose.pricingBasis === "not_listed" || dose.pricingBasis === "auth_declined") && (
                        <span className="text-[11px] font-medium text-amber-700">
                          {dose.pricingBasis === "excluded" ? "Excluded from HMO tariff" : dose.pricingBasis === "not_listed" ? "Not on HMO tariff" : "HMO declined auth"} — self-pay
                        </span>
                      )}
                      {onCollect && dose.chargeId != null && dose.paymentStatus === "not_paid" && dose.status !== "cancelled" && (
                        <button onClick={() => onCollect(dose, course)} className="text-xs font-semibold text-blue-600 hover:text-blue-800">
                          Mark as paid
                        </button>
                      )}
                      {onAction && open && (
                        <span className="flex items-center gap-3 text-xs font-semibold">
                          <button onClick={() => act("give")} className="rounded-md bg-emerald-600 px-2.5 py-1 text-white hover:bg-emerald-700">Give</button>
                          <button onClick={() => act("reschedule")} className="text-blue-600 hover:text-blue-800">Reschedule</button>
                          {onMissed && dose.status !== "missed" && (
                            <button onClick={() => onMissed(dose)} className="text-amber-700 hover:text-amber-900">Missed</button>
                          )}
                          <button onClick={() => act("cancel")} className="text-red-600 hover:text-red-800">Cancel</button>
                        </span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>

            {onPay && unpaid.length > 0 && (
              <div className="flex items-center justify-between gap-3 border-t border-gray-100 bg-amber-50/60 px-4 py-2.5">
                <p className="text-xs text-amber-800">
                  {unpaid.length} dose{unpaid.length !== 1 ? "s" : ""} unpaid · {naira(unpaid.reduce((s, d) => s + (d.amount ?? 0), 0))}
                </p>
                <button onClick={onPay} className="text-xs font-semibold text-blue-700 hover:text-blue-900">
                  Pay now →
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

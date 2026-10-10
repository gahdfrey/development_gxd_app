"use client";

import { naira, type BillingSummary } from "./billing";

/**
 * Price column for finance tables: self-pay rows show a single amount; HMO
 * rows show the tariff split between what the HMO covers and what to
 * collect from the patient.
 */
export default function BillingCell({
  basePrice,
  billing,
}: {
  basePrice: number | null;
  billing?: BillingSummary | null;
}) {
  if (!billing || billing.basis === "self_pay") {
    return <span className="font-medium text-gray-900">{naira(basePrice)}</span>;
  }

  if (billing.basis === "covered") {
    return (
      <div className="leading-tight">
        <span className="font-medium text-gray-900">Collect {naira(billing.patientAmount)}</span>
        <span className="block text-xs text-teal-700">
          {billing.hmoName ?? "HMO"} covers {naira(billing.hmoAmount)}
        </span>
        {billing.authorization?.status === "approved" ? (
          <span className="block text-[11px] font-medium text-green-700">Auth {billing.authorization.code}</span>
        ) : billing.authorization?.status === "pending" ? (
          <span className={`block text-[11px] font-medium ${billing.authorization.sla?.breached ? "text-red-700" : "text-amber-700"}`}>
            {billing.authorization.sentAt ? `Awaiting HMO · ${billing.authorization.sla?.minutes ?? 0} min` : "Auth not yet sent"}
          </span>
        ) : billing.authorization?.status === "denied" ? (
          <span className="block text-[11px] font-medium text-red-700">Auth declined</span>
        ) : billing.requiresAuthorization ? (
          <span className="block text-[11px] font-medium text-amber-700">Needs auth code</span>
        ) : null}
        {billing.eligibilityStale && (
          <span className="block text-[11px] font-medium text-amber-700">Eligibility not verified</span>
        )}
      </div>
    );
  }

  if (billing.basis === "auth_declined") {
    return (
      <div className="leading-tight">
        <span className="font-medium text-gray-900">Collect {naira(billing.patientAmount)}</span>
        <span className="block text-xs text-red-700">{billing.hmoName ?? "HMO"} declined auth — self-pay</span>
      </div>
    );
  }

  return (
    <div className="leading-tight">
      <span className="font-medium text-gray-900">{naira(billing.patientAmount)}</span>
      <span className="block text-xs text-amber-700">
        {billing.basis === "excluded" ? "Excluded" : "Not on"} {billing.hmoName ?? "HMO"} tariff — self-pay
      </span>
    </div>
  );
}

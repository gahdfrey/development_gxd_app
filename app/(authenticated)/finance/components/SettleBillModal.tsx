"use client";

import { useState } from "react";
import Modal from "@/app/components/ui/Modal";
import EligibilityCheckForm from "../../patients/components/EligibilityCheckForm";
import { naira, AUTH_SLA_MINUTES, todayInLagos, type SettleTarget } from "./billing";
import { DESK_CHANNELS, type DeskChannel } from "@/lib/billing/deskChannels";
import { useMyShift, OpenShiftForm } from "./MyShift";

/** How the patient paid at the desk — sent with the "mark paid" request. */
export interface DeskPayment {
  channel: DeskChannel | null;
  posReference: string;
}

interface SettleBillModalProps {
  target: SettleTarget | null;
  isSubmitting: boolean;
  onClose: () => void;
  onConfirm: (authorizationCode: string, payment: DeskPayment) => void;
  /** Called after an eligibility check is logged, to refresh the billing data. */
  onEligibilityLogged?: () => void;
}

/**
 * Finance-desk confirmation before an item is marked paid. For HMO-covered
 * items it spells out the split (collect the co-pay; the rest is billed to
 * the HMO) and captures the HMO's authorization code, which goes on the
 * claim. The code can also be attached later from the HMO Billing tab, so
 * emergencies aren't blocked waiting for it.
 *
 * When the patient pays something, the cashier picks how (cash / POS /
 * transfer) and the money is recorded in their open shift — a shift can be
 * opened right here if they haven't yet.
 *
 * Render with a `key` per target so the code input resets between items.
 */
export default function SettleBillModal({ target, isSubmitting, onClose, onConfirm, onEligibilityLogged }: SettleBillModalProps) {
  const [authorizationCode, setAuthorizationCode] = useState("");
  const [showEligibilityForm, setShowEligibilityForm] = useState(false);
  const [eligibilityLogged, setEligibilityLogged] = useState(false);
  const [channel, setChannel] = useState<DeskChannel | null>(null);
  const [posReference, setPosReference] = useState("");
  const { shift, isLoading: shiftLoading, mutate: mutateShift } = useMyShift();

  const billing = target?.billing;
  const isHmo = billing?.basis === "covered";
  const collect = billing ? billing.patientAmount : target?.basePrice ?? 0;
  const authorization = billing?.authorization ?? null;
  const authExpired = authorization?.status === "approved" && !!authorization.validUntil && authorization.validUntil < todayInLagos();
  const takesMoney = collect > 0;
  const deskBlocked = takesMoney && (!shift || !channel);

  return (
    <Modal isOpen={target !== null} onClose={onClose} title="Confirm payment">
      {target && (
        <div className="space-y-5">
          <div>
            <p className="text-sm text-gray-500">{target.patientName}</p>
            <p className="text-base font-semibold text-gray-900">{target.label}</p>
          </div>

          <dl className="divide-y divide-gray-100 rounded-lg border border-gray-200 text-sm">
            <div className="flex justify-between px-4 py-2.5">
              <dt className="text-gray-500">Payer</dt>
              <dd className="font-medium text-gray-900">
                {isHmo ? billing!.hmoName ?? "HMO" : "Self-pay"}
              </dd>
            </div>
            {isHmo && (
              <>
                <div className="flex justify-between px-4 py-2.5">
                  <dt className="text-gray-500">HMO tariff</dt>
                  <dd className="text-gray-900">{naira(billing!.price)}</dd>
                </div>
                <div className="flex justify-between px-4 py-2.5">
                  <dt className="text-gray-500">Billed to HMO</dt>
                  <dd className="text-teal-700 font-medium">{naira(billing!.hmoAmount)}</dd>
                </div>
              </>
            )}
            {billing && billing.basis !== "covered" && billing.basis !== "self_pay" && billing.basis !== "auth_declined" && (
              <div className="px-4 py-2.5 text-amber-700">
                This service is {billing.basis === "excluded" ? "excluded from" : "not on"} the{" "}
                {billing.hmoName ?? "HMO"} tariff, so the patient pays the self-pay price.
              </div>
            )}
            <div className="flex justify-between px-4 py-2.5 bg-gray-50">
              <dt className="font-semibold text-gray-900">Collect from patient</dt>
              <dd className="font-semibold text-gray-900">{naira(collect)}</dd>
            </div>
          </dl>

          {isHmo && billing!.eligibilityStale && !eligibilityLogged && target.patientId != null && billing!.coverageId != null && (
            showEligibilityForm ? (
              <EligibilityCheckForm
                patientId={target.patientId}
                coverageId={billing!.coverageId}
                onCancel={() => setShowEligibilityForm(false)}
                onSaved={() => {
                  setShowEligibilityForm(false);
                  setEligibilityLogged(true);
                  onEligibilityLogged?.();
                }}
              />
            ) : (
              <div className="flex items-start justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                <span>
                  {billing!.lastEligibility?.result === "not_eligible"
                    ? `${billing!.hmoName ?? "The HMO"} last reported this enrollee as not eligible.`
                    : "Eligibility hasn't been verified with the HMO recently. Unverified enrollees are a common reason claims get rejected."}
                </span>
                <button
                  type="button"
                  onClick={() => setShowEligibilityForm(true)}
                  className="shrink-0 font-semibold text-amber-900 hover:underline"
                >
                  Log check
                </button>
              </div>
            )
          )}
          {eligibilityLogged && (
            <p className="text-sm text-green-700">Eligibility check saved.</p>
          )}

          {billing?.basis === "auth_declined" ? (
            <div className="space-y-2">
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                {billing.hmoName ?? "The HMO"} declined authorization for this service, so it&apos;s billed to the patient
                at the self-pay price ({naira(billing.patientAmount)}).
              </div>
              <label htmlFor="auth-code" className="block text-sm font-medium text-gray-700">
                HMO has since approved it? <span className="font-normal text-gray-400">Enter the new code to bill the HMO instead</span>
              </label>
              <input
                id="auth-code"
                type="text"
                value={authorizationCode}
                onChange={(e) => setAuthorizationCode(e.target.value)}
                placeholder="e.g. AUTH-2026-004512"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {authorizationCode.trim() && billing.tariffPrice != null && (
                <p className="text-xs text-teal-700">
                  With a code, {billing.hmoName ?? "the HMO"} is billed at its tariff ({naira(billing.tariffPrice)}) and
                  you collect only the patient&apos;s co-pay, if any.
                </p>
              )}
            </div>
          ) : isHmo && authorization?.status === "approved" ? (
            <div
              className={`rounded-lg border px-4 py-3 text-sm ${
                authExpired ? "border-red-200 bg-red-50 text-red-800" : "border-green-200 bg-green-50 text-green-800"
              }`}
            >
              <p className="font-semibold">
                Authorized · code {authorization.code}
              </p>
              <p className="text-xs mt-0.5">
                {authorization.validUntil ? `Valid until ${authorization.validUntil}` : "No expiry recorded"}
                {authExpired && " — expired. Ask the HMO to extend it, or the claim will likely be rejected."}
              </p>
            </div>
          ) : isHmo ? (
            <div className="space-y-2">
              {authorization?.status === "pending" && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  {authorization.sentAt
                    ? `Waiting for ${billing!.hmoName ?? "the HMO"} — sent ${authorization.sla?.minutes ?? 0} min ago${
                        authorization.sla?.breached ? ` (over the ${AUTH_SLA_MINUTES}-minute NHIA limit)` : ""
                      }.`
                    : "Authorization request raised but not yet sent to the HMO — see the Authorizations tab."}{" "}
                  Enter the code below once the HMO gives it, or confirm without it for an emergency and attach it later.
                </div>
              )}
              <label htmlFor="auth-code" className="block text-sm font-medium text-gray-700">
                HMO authorization code
                {billing!.requiresAuthorization ? (
                  <span className="ml-1 text-amber-700">(required by this HMO for this service)</span>
                ) : (
                  <span className="ml-1 text-gray-400">(optional)</span>
                )}
              </label>
              <input
                id="auth-code"
                type="text"
                value={authorizationCode}
                onChange={(e) => setAuthorizationCode(e.target.value)}
                placeholder="e.g. AUTH-2026-004512"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {billing!.requiresAuthorization && !authorizationCode.trim() && (
                <p className="text-xs text-amber-700">
                  Claims without a code are usually rejected. The code is saved to the authorization log; you can also
                  attach it later from the Authorizations tab.
                </p>
              )}
            </div>
          ) : null}

          {takesMoney && (
            shiftLoading ? null : !shift ? (
              <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                <p className="text-sm text-amber-800">
                  You don&apos;t have an open cashier shift. Open one to take this payment.
                </p>
                <OpenShiftForm compact onOpened={() => mutateShift()} />
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700">How did the patient pay?</p>
                <div className="grid grid-cols-3 gap-2">
                  {(Object.keys(DESK_CHANNELS) as DeskChannel[]).map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setChannel(c)}
                      className={`rounded-lg px-3 py-2 text-sm font-medium ring-1 ${
                        channel === c ? "bg-blue-50 text-blue-700 ring-blue-300" : "bg-white text-gray-700 ring-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      {DESK_CHANNELS[c]}
                    </button>
                  ))}
                </div>
                {channel === "pos" && (
                  <label className="block text-sm font-medium text-gray-700">
                    POS slip reference <span className="font-normal text-gray-400">(RRN or STAN, optional)</span>
                    <input
                      type="text"
                      value={posReference}
                      onChange={(e) => setPosReference(e.target.value)}
                      placeholder="e.g. 000123456789"
                      className="mt-1 w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </label>
                )}
              </div>
            )
          )}

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => onConfirm(authorizationCode, { channel, posReference })}
              disabled={isSubmitting || deskBlocked}
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {isSubmitting ? "Saving..." : collect > 0 ? `Received ${naira(collect)}` : "Confirm — bill to HMO"}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}

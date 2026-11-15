"use client";

import { useState } from "react";
import { mutate as globalMutate } from "swr";
import Modal from "@/app/components/ui/Modal";
import { useToast } from "@/app/contexts/ToastContext";
import { DESK_CHANNELS, type DeskChannel } from "@/lib/billing/deskChannels";
import { useMyShift, OpenShiftForm, CURRENT_SHIFT_KEY } from "./MyShift";
import { naira } from "./billing";

export interface BillPaymentTarget {
  admissionId: number;
  patientName: string;
  outstanding: number;
  walletBalance: number;
}

interface RecordBillPaymentModalProps {
  target: BillPaymentTarget | null;
  onClose: () => void;
  onRecorded: () => void;
}

/**
 * Finance desk: record money received towards an inpatient bill. The amount
 * pays off unpaid lines oldest-first (each in full); any change that doesn't
 * cover the next whole line is kept in the patient's wallet as a deposit.
 *
 * Render with a `key` per admission so the form resets between patients.
 */
export default function RecordBillPaymentModal({ target, onClose, onRecorded }: RecordBillPaymentModalProps) {
  const { showToast } = useToast();
  const { shift, isLoading: shiftLoading, mutate: mutateShift } = useMyShift();
  const [amount, setAmount] = useState(target && target.outstanding > 0 ? String(target.outstanding) : "");
  const [channel, setChannel] = useState<DeskChannel | null>(null);
  const [posReference, setPosReference] = useState("");
  const [busy, setBusy] = useState(false);

  const value = Number(amount.replace(/,/g, ""));
  const validAmount = Number.isInteger(value) && value > 0;
  const overpay = target && validAmount ? value - target.outstanding : 0;

  const submit = async () => {
    if (!target) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admissions/${target.admissionId}/bill/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: value, channel, posReference }),
      });
      const body = await res.json();
      if (!res.ok) return showToast(body.error || "Failed to record payment", "error");
      const parts = [`${naira(body.amount)} received`];
      if (body.lines > 0) parts.push(`${body.lines} line(s) paid`);
      if (body.toWallet > 0) parts.push(`${naira(body.toWallet)} kept in wallet`);
      showToast(parts.join(" — "), "success");
      globalMutate(CURRENT_SHIFT_KEY);
      onRecorded();
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal isOpen={target !== null} onClose={onClose} title="Record payment">
      {target && (
        <div className="space-y-5">
          <div>
            <p className="text-sm text-gray-500">Inpatient bill</p>
            <p className="text-base font-semibold text-gray-900">{target.patientName}</p>
          </div>

          <dl className="divide-y divide-gray-100 rounded-lg border border-gray-200 text-sm">
            <div className="flex justify-between px-4 py-2.5">
              <dt className="text-gray-500">Outstanding</dt>
              <dd className={`font-semibold ${target.outstanding > 0 ? "text-red-700" : "text-gray-900"}`}>{naira(target.outstanding)}</dd>
            </div>
            <div className="flex justify-between px-4 py-2.5">
              <dt className="text-gray-500">Wallet balance</dt>
              <dd className="text-gray-900">{naira(target.walletBalance)}</dd>
            </div>
          </dl>

          <label className="block text-sm font-medium text-gray-700">
            Amount received (₦)
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              inputMode="numeric"
              placeholder="e.g. 20000"
              className="mt-1 w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </label>
          {validAmount && (
            <p className="-mt-3 text-xs text-gray-500">
              {overpay > 0
                ? `Clears the bill. The extra ${naira(overpay)} is kept in the patient's wallet as a deposit.`
                : overpay === 0
                  ? "Clears the bill."
                  : "Pays off the oldest unpaid lines it fully covers. Any change is kept in the patient's wallet."}
            </p>
          )}

          {shiftLoading ? null : !shift ? (
            <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
              <p className="text-sm text-amber-800">You don&apos;t have an open cashier shift. Open one to record this payment.</p>
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
          )}

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={busy || !shift || !channel || !validAmount}
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {busy ? "Saving..." : validAmount ? `Received ${naira(value)}` : "Record payment"}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}

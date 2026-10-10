"use client";

import { useState } from "react";
import Modal from "@/app/components/ui/Modal";
import { formatDay, inputCls, todayLagos } from "./shared";

export type DoseAction = "give" | "reschedule" | "cancel";

export interface DoseActionTarget {
  action: DoseAction;
  doseId: number;
  /** e.g. "Hepatitis B — dose 2 of 3 · Ada Obi" */
  label: string;
  scheduledDate: string;
  paymentStatus: string | null;
  hasLaterDoses: boolean;
}

const TITLES: Record<DoseAction, string> = {
  give: "Record dose given",
  reschedule: "Reschedule dose",
  cancel: "Cancel dose",
};

/** Give / reschedule / cancel one vaccination dose. Render with a `key` per target. */
export default function DoseActionModal({ target, onClose, onDone }: { target: DoseActionTarget | null; onClose: () => void; onDone: () => void }) {
  const [batchNumber, setBatchNumber] = useState("");
  const [site, setSite] = useState("");
  const [notes, setNotes] = useState("");
  const [scheduledDate, setScheduledDate] = useState(target?.scheduledDate && target.scheduledDate >= todayLagos() ? target.scheduledDate : todayLagos());
  const [shiftLater, setShiftLater] = useState(true);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!target) return;
    setSaving(true);
    setError("");
    const payload =
      target.action === "give" ? { action: "give", batchNumber, site, notes }
      : target.action === "reschedule" ? { action: "reschedule", scheduledDate, shiftLater: target.hasLaterDoses && shiftLater }
      : { action: "cancel", reason };
    try {
      const res = await fetch(`/api/vaccinations/doses/${target.doseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Failed to update dose");
      onDone();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update dose");
    } finally {
      setSaving(false);
    }
  };

  const disabled = saving || (target?.action === "cancel" && !reason.trim()) || (target?.action === "reschedule" && !scheduledDate);

  return (
    <Modal isOpen={target !== null} onClose={onClose} title={target ? TITLES[target.action] : ""}>
      {target && (
        <div className="space-y-4">
          <div>
            <p className="text-base font-semibold text-gray-900">{target.label}</p>
            <p className="text-sm text-gray-500">Due {formatDay(target.scheduledDate)}</p>
          </div>
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

          {target.action === "give" && (
            <>
              {target.paymentStatus === "not_paid" && (
                <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  This dose hasn&apos;t been paid for yet. It stays on the patient&apos;s bill.
                </p>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="block text-sm font-medium text-gray-700">
                  Batch / lot number
                  <input value={batchNumber} onChange={(e) => setBatchNumber(e.target.value)} className={inputCls} />
                </label>
                <label className="block text-sm font-medium text-gray-700">
                  Site
                  <input value={site} onChange={(e) => setSite(e.target.value)} placeholder="e.g. Left deltoid" className={inputCls} />
                </label>
              </div>
              <label className="block text-sm font-medium text-gray-700">
                Notes <span className="font-normal text-gray-400">(reactions, observations)</span>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className={inputCls} />
              </label>
            </>
          )}

          {target.action === "reschedule" && (
            <>
              <label className="block text-sm font-medium text-gray-700">
                New date
                <input type="date" min={todayLagos()} value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} className={inputCls} />
              </label>
              {target.hasLaterDoses && (
                <label className="flex items-start gap-2 text-sm text-gray-700">
                  <input type="checkbox" checked={shiftLater} onChange={(e) => setShiftLater(e.target.checked)} className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600" />
                  Move the later doses by the same amount, so the gap between doses stays the same
                </label>
              )}
            </>
          )}

          {target.action === "cancel" && (
            <>
              <p className="text-sm text-gray-600">
                The dose won&apos;t be given and its unpaid charge is removed from the patient&apos;s bill.
              </p>
              <label className="block text-sm font-medium text-gray-700">
                Reason
                <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} className={inputCls} />
              </label>
            </>
          )}

          <div className="flex justify-end gap-3 pt-1">
            <button onClick={onClose} className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700">
              Close
            </button>
            <button
              onClick={submit}
              disabled={disabled}
              className={`rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 ${
                target.action === "cancel" ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {saving ? "Saving…" : target.action === "give" ? "Mark as given" : target.action === "reschedule" ? "Reschedule" : "Cancel dose"}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}

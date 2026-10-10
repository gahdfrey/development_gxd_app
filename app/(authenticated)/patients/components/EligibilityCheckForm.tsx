"use client";

import { useState } from "react";

const CHANNELS = [
  { key: "phone", label: "Phone call" },
  { key: "whatsapp", label: "WhatsApp" },
  { key: "hmo_portal", label: "HMO portal" },
  { key: "email", label: "Email" },
  { key: "card", label: "Enrollee card / biometric" },
  { key: "other", label: "Other" },
];

const RESULTS = [
  { key: "eligible", label: "Eligible" },
  { key: "not_eligible", label: "Not eligible" },
  { key: "pending", label: "Awaiting HMO" },
];

interface EligibilityCheckFormProps {
  patientId: number;
  coverageId: number;
  onSaved: () => void;
  onCancel?: () => void;
}

/**
 * Logs one eligibility verification with the HMO (how it was checked, what
 * the HMO said, their reference). Used from the patient's coverage panel and
 * from the finance desk's confirm-payment dialog.
 */
export default function EligibilityCheckForm({ patientId, coverageId, onSaved, onCancel }: EligibilityCheckFormProps) {
  const [channel, setChannel] = useState("phone");
  const [result, setResult] = useState("eligible");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const save = async () => {
    setError("");
    setIsSaving(true);
    try {
      const res = await fetch(`/api/patients/${patientId}/coverages/${coverageId}/eligibility`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel, result, reference, notes }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to save");
        return;
      }
      onSaved();
    } catch {
      setError("Failed to save");
    } finally {
      setIsSaving(false);
    }
  };

  const inputClass =
    "mt-1 w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <div className="space-y-3 rounded-lg border border-blue-200 bg-blue-50/40 p-3">
      <p className="text-sm font-semibold text-gray-900">Log eligibility check</p>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="block text-xs font-medium text-gray-600">
          Checked via
          <select value={channel} onChange={(e) => setChannel(e.target.value)} className={inputClass}>
            {CHANNELS.map((c) => (
              <option key={c.key} value={c.key}>{c.label}</option>
            ))}
          </select>
        </label>
        <label className="block text-xs font-medium text-gray-600">
          HMO response
          <select value={result} onChange={(e) => setResult(e.target.value)} className={inputClass}>
            {RESULTS.map((r) => (
              <option key={r.key} value={r.key}>{r.label}</option>
            ))}
          </select>
        </label>
      </div>
      <label className="block text-xs font-medium text-gray-600">
        HMO reference / officer name <span className="font-normal text-gray-400">(optional)</span>
        <input type="text" value={reference} onChange={(e) => setReference(e.target.value)} className={inputClass} />
      </label>
      <label className="block text-xs font-medium text-gray-600">
        Notes {result === "not_eligible" ? <span className="text-red-600">(reason required)</span> : <span className="font-normal text-gray-400">(optional)</span>}
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={result === "not_eligible" ? "e.g. Premium unpaid since June" : ""}
          className={inputClass}
        />
      </label>
      <div className="flex justify-end gap-2">
        {onCancel && (
          <button type="button" onClick={onCancel} className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
            Cancel
          </button>
        )}
        <button
          type="button"
          onClick={save}
          disabled={isSaving}
          className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {isSaving ? "Saving..." : "Save check"}
        </button>
      </div>
    </div>
  );
}

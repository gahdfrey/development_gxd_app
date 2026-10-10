"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import Modal from "@/app/components/ui/Modal";
import { ExclamationTriangleIcon } from "@heroicons/react/24/solid";

export interface CriticalAlertRow {
  id: number;
  patientId: number;
  patientFirstname: string | null;
  patientLastname: string | null;
  patientMrn: string | null;
  requestId: number;
  testName: string | null;
  parameterName: string;
  value: string;
  flag: "critical_low" | "critical_high";
  raisedAt: string;
  notifyFirstname: string | null;
  notifyLastname: string | null;
  acknowledgedAt: string | null;
  ackFirstname: string | null;
  ackLastname: string | null;
  actionNote: string | null;
  escalatedAt: string | null;
  escalationNote: string | null;
  minutesOpen: number | null;
  overdue: boolean;
}

export function formatAge(minutes: number | null) {
  if (minutes == null) return "";
  if (minutes < 60) return `${minutes} min ago`;
  const h = Math.floor(minutes / 60);
  return h < 48 ? `${h} h ago` : `${Math.floor(h / 24)} days ago`;
}

/**
 * Persistent red bar for a clinician with unacknowledged critical lab
 * results addressed to them; opens a list where each must be acknowledged
 * with a note of the action taken. Polls every minute. Renders nothing for
 * everyone else (and for patients).
 */
export default function CriticalAlertsBar() {
  const { data: user } = useSWR("/api/wai", fetcher, { shouldRetryOnError: false, revalidateOnFocus: false, dedupingInterval: 60000 });
  const isPatient = user?.userrole === "Patient";
  const { data: alerts = [], mutate } = useSWR<CriticalAlertRow[]>(user && !isPatient ? "/api/critical-alerts?scope=mine" : null, fetcher, {
    refreshInterval: 60_000,
  });
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState("");

  if (alerts.length === 0) return null;

  const acknowledge = async (a: CriticalAlertRow) => {
    setError("");
    setBusyId(a.id);
    try {
      const res = await fetch(`/api/critical-alerts/${a.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "acknowledge", note: notes[a.id] ?? "" }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error || "Failed to acknowledge");
        return;
      }
      await mutate();
      if (alerts.length <= 1) setOpen(false);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <div className="mx-4 sm:mx-6 mb-4">
        <button
          onClick={() => setOpen(true)}
          className="flex w-full items-center gap-3 rounded-xl bg-red-600 px-4 py-3 text-left text-white shadow-md hover:bg-red-700"
        >
          <ExclamationTriangleIcon className="h-6 w-6 shrink-0 animate-pulse" />
          <span className="flex-1 text-sm">
            <span className="font-bold">
              {alerts.length} critical lab result{alerts.length === 1 ? "" : "s"} need{alerts.length === 1 ? "s" : ""} your acknowledgement
            </span>
            <span className="block text-red-100">
              {alerts.slice(0, 2).map((a) => `${a.patientFirstname} ${a.patientLastname}: ${a.parameterName} ${a.value}`).join(" · ")}
              {alerts.length > 2 ? ` · +${alerts.length - 2} more` : ""}
            </span>
          </span>
          <span className="shrink-0 rounded-lg bg-white/20 px-3 py-1.5 text-xs font-semibold">Review</span>
        </button>
      </div>

      <Modal isOpen={open} onClose={() => setOpen(false)} title="Critical lab results" size="large">
        <div className="space-y-3">
          <p className="text-sm text-gray-600">
            Confirm you&apos;ve seen each result and note what you&apos;re doing (e.g. &ldquo;Reviewed, starting IV potassium,
            repeat in 2 h&rdquo;). Your acknowledgement is recorded.
          </p>
          {error && <p className="text-sm text-red-600">{error}</p>}
          {alerts.map((a) => (
            <div key={a.id} className="rounded-xl border-2 border-red-200 bg-red-50 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-base font-bold text-red-800">
                    {a.parameterName}: {a.value}{" "}
                    <span className="text-sm">({a.flag === "critical_low" ? "critically low" : "critically high"})</span>
                  </p>
                  <p className="text-sm text-gray-800">
                    <Link href={`/patients/${a.patientId}/history`} className="font-semibold text-blue-700 hover:underline">
                      {a.patientFirstname} {a.patientLastname}
                    </Link>
                    {a.patientMrn && <span className="text-gray-500"> · {a.patientMrn}</span>}
                    {a.testName && <span className="text-gray-500"> · {a.testName}</span>}
                  </p>
                  <p className="text-xs text-gray-500">Reported {formatAge(a.minutesOpen)}</p>
                </div>
              </div>
              <div className="mt-3 flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={notes[a.id] ?? ""}
                  onChange={(e) => setNotes((prev) => ({ ...prev, [a.id]: e.target.value }))}
                  placeholder="What you're doing about it (required)"
                  className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                />
                <button
                  onClick={() => acknowledge(a)}
                  disabled={busyId === a.id || !(notes[a.id] ?? "").trim()}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {busyId === a.id ? "Saving..." : "Acknowledge"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </Modal>
    </>
  );
}

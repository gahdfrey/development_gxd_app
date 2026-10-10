"use client";

import { useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { formatAge, type CriticalAlertRow } from "./CriticalAlertsBar";

/**
 * For the lab: critical results nobody has acknowledged yet. Overdue ones
 * (past the escalation window) are highlighted so staff phone the ward or
 * doctor and record who they spoke to.
 */
export default function CriticalFollowUpPanel() {
  const { data: alerts = [], mutate } = useSWR<CriticalAlertRow[]>("/api/critical-alerts?scope=open", fetcher, { refreshInterval: 60_000 });
  const [noteFor, setNoteFor] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (alerts.length === 0) return null;

  const escalate = async (id: number) => {
    setError("");
    setBusy(true);
    try {
      const res = await fetch(`/api/critical-alerts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "escalate", note }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error || "Failed to save");
        return;
      }
      setNoteFor(null);
      setNote("");
      mutate();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mb-6 rounded-xl border border-red-200 bg-white">
      <div className="flex items-center gap-2 border-b border-red-100 bg-red-50 px-4 py-3 rounded-t-xl">
        <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />
        <h2 className="text-sm font-bold text-red-800">
          Critical results awaiting doctor acknowledgement ({alerts.length})
        </h2>
      </div>
      {error && <p className="px-4 pt-2 text-sm text-red-600">{error}</p>}
      <ul className="divide-y divide-gray-100">
        {alerts.map((a) => (
          <li key={a.id} className={`px-4 py-3 ${a.overdue ? "bg-red-50/50" : ""}`}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="text-sm">
                <p className="font-semibold text-gray-900">
                  {a.patientFirstname} {a.patientLastname}
                  {a.patientMrn && <span className="font-normal text-gray-500"> · {a.patientMrn}</span>}
                </p>
                <p className="text-red-700 font-semibold">
                  {a.parameterName}: {a.value}
                  {a.testName && <span className="font-normal text-gray-500"> ({a.testName})</span>}
                </p>
                <p className="text-xs text-gray-500">
                  Sent to Dr. {a.notifyFirstname} {a.notifyLastname} {formatAge(a.minutesOpen)}
                  {a.overdue && <span className="ml-1 font-semibold text-red-700">· overdue — phone the ward/doctor</span>}
                </p>
                {a.escalatedAt && (
                  <p className="text-xs text-purple-700">
                    Followed up {new Date(a.escalatedAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}: {a.escalationNote}
                  </p>
                )}
              </div>
              {noteFor === a.id ? (
                <div className="flex w-full sm:w-auto gap-2">
                  <input
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="e.g. Phoned Nurse Bola, Ward B — will inform Dr"
                    className="flex-1 sm:w-72 rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                    autoFocus
                  />
                  <button onClick={() => escalate(a.id)} disabled={busy || !note.trim()} className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">
                    Save
                  </button>
                  <button onClick={() => setNoteFor(null)} className="text-xs text-gray-500">Cancel</button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setNoteFor(a.id);
                    setNote("");
                  }}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold border ${a.overdue ? "bg-red-600 text-white border-red-600" : "bg-white text-red-700 border-red-200"}`}
                >
                  Record phone follow-up
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

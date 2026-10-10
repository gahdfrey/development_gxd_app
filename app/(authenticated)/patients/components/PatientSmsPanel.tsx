"use client";

import { useState } from "react";
import useSWR, { mutate as globalMutate } from "swr";
import { fetcher } from "@/lib/fetcher";

interface LogRow {
  id: number;
  kind: string;
  body: string;
  status: string;
  skipReason: string | null;
  provider: string | null;
  createdAt: string;
}

/** Patient's SMS preference, a one-off message, and recent messages. */
export default function PatientSmsPanel({ patientId, optOut }: { patientId: number; optOut: boolean }) {
  const { data: log = [], mutate } = useSWR<LogRow[]>(`/api/messaging/log?patientId=${patientId}`, fetcher);
  const [composing, setComposing] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const toggle = async () => {
    const next = !optOut;
    if (next && !confirm("Record that this patient does NOT want SMS from the hospital? They'll get no reminders or result alerts.")) return;
    const res = await fetch(`/api/patients/${patientId}/messaging`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ optOut: next }) });
    if (res.ok) globalMutate(`/api/patients/${patientId}`);
    else alert((await res.json()).error || "Failed");
  };

  const send = async () => {
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/messaging/send", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ patientId, body: text }) });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error || "Not sent");
        return;
      }
      setComposing(false);
      setText("");
      mutate();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">SMS</h3>
        {!optOut && !composing && (
          <button onClick={() => setComposing(true)} className="text-sm font-medium text-blue-600 hover:text-blue-800">Send SMS</button>
        )}
      </div>
      <div className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm ${optOut ? "border-amber-200 bg-amber-50 text-amber-800" : "border-gray-200 text-gray-700"}`}>
        <span>{optOut ? "Patient has opted out of SMS" : "Receives appointment reminders and result alerts by SMS"}</span>
        <button onClick={toggle} className="text-xs font-medium text-blue-600 hover:underline">{optOut ? "Opt back in" : "Opt out"}</button>
      </div>
      {composing && (
        <div className="mt-2 space-y-2">
          {error && <p className="text-xs text-red-600">{error}</p>}
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} placeholder="e.g. Please come back tomorrow to collect your results." className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">{text.length} / 160</span>
            <div className="flex gap-2">
              <button onClick={() => setComposing(false)} className="px-3 py-1.5 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg">Cancel</button>
              <button onClick={send} disabled={busy || !text.trim()} className="px-3 py-1.5 text-sm text-white bg-blue-600 rounded-lg disabled:opacity-50">{busy ? "Sending..." : "Send"}</button>
            </div>
          </div>
        </div>
      )}
      {log.length > 0 && (
        <ul className="mt-2 space-y-1">
          {log.slice(0, 5).map((m) => (
            <li key={m.id} className="text-xs text-gray-600">
              <span className="text-gray-400">{new Date(m.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}</span> · {m.kind.replace(/_/g, " ")} ·{" "}
              <span className={m.status === "sent" ? "text-green-700" : m.status === "failed" ? "text-red-700" : "text-gray-500"}>
                {m.status}{m.provider === "mock" && m.status === "sent" ? " (test mode)" : ""}
              </span>
              {m.skipReason && ` — ${m.skipReason}`}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

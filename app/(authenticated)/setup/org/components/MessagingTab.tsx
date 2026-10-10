"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { useToast } from "@/app/contexts/ToastContext";
import { renderTemplate, smsSegments } from "@/lib/messaging/templates";

interface KindRow {
  kind: string;
  label: string;
  on: boolean;
  body: string;
  isCustom: boolean;
  defaultBody: string;
}

interface Settings {
  enabled: boolean;
  senderId: string | null;
  provider: string;
  live: boolean;
  placeholders: string[];
  kinds: KindRow[];
}

interface LogRow {
  id: number;
  patientFirstname: string | null;
  patientLastname: string | null;
  kind: string;
  toPhone: string | null;
  body: string;
  status: "sent" | "failed" | "skipped" | "sending";
  skipReason: string | null;
  provider: string | null;
  error: string | null;
  createdAt: string;
  sentByFirstname: string | null;
}

const SAMPLE = { patient: "Ngozi", hospital: "Your Hospital", when: "tomorrow", date: "Tue 7 Oct", time: "10am", doctor: "Dr Okafor", test: "Full Blood Count", amount: "4,500" };

const STATUS_STYLE: Record<string, string> = {
  sent: "bg-green-50 text-green-700 border-green-200",
  failed: "bg-red-50 text-red-700 border-red-200",
  skipped: "bg-gray-100 text-gray-600 border-gray-300",
  sending: "bg-blue-50 text-blue-700 border-blue-200",
};

/**
 * Setup → Messaging: switch patient SMS on/off, sender ID, which automatic
 * messages go out and their wording (with a live preview and SMS length),
 * a test send, and the log of everything sent.
 */
export default function MessagingTab() {
  const { showToast } = useToast();
  const { data, mutate } = useSWR<Settings>("/api/messaging/settings", fetcher);
  const { data: log = [], mutate: mutateLog } = useSWR<LogRow[]>("/api/messaging/log", fetcher);
  const [form, setForm] = useState<Settings | null>(null);
  const [testPhone, setTestPhone] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  if (!form) return <div className="h-40 rounded-xl bg-gray-50 animate-pulse" />;

  const setKind = (i: number, patch: Partial<KindRow>) =>
    setForm({ ...form, kinds: form.kinds.map((k, idx) => (idx === i ? { ...k, ...patch } : k)) });

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/messaging/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: form.enabled, senderId: form.senderId, kinds: form.kinds.map((k) => ({ kind: k.kind, on: k.on, body: k.body })) }),
      });
      const body = await res.json();
      if (!res.ok) return showToast(body.error || "Failed to save", "error");
      showToast("Messaging settings saved", "success");
      mutate();
    } finally {
      setSaving(false);
    }
  };

  const test = async () => {
    const res = await fetch("/api/messaging/test", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone: testPhone }) });
    const body = await res.json();
    if (!res.ok) showToast(body.error || "Test failed", "error");
    else showToast(body.live ? "Test SMS sent — check the phone" : "Test recorded (test mode — no real SMS sent)", "success");
    mutateLog();
  };

  const input = "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <div className="space-y-6 max-w-4xl">
      <div className={`rounded-xl border px-4 py-3 text-sm ${form.live ? "border-green-200 bg-green-50 text-green-800" : "border-amber-200 bg-amber-50 text-amber-800"}`}>
        {form.live ? (
          <>SMS provider connected: <span className="font-semibold capitalize">{form.provider}</span>. Messages will really be sent when SMS is switched on below.</>
        ) : (
          <>
            <span className="font-semibold">Test mode</span> — no SMS provider is connected, so nothing reaches patients&apos; phones; messages are only recorded in the log
            below. Ask your administrator to add the SMS provider key (Termii) to go live.
          </>
        )}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-4">
        <label className="flex items-start gap-3">
          <input type="checkbox" checked={form.enabled} onChange={(e) => setForm({ ...form, enabled: e.target.checked })} className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600" />
          <span>
            <span className="text-sm font-semibold text-gray-900">Send SMS to patients</span>
            <span className="block text-xs text-gray-500">
              Appointment confirmations and reminders, results-ready and payment receipts. Patients who opt out are never messaged.
            </span>
          </span>
        </label>
        <label className="block text-sm font-medium text-gray-700 max-w-xs">
          Sender ID <span className="font-normal text-gray-400">(3–11 letters/numbers, approved by your provider)</span>
          <input value={form.senderId ?? ""} onChange={(e) => setForm({ ...form, senderId: e.target.value })} placeholder="e.g. DLEVENTH" className={`mt-1 ${input}`} />
        </label>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-bold text-gray-800">Automatic messages</h3>
        <p className="text-xs text-gray-500">Placeholders: {form.placeholders.join(" ")}</p>
        {form.kinds.map((k, i) => {
          const preview = renderTemplate(k.body, SAMPLE);
          const seg = smsSegments(preview);
          return (
            <div key={k.kind} className="rounded-xl border border-gray-200 bg-white p-4 space-y-2">
              <div className="flex items-center justify-between">
                <label className="inline-flex items-center gap-2 text-sm font-semibold text-gray-900">
                  <input type="checkbox" checked={k.on} onChange={(e) => setKind(i, { on: e.target.checked })} className="h-4 w-4 rounded border-gray-300 text-blue-600" />
                  {k.label}
                </label>
                {k.body !== k.defaultBody && (
                  <button onClick={() => setKind(i, { body: k.defaultBody })} className="text-xs font-medium text-blue-600">Reset to default</button>
                )}
              </div>
              <textarea value={k.body} onChange={(e) => setKind(i, { body: e.target.value })} rows={2} className={input} disabled={!k.on} />
              <p className="text-xs text-gray-500">
                Preview: <span className="text-gray-800">{preview}</span>
              </p>
              <p className={`text-xs ${seg.segments > 1 || seg.unicode ? "text-amber-700" : "text-gray-400"}`}>
                {seg.chars} characters · {seg.segments} SMS{seg.unicode ? " (contains special characters — shorter SMS limit)" : ""}
              </p>
            </div>
          );
        })}
      </div>

      <div className="flex justify-end">
        <button onClick={save} disabled={saving} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
          {saving ? "Saving..." : "Save messaging settings"}
        </button>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-2">
        <h3 className="text-sm font-bold text-gray-800">Send a test</h3>
        <div className="flex gap-2 max-w-md">
          <input value={testPhone} onChange={(e) => setTestPhone(e.target.value)} placeholder="Your mobile, e.g. 0803 123 4567" className={input} />
          <button onClick={test} disabled={!testPhone.trim()} className="shrink-0 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">
            Send test
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-bold text-gray-800">Message log</h3>
        {log.length === 0 ? (
          <p className="text-sm text-gray-500">No messages yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {["When", "To", "Type", "Message", "Status"].map((h) => (
                    <th key={h} className="px-3 py-2 text-left text-xs font-semibold uppercase text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {log.map((m) => (
                  <tr key={m.id}>
                    <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500">{new Date(m.createdAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {m.patientFirstname ? `${m.patientFirstname} ${m.patientLastname ?? ""}` : "—"}
                      <span className="block text-xs text-gray-500">{m.toPhone ?? "no number"}</span>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-600">{m.kind.replace(/_/g, " ")}{m.sentByFirstname ? ` · ${m.sentByFirstname}` : ""}</td>
                    <td className="px-3 py-2 text-xs text-gray-700 max-w-md">{m.body}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${STATUS_STYLE[m.status] ?? ""}`}>
                        {m.status}{m.provider === "mock" && m.status === "sent" ? " (test)" : ""}
                      </span>
                      {(m.skipReason || m.error) && <span className="block text-[11px] text-gray-500">{m.skipReason ?? m.error}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

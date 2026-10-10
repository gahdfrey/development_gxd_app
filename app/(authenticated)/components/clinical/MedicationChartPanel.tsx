"use client";

import { useState } from "react";
import useSWR, { mutate as globalMutate } from "swr";
import { fetcher } from "@/lib/fetcher";
import Modal from "@/app/components/ui/Modal";
import PrescriptionModal from "../../my-appointments/components/PrescriptionModal";
import { ChevronLeftIcon, ChevronRightIcon, PlusIcon, ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { FREQUENCIES, ROUTES } from "@/lib/emar/schedule";

type SlotState = "given" | "held" | "refused" | "not_available" | "missed" | "due" | "overdue" | "upcoming";

interface AdminEvent {
  id: number;
  scheduledAt: string | null;
  status: "given" | "held" | "refused" | "not_available" | "missed";
  givenAt: string;
  doseGiven: string | null;
  reason: string | null;
  prnIndication: string | null;
  prnEffect: string | null;
  byFirstname: string | null;
  byLastname: string | null;
  witnessFirstname: string | null;
  witnessLastname: string | null;
}

interface ChartItem {
  id: number;
  genericName: string | null;
  genericStrength: string | null;
  genericForm: string | null;
  productName: string | null;
  dosage: string;
  doseAmount: string | null;
  route: string | null;
  frequency: string | null;
  durationDays: number | null;
  startAt: string | null;
  isPrn: boolean;
  prnIndication: string | null;
  prnMaxPer24h: number | null;
  prnMinIntervalHours: number | null;
  stoppedAt: string | null;
  stopReason: string | null;
  highAlert: boolean;
  active: boolean;
  courseEnd: string | null;
  dispensed: boolean;
  slots: { scheduledAt: string; state: SlotState; event: AdminEvent | null }[];
  unscheduled: AdminEvent[];
  prn: { givenLast24h: number; lastGivenAt: string | null; nextAllowedAt: string | null; limitReached: boolean } | null;
}

interface ChartResponse {
  date: string;
  items: ChartItem[];
  admissionStatus: string;
}

interface Patient {
  id: number;
  firstname: string;
  lastname: string;
  gender: string;
  dob: string;
  countryCode: string;
  phone: string;
}

interface Staff {
  id: number;
  firstname: string;
  lastname: string;
  roleName: string | null;
}

const STATE_STYLE: Record<SlotState, string> = {
  given: "bg-green-600 text-white border-green-600",
  held: "bg-gray-200 text-gray-800 border-gray-300",
  refused: "bg-amber-200 text-amber-900 border-amber-300",
  not_available: "bg-purple-100 text-purple-800 border-purple-200",
  missed: "bg-red-100 text-red-800 border-red-300",
  due: "bg-blue-600 text-white border-blue-600 animate-pulse",
  overdue: "bg-red-600 text-white border-red-600",
  upcoming: "bg-white text-gray-600 border-gray-300",
};

const STATE_LABEL: Record<SlotState, string> = {
  given: "Given",
  held: "Held",
  refused: "Refused",
  not_available: "Not available",
  missed: "Missed",
  due: "Due",
  overdue: "Overdue",
  upcoming: "",
};

const OUTCOMES = [
  { key: "given", label: "Given" },
  { key: "held", label: "Held (clinical reason)" },
  { key: "refused", label: "Patient refused" },
  { key: "not_available", label: "Drug not available" },
  { key: "missed", label: "Missed" },
] as const;

function time(iso: string) {
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Lagos" });
}

function shiftDate(date: string, days: number) {
  const [y, m, d] = date.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + days));
  return t.toISOString().slice(0, 10);
}

function localInputValue(d: Date) {
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60_000).toISOString().slice(0, 16);
}

/**
 * Ward medication chart (eMAR) for one admission: each inpatient drug with
 * today's scheduled doses as tappable time slots (given / held / refused /
 * not available / missed), PRN doses with their limits, and a second-nurse
 * witness for high-alert medicines.
 */
export default function MedicationChartPanel({ admissionId, patientId }: { admissionId: number; patientId: number }) {
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Lagos" });
  const [date, setDate] = useState(today);
  const key = `/api/admissions/${admissionId}/emar?date=${date}`;
  const { data, isLoading, mutate } = useSWR<ChartResponse>(key, fetcher, { refreshInterval: 60_000 });
  const { data: patient } = useSWR<Patient>(`/api/patients/${patientId}`, fetcher);
  const [recording, setRecording] = useState<{ item: ChartItem; slot: string | null } | null>(null);
  const [prescribing, setPrescribing] = useState(false);
  const [stopping, setStopping] = useState<ChartItem | null>(null);
  const [stopReason, setStopReason] = useState("");
  const [showStopped, setShowStopped] = useState(false);

  const refresh = () => {
    mutate();
    globalMutate("/api/emar/ward");
  };

  if (isLoading || !data) return <div className="h-32 rounded-xl bg-gray-50 animate-pulse" />;

  const active = data.items.filter((i) => i.active);
  const inactive = data.items.filter((i) => !i.active);
  const readOnly = data.admissionStatus !== "admitted";

  const addEffect = async (ev: AdminEvent) => {
    const effect = prompt("Effect of this dose (e.g. pain 7 → 3 after 45 min):");
    if (!effect?.trim()) return;
    const res = await fetch(`/api/emar/${ev.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prnEffect: effect }) });
    if (!res.ok) alert((await res.json()).error || "Failed");
    else refresh();
  };

  const undo = async (ev: AdminEvent) => {
    const reason = prompt("Why remove this entry? (e.g. recorded against the wrong patient)");
    if (!reason?.trim()) return;
    const res = await fetch(`/api/emar/${ev.id}`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reason }) });
    if (!res.ok) alert((await res.json()).error || "Failed");
    else refresh();
  };

  const stop = async () => {
    if (!stopping) return;
    const res = await fetch(`/api/prescriptions/${stopping.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "stop", stopReason }),
    });
    if (!res.ok) {
      alert((await res.json()).error || "Failed");
      return;
    }
    setStopping(null);
    setStopReason("");
    refresh();
  };

  const card = (item: ChartItem) => (
    <div key={item.id} className={`rounded-xl border bg-white p-3 ${item.highAlert ? "border-red-200" : "border-gray-200"} ${item.active ? "" : "opacity-70"}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900">
            {item.genericName} {item.genericStrength}
            {item.productName && <span className="font-normal text-gray-500"> ({item.productName})</span>}
          </p>
          <p className="text-sm text-gray-700">
            {item.doseAmount ?? "—"} · {ROUTES[item.route as keyof typeof ROUTES] ?? item.route ?? "—"} ·{" "}
            {FREQUENCIES[item.frequency as keyof typeof FREQUENCIES]?.label ?? item.frequency ?? item.dosage}
            {item.isPrn && item.prnIndication && <> · for {item.prnIndication}</>}
          </p>
          <p className="text-xs text-gray-500">
            {item.startAt && `Started ${new Date(item.startAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}`}
            {item.courseEnd && item.active && ` · until ${new Date(item.courseEnd).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}`}
            {item.stoppedAt && ` · stopped ${new Date(item.stoppedAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}: ${item.stopReason}`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {item.highAlert && <span className="rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold text-white">HIGH-ALERT</span>}
          {item.isPrn && <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-800">PRN</span>}
          {!item.dispensed && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">Not yet dispensed</span>}
          {item.active && !readOnly && (
            <button onClick={() => setStopping(item)} className="text-xs font-medium text-red-600 hover:text-red-800">Stop</button>
          )}
        </div>
      </div>

      {item.slots.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {item.slots.map((s) => (
            <button
              key={s.scheduledAt}
              onClick={() => !s.event && !readOnly && item.active ? setRecording({ item, slot: s.scheduledAt }) : undefined}
              disabled={readOnly || (!s.event && !item.active)}
              title={
                s.event
                  ? `${STATE_LABEL[s.state]} ${time(s.event.givenAt)} by ${s.event.byFirstname ?? ""}${s.event.reason ? ` — ${s.event.reason}` : ""}${s.event.witnessFirstname ? ` · witness ${s.event.witnessFirstname}` : ""}`
                  : STATE_LABEL[s.state] || "Upcoming"
              }
              className={`rounded-lg border px-2.5 py-1 text-xs font-semibold ${STATE_STYLE[s.state]}`}
            >
              {time(s.scheduledAt)}
              {STATE_LABEL[s.state] && <span className="ml-1 font-normal">{STATE_LABEL[s.state]}</span>}
            </button>
          ))}
        </div>
      )}

      {item.isPrn && item.prn && (
        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
          <span className="text-gray-600">
            {item.prn.givenLast24h} given in last 24 h{item.prnMaxPer24h ? ` (max ${item.prnMaxPer24h})` : ""}
            {item.prn.nextAllowedAt && new Date(item.prn.nextAllowedAt) > new Date() && ` · next allowed ${time(item.prn.nextAllowedAt)}`}
          </span>
          {item.active && !readOnly && (
            <button
              onClick={() => setRecording({ item, slot: null })}
              disabled={item.prn.limitReached}
              className="rounded-lg bg-blue-600 px-3 py-1 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {item.prn.limitReached ? "24 h limit reached" : "Give PRN dose"}
            </button>
          )}
        </div>
      )}

      {(item.unscheduled.length > 0 || item.slots.some((s) => s.event)) && (
        <ul className="mt-2 space-y-0.5 border-t border-gray-100 pt-2">
          {[...item.slots.filter((s) => s.event).map((s) => s.event!), ...item.unscheduled]
            .sort((a, b) => new Date(b.givenAt).getTime() - new Date(a.givenAt).getTime())
            .slice(0, 6)
            .map((ev) => (
              <li key={ev.id} className="flex flex-wrap items-center gap-2 text-[11px] text-gray-600">
                <span className={`rounded px-1.5 py-0.5 font-semibold ${STATE_STYLE[ev.status]}`}>{STATE_LABEL[ev.status]}</span>
                <span>
                  {time(ev.givenAt)}
                  {ev.doseGiven && ` · ${ev.doseGiven}`}
                  {ev.prnIndication && ` · for ${ev.prnIndication}`}
                  {ev.reason && ` · ${ev.reason}`} · {ev.byFirstname} {ev.byLastname}
                  {ev.witnessFirstname && ` · checked by ${ev.witnessFirstname} ${ev.witnessLastname ?? ""}`}
                  {ev.prnEffect && ` · effect: ${ev.prnEffect}`}
                </span>
                {!readOnly && item.isPrn && ev.status === "given" && !ev.prnEffect && (
                  <button onClick={() => addEffect(ev)} className="font-medium text-blue-600 hover:underline">Record effect</button>
                )}
                {!readOnly && <button onClick={() => undo(ev)} className="text-red-500 hover:underline">undo</button>}
              </li>
            ))}
        </ul>
      )}
    </div>
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <button onClick={() => setDate(shiftDate(date, -1))} className="rounded-lg border border-gray-300 p-1.5 hover:bg-gray-50" aria-label="Previous day">
            <ChevronLeftIcon className="h-4 w-4" />
          </button>
          <span className="min-w-[130px] text-center text-sm font-semibold text-gray-800">
            {date === today ? "Today" : new Date(`${date}T12:00:00Z`).toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short" })}
          </span>
          <button onClick={() => setDate(shiftDate(date, 1))} className="rounded-lg border border-gray-300 p-1.5 hover:bg-gray-50" aria-label="Next day">
            <ChevronRightIcon className="h-4 w-4" />
          </button>
          {date !== today && (
            <button onClick={() => setDate(today)} className="ml-1 text-xs font-medium text-blue-600">Today</button>
          )}
        </div>
        {!readOnly && patient && (
          <button onClick={() => setPrescribing(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700">
            <PlusIcon className="h-4 w-4" />
            Prescribe
          </button>
        )}
      </div>

      {active.length === 0 ? (
        <p className="rounded-xl border border-dashed border-gray-300 px-4 py-3 text-sm text-gray-500">
          No active drugs on this patient&apos;s medication chart.
        </p>
      ) : (
        <div className="space-y-2">{active.map(card)}</div>
      )}
      {inactive.length > 0 && (
        <div>
          <button onClick={() => setShowStopped((v) => !v)} className="text-xs font-medium text-gray-500 hover:text-gray-700">
            {showStopped ? "Hide" : "Show"} stopped / completed ({inactive.length})
          </button>
          {showStopped && <div className="mt-2 space-y-2">{inactive.map(card)}</div>}
        </div>
      )}

      {recording && (
        <RecordDoseModal
          admissionId={admissionId}
          item={recording.item}
          slot={recording.slot}
          onClose={() => setRecording(null)}
          onSaved={() => {
            setRecording(null);
            refresh();
          }}
        />
      )}

      {patient && (
        <PrescriptionModal
          isOpen={prescribing}
          onClose={() => setPrescribing(false)}
          admissionId={admissionId}
          prefilledPatient={patient}
          onSuccess={refresh}
        />
      )}

      <Modal isOpen={stopping !== null} onClose={() => setStopping(null)} title="Stop this drug">
        <div className="space-y-4">
          <p className="text-sm text-gray-700">
            {stopping?.genericName} {stopping?.genericStrength} — {stopping?.doseAmount}. Future doses will no longer be due.
          </p>
          <input
            value={stopReason}
            onChange={(e) => setStopReason(e.target.value)}
            placeholder="Reason (e.g. course complete, switched to oral, adverse reaction)"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <div className="flex justify-end gap-3">
            <button onClick={() => setStopping(null)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg">Cancel</button>
            <button onClick={stop} disabled={!stopReason.trim()} className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg disabled:opacity-50">Stop drug</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function RecordDoseModal({
  admissionId,
  item,
  slot,
  onClose,
  onSaved,
}: {
  admissionId: number;
  item: ChartItem;
  slot: string | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { data: staff = [] } = useSWR<Staff[]>(item.highAlert ? "/api/staff" : null, fetcher);
  const [status, setStatus] = useState<(typeof OUTCOMES)[number]["key"]>("given");
  const [dose, setDose] = useState(item.doseAmount ?? "");
  const [givenAt, setGivenAt] = useState(localInputValue(new Date()));
  const [reason, setReason] = useState("");
  const [indication, setIndication] = useState(item.prnIndication ?? "");
  const [witness, setWitness] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setError("");
    setSaving(true);
    try {
      const res = await fetch(`/api/admissions/${admissionId}/emar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prescriptionId: item.id,
          scheduledAt: slot,
          status,
          doseGiven: dose,
          givenAt: new Date(givenAt).toISOString(),
          reason,
          prnIndication: indication,
          witnessUserId: witness ? Number(witness) : undefined,
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error || "Failed to record");
        return;
      }
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  const needsWitness = item.highAlert && status === "given";
  const canSave = status === "given" ? confirmed && (!needsWitness || witness) : reason.trim().length > 0;

  return (
    <Modal isOpen onClose={onClose} title={slot ? `Dose due ${time(slot)}` : "Give as-needed (PRN) dose"}>
      <div className="space-y-4">
        <div className={`rounded-xl border p-3 ${item.highAlert ? "border-red-300 bg-red-50" : "border-gray-200 bg-gray-50"}`}>
          <p className="font-semibold text-gray-900">
            {item.genericName} {item.genericStrength}
          </p>
          <p className="text-sm text-gray-700">
            {item.doseAmount} · {ROUTES[item.route as keyof typeof ROUTES] ?? item.route}
          </p>
          {item.highAlert && (
            <p className="mt-1 flex items-center gap-1 text-sm font-semibold text-red-700">
              <ExclamationTriangleIcon className="h-4 w-4" /> High-alert medicine: a second nurse must independently check before giving.
            </p>
          )}
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex flex-wrap gap-2">
          {OUTCOMES.filter((o) => slot || o.key === "given").map((o) => (
            <button
              key={o.key}
              onClick={() => setStatus(o.key)}
              className={`rounded-lg border px-3 py-1.5 text-sm font-medium ${status === o.key ? "border-blue-500 bg-blue-50 text-blue-800" : "border-gray-300 text-gray-700"}`}
            >
              {o.label}
            </button>
          ))}
        </div>

        {status === "given" ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="text-xs font-medium text-gray-600">
                Dose given
                <input value={dose} onChange={(e) => setDose(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              </label>
              <label className="text-xs font-medium text-gray-600">
                Time given
                <input type="datetime-local" value={givenAt} onChange={(e) => setGivenAt(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              </label>
            </div>
            {item.isPrn && (
              <label className="block text-xs font-medium text-gray-600">
                Reason for giving
                <input value={indication} onChange={(e) => setIndication(e.target.value)} placeholder="e.g. pain score 7" className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              </label>
            )}
            {needsWitness && (
              <label className="block text-xs font-medium text-red-700">
                Checked by (second nurse) *
                <select value={witness} onChange={(e) => setWitness(e.target.value)} className="mt-1 w-full rounded-lg border border-red-300 bg-white px-3 py-2 text-sm">
                  <option value="">Select…</option>
                  {staff.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.firstname} {u.lastname}
                      {u.roleName ? ` (${u.roleName})` : ""}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="flex items-start gap-2 rounded-lg border border-gray-200 bg-white p-3 text-sm text-gray-700">
              <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600" />
              I checked the right patient (name band), right drug, right dose, right route and right time, and the patient&apos;s allergies.
            </label>
          </>
        ) : (
          <label className="block text-xs font-medium text-gray-600">
            Reason *
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={status === "held" ? "e.g. BP 85/50 — withheld, doctor informed" : status === "not_available" ? "e.g. out of stock in pharmacy" : ""}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </label>
        )}

        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg">Cancel</button>
          <button onClick={save} disabled={saving || !canSave} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg disabled:opacity-50">
            {saving ? "Saving..." : "Record"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

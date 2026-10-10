"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { addDays, addMonths, addWeeks, addYears, format, parseISO } from "date-fns";
import Modal from "@/app/components/ui/Modal";
import { fetcher } from "@/lib/fetcher";
import { INTERVAL_UNIT_OPTIONS, formatDay, inputCls, naira, todayLagos, type Vaccine } from "./shared";

interface PatientOption {
  id: number;
  name: string;
  mrn: string | null;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onBooked: () => void;
  /** Book for this patient (patient record page); otherwise pick one. */
  patient?: PatientOption | null;
}

const STEP = { day: addDays, week: addWeeks, month: addMonths, year: addYears } as const;

/** Mirrors buildSchedule() in lib/vaccination.ts, for the preview. */
function previewDates(start: string, doseCount: number, intervalValue: number, unit: keyof typeof STEP): string[] {
  if (!start || !(doseCount >= 1)) return [];
  const s = parseISO(start);
  return Array.from({ length: Math.min(doseCount, 20) }, (_, i) => format(STEP[unit](s, i * (intervalValue || 0)), "yyyy-MM-dd"));
}

/**
 * Books a patient on a vaccine and sets the period they come back in. Every
 * dose is billed at the vaccine's price from Setup → Vaccines.
 */
export default function BookVaccinationModal({ isOpen, onClose, onBooked, patient: fixedPatient }: Props) {
  const { data: vaccines = [] } = useSWR<Vaccine[]>(isOpen ? "/api/vaccines?active=1" : null, fetcher);
  const [patient, setPatient] = useState<PatientOption | null>(fixedPatient ?? null);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<PatientOption[]>([]);
  const [vaccineId, setVaccineId] = useState<number | "">("");
  const [startDate, setStartDate] = useState(todayLagos());
  const [doseCount, setDoseCount] = useState("1");
  const [intervalValue, setIntervalValue] = useState("1");
  const [intervalUnit, setIntervalUnit] = useState<keyof typeof STEP>("month");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setPatient(fixedPatient ?? null);
    setSearch("");
    setResults([]);
    setVaccineId("");
    setStartDate(todayLagos());
    setDoseCount("1");
    setIntervalValue("1");
    setIntervalUnit("month");
    setNotes("");
    setError("");
    // Reset only when opened (or for a different patient), not on every parent render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, fixedPatient?.id]);

  // Patient search (name, hospital number or NIN), debounced.
  useEffect(() => {
    if (fixedPatient || patient || search.trim().length < 2) {
      setResults([]);
      return;
    }
    const t = setTimeout(async () => {
      const res = await fetch(`/api/patients?search=${encodeURIComponent(search.trim())}`);
      if (!res.ok) return;
      const rows: { id: number; firstname: string; lastname: string; mrn: string | null }[] = await res.json();
      setResults(rows.slice(0, 8).map((r) => ({ id: r.id, name: `${r.firstname} ${r.lastname}`, mrn: r.mrn })));
    }, 250);
    return () => clearTimeout(t);
  }, [search, patient, fixedPatient]);

  const vaccine = vaccines.find((v) => v.id === vaccineId) ?? null;
  const pickVaccine = (id: number | "") => {
    setVaccineId(id);
    const v = vaccines.find((x) => x.id === id);
    if (v) {
      setDoseCount(String(v.doseCount));
      setIntervalValue(String(v.intervalValue || 1));
      setIntervalUnit((v.intervalUnit as keyof typeof STEP) ?? "month");
    }
  };

  const doses = Number(doseCount);
  const dates = useMemo(
    () => previewDates(startDate, doses, Number(intervalValue), intervalUnit),
    [startDate, doses, intervalValue, intervalUnit],
  );

  const save = async () => {
    if (!patient || !vaccine) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/vaccinations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: patient.id,
          vaccineId: vaccine.id,
          startDate,
          doseCount: doses,
          intervalValue: Number(intervalValue),
          intervalUnit,
          notes,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Failed to book vaccination");
      onBooked();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to book vaccination");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Book vaccination">
      <div className="space-y-4">
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

        {/* Patient */}
        <div>
          <p className="text-sm font-medium text-gray-700">Patient</p>
          {patient ? (
            <div className="mt-1 flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
              <div>
                <p className="text-sm font-semibold text-gray-900">{patient.name}</p>
                <p className="text-xs font-mono text-gray-500">{patient.mrn ?? "No hospital number"}</p>
              </div>
              {!fixedPatient && (
                <button onClick={() => setPatient(null)} className="text-xs font-semibold text-blue-600">
                  Change
                </button>
              )}
            </div>
          ) : (
            <div className="relative">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or hospital number"
                className={inputCls}
                autoFocus
              />
              {results.length > 0 && (
                <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
                  {results.map((r) => (
                    <li key={r.id}>
                      <button
                        onClick={() => setPatient(r)}
                        className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-blue-50"
                      >
                        <span className="font-medium text-gray-900">{r.name}</span>
                        <span className="font-mono text-xs text-gray-500">{r.mrn}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        {/* Vaccine */}
        <label className="block text-sm font-medium text-gray-700">
          Vaccine
          <select value={vaccineId} onChange={(e) => pickVaccine(e.target.value ? Number(e.target.value) : "")} className={`${inputCls} bg-white`}>
            <option value="">Choose a vaccine…</option>
            {vaccines.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name} — {naira(v.price)} per dose
              </option>
            ))}
          </select>
          {vaccines.length === 0 && (
            <span className="mt-1 block text-xs text-amber-700">No vaccines set up yet — add them in Setup → Organisation → Vaccines.</span>
          )}
          {vaccine?.description && <span className="mt-1 block text-xs font-normal text-gray-500">{vaccine.description}</span>}
        </label>

        {/* Period */}
        <div className="rounded-xl border border-gray-200 p-3 sm:p-4 space-y-3">
          <p className="text-sm font-semibold text-gray-800">Schedule</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block text-sm font-medium text-gray-700">
              First dose
              <input type="date" value={startDate} min={todayLagos()} onChange={(e) => setStartDate(e.target.value)} className={inputCls} />
            </label>
            <label className="block text-sm font-medium text-gray-700">
              Number of doses
              <input type="number" min={1} max={20} value={doseCount} onChange={(e) => setDoseCount(e.target.value)} className={inputCls} />
            </label>
          </div>
          {doses > 1 && (
            <div>
              <p className="text-sm font-medium text-gray-700">Comes back every</p>
              <div className="mt-1 grid grid-cols-2 gap-3">
                <input type="number" min={1} value={intervalValue} onChange={(e) => setIntervalValue(e.target.value)} className={inputCls.replace("mt-1 ", "")} />
                <select value={intervalUnit} onChange={(e) => setIntervalUnit(e.target.value as keyof typeof STEP)} className={`${inputCls.replace("mt-1 ", "")} bg-white`}>
                  {INTERVAL_UNIT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
          {dates.length > 0 && (
            <ol className="divide-y divide-gray-100 rounded-lg bg-gray-50">
              {dates.map((d, i) => (
                <li key={i} className="flex items-center justify-between px-3 py-1.5 text-sm">
                  <span className="text-gray-600">Dose {i + 1}</span>
                  <span className="font-medium text-gray-900">{formatDay(d)}</span>
                </li>
              ))}
            </ol>
          )}
        </div>

        <label className="block text-sm font-medium text-gray-700">
          Notes <span className="font-normal text-gray-400">(optional)</span>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className={inputCls} />
        </label>

        {vaccine && dates.length > 0 && (
          <div className="flex items-center justify-between rounded-lg bg-blue-50 px-3 py-2 text-sm">
            <span className="text-blue-900">
              {dates.length} dose{dates.length !== 1 ? "s" : ""} × {naira(vaccine.price)} added to the patient&apos;s bill
            </span>
            <span className="font-bold text-blue-900">{naira(vaccine.price * dates.length)}</span>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-1">
          <button onClick={onClose} className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700">
            Cancel
          </button>
          <button
            onClick={save}
            disabled={!patient || !vaccine || dates.length === 0 || saving}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "Booking…" : "Book vaccination"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

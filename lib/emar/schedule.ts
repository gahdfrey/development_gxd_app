/**
 * Dose schedules for inpatient prescriptions. A frequency maps to fixed
 * ward round times (hours of the day, Nigerian time — WAT, UTC+1, no DST);
 * STAT is a single dose at the start time and PRN has no schedule.
 * Schedules are computed, not stored: every slot between the prescription's
 * start and its end (duration or stop) is a due dose until an
 * administration is recorded against it.
 */
export const FREQUENCIES = {
  OD: { label: "Once daily (OD)", hours: [8] },
  NOCTE: { label: "At night (nocte)", hours: [22] },
  BD: { label: "Twice daily (BD)", hours: [8, 20] },
  TDS: { label: "Three times daily (TDS)", hours: [8, 14, 22] },
  QDS: { label: "Four times daily (QDS)", hours: [6, 12, 18, 22] },
  Q4H: { label: "Every 4 hours", hours: [2, 6, 10, 14, 18, 22] },
  Q6H: { label: "Every 6 hours", hours: [0, 6, 12, 18] },
  Q8H: { label: "Every 8 hours", hours: [6, 14, 22] },
  Q12H: { label: "Every 12 hours", hours: [8, 20] },
  WEEKLY: { label: "Once weekly", hours: [8] },
  STAT: { label: "Once only, now (STAT)", hours: [] },
  PRN: { label: "As needed (PRN)", hours: [] },
} as const;

export type FrequencyKey = keyof typeof FREQUENCIES;
export const FREQUENCY_KEYS = Object.keys(FREQUENCIES) as FrequencyKey[];

export const ROUTES = {
  oral: "Oral (PO)",
  iv: "Intravenous (IV)",
  im: "Intramuscular (IM)",
  sc: "Subcutaneous (SC)",
  sl: "Sublingual",
  pr: "Rectal (PR)",
  inhaled: "Inhaled / nebulised",
  topical: "Topical",
  ophthalmic: "Eye",
  other: "Other",
} as const;
export type RouteKey = keyof typeof ROUTES;

const WAT_OFFSET_MS = 60 * 60 * 1000;

/** UTC instant of hour `h` on the WAT calendar day containing `day`. */
function watHour(day: Date, h: number): Date {
  const wat = new Date(day.getTime() + WAT_OFFSET_MS);
  return new Date(Date.UTC(wat.getUTCFullYear(), wat.getUTCMonth(), wat.getUTCDate(), h) - WAT_OFFSET_MS);
}

/** Start/end (UTC) of a WAT calendar date "YYYY-MM-DD". */
export function watDayBounds(date: string): { start: Date; end: Date } {
  const [y, m, d] = date.split("-").map(Number);
  const start = new Date(Date.UTC(y, m - 1, d) - WAT_OFFSET_MS);
  return { start, end: new Date(start.getTime() + 86_400_000) };
}

export function todayWat(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Lagos" });
}

export interface SchedulablePrescription {
  frequency: string | null;
  startAt: Date | null;
  createdAt: Date;
  durationDays: number | null;
  stoppedAt: Date | null;
  isPrn: boolean;
}

/** When the course ends (exclusive): stop time, or start + duration. */
export function courseEnd(p: SchedulablePrescription): Date | null {
  const start = p.startAt ?? p.createdAt;
  const byDuration = p.durationDays ? new Date(start.getTime() + p.durationDays * 86_400_000) : null;
  if (p.stoppedAt && byDuration) return p.stoppedAt < byDuration ? p.stoppedAt : byDuration;
  return p.stoppedAt ?? byDuration;
}

/** Scheduled dose times within [from, to). STAT: the start time, once. */
export function scheduledSlots(p: SchedulablePrescription, from: Date, to: Date): Date[] {
  if (p.isPrn || !p.frequency || p.frequency === "PRN") return [];
  const start = p.startAt ?? p.createdAt;
  const end = courseEnd(p);
  if (p.frequency === "STAT") {
    return start >= from && start < to && (!end || start < end || +start === +end) ? [start] : [];
  }
  const def = FREQUENCIES[p.frequency as FrequencyKey];
  if (!def) return [];
  const slots: Date[] = [];
  // Walk WAT days covering [from, to).
  for (let day = new Date(from.getTime() - 86_400_000); day < new Date(to.getTime() + 86_400_000); day = new Date(day.getTime() + 86_400_000)) {
    for (const h of def.hours) {
      const t = watHour(day, h);
      if (t < from || t >= to) continue;
      // First dose: the first round time at/after the prescription starts
      // (minus 30 min, so a drug charted at 07:45 gets the 08:00 dose).
      if (t.getTime() < start.getTime() - 30 * 60_000) continue;
      if (end && t >= end) continue;
      if (p.frequency === "WEEKLY") {
        const daysSince = Math.floor((t.getTime() - start.getTime() + 30 * 60_000) / 86_400_000);
        if (daysSince % 7 !== 0) continue;
      }
      slots.push(t);
    }
  }
  return [...new Map(slots.map((s) => [s.getTime(), s])).values()].sort((a, b) => a.getTime() - b.getTime());
}

/** Minutes after a scheduled time before an unrecorded dose counts as overdue. */
export const OVERDUE_AFTER_MINUTES = 60;

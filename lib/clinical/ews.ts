/**
 * Early-warning scores for a set of observations.
 *
 * NEWS2 — Royal College of Physicians, National Early Warning Score 2 (2017),
 *   implemented to the published chart (adults ≥16, not pregnant).
 * MEOWS — Modified Early Obstetric Warning Score, trigger-based (red /
 *   yellow) on a commonly used UK chart. Obstetric charts vary between
 *   hospitals: the maternity lead should confirm these thresholds.
 * Paediatric — INTERIM vital-sign score on APLS age-specific normal ranges.
 *   It is NOT a validated PEWS (those need effort-of-breathing, capillary
 *   refill and behaviour, and vary by hospital); it flags children whose
 *   vital signs are outside the normal range for their age until the
 *   hospital adopts its chosen PEWS chart.
 *
 * Every function is pure: same inputs → same score.
 */

export type Consciousness = "A" | "C" | "V" | "P" | "U";
export type ScoreType = "news2" | "meows" | "paeds";
export type Band = "low" | "low_medium" | "medium" | "high";

export interface Observations {
  temperatureC?: number | null;
  heartRate?: number | null;
  respiratoryRate?: number | null;
  systolicBp?: number | null;
  diastolicBp?: number | null;
  spo2?: number | null;
  onOxygen?: boolean;
  spo2Scale2?: boolean;
  consciousness?: Consciousness | null;
}

export interface ScoreResult {
  scoreType: ScoreType;
  score: number;
  band: Band;
  /** Parameters that triggered on their own (NEWS2 "3 in one", MEOWS red, paeds 3). */
  triggers: string[];
  /** Per-parameter points, for colouring the chart. */
  parts: Record<string, number>;
  /** Parameters not recorded — the score may under-estimate risk. */
  missing: string[];
  /** Minutes until the next observations are due. */
  nextDueMinutes: number;
  /** Plain-language action for this band. */
  action: string;
  /** True when a clinician must be informed now. */
  escalate: boolean;
}

const has = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

// ─── NEWS2 ────────────────────────────────────────────────────────────────────

function news2Parts(o: Observations): Record<string, number> {
  const parts: Record<string, number> = {};
  if (has(o.respiratoryRate)) {
    const r = o.respiratoryRate;
    parts.respiratoryRate = r <= 8 ? 3 : r <= 11 ? 1 : r <= 20 ? 0 : r <= 24 ? 2 : 3;
  }
  if (has(o.spo2)) {
    const s = o.spo2;
    if (o.spo2Scale2) {
      // Scale 2: 88–92% is the target; high SpO2 on oxygen scores too.
      if (s <= 83) parts.spo2 = 3;
      else if (s <= 85) parts.spo2 = 2;
      else if (s <= 87) parts.spo2 = 1;
      else if (s <= 92 || !o.onOxygen) parts.spo2 = 0;
      else if (s <= 94) parts.spo2 = 1;
      else if (s <= 96) parts.spo2 = 2;
      else parts.spo2 = 3;
    } else {
      parts.spo2 = s <= 91 ? 3 : s <= 93 ? 2 : s <= 95 ? 1 : 0;
    }
  }
  parts.oxygen = o.onOxygen ? 2 : 0;
  if (has(o.systolicBp)) {
    const b = o.systolicBp;
    parts.systolicBp = b <= 90 ? 3 : b <= 100 ? 2 : b <= 110 ? 1 : b <= 219 ? 0 : 3;
  }
  if (has(o.heartRate)) {
    const h = o.heartRate;
    parts.heartRate = h <= 40 ? 3 : h <= 50 ? 1 : h <= 90 ? 0 : h <= 110 ? 1 : h <= 130 ? 2 : 3;
  }
  if (o.consciousness) parts.consciousness = o.consciousness === "A" ? 0 : 3;
  if (has(o.temperatureC)) {
    const t = o.temperatureC;
    parts.temperatureC = t <= 35 ? 3 : t <= 36 ? 1 : t <= 38 ? 0 : t <= 39 ? 1 : 2;
  }
  return parts;
}

export function scoreNews2(o: Observations): ScoreResult {
  const parts = news2Parts(o);
  const score = Object.values(parts).reduce((a, b) => a + b, 0);
  const triggers = Object.entries(parts).filter(([, v]) => v === 3).map(([k]) => k);
  let band: Band = "low";
  if (score >= 7) band = "high";
  else if (score >= 5) band = "medium";
  else if (triggers.length > 0) band = "low_medium";
  // RCP minimum monitoring frequency per clinical risk.
  const nextDueMinutes = band === "high" ? 15 : band === "medium" || band === "low_medium" ? 60 : score >= 1 ? 240 : 720;
  const action =
    band === "high"
      ? "Emergency response: inform the doctor immediately (registrar/consultant level), consider transfer to a higher level of care. Continuous monitoring."
      : band === "medium"
        ? "Urgent response: inform the doctor now for urgent review. Observations at least hourly."
        : band === "low_medium"
          ? "One parameter is severely abnormal: urgent ward-based review by a doctor. Observations at least hourly."
          : score >= 1
            ? "Inform the nurse in charge, who decides whether more frequent monitoring or a doctor's review is needed. Observations at least 4–6 hourly."
            : "Continue routine observations at least 12-hourly.";
  return finish("news2", score, band, triggers, parts, o, ["respiratoryRate", "spo2", "systolicBp", "heartRate", "consciousness", "temperatureC"], nextDueMinutes, action, band !== "low");
}

// ─── MEOWS (trigger-based) ────────────────────────────────────────────────────

export function scoreMeows(o: Observations): ScoreResult {
  const parts: Record<string, number> = {}; // 0 normal, 1 yellow, 3 red
  if (has(o.temperatureC)) parts.temperatureC = o.temperatureC < 35 || o.temperatureC > 38 ? 3 : o.temperatureC < 36 ? 1 : 0;
  if (has(o.systolicBp)) {
    const b = o.systolicBp;
    parts.systolicBp = b < 90 || b > 160 ? 3 : b < 100 || b >= 150 ? 1 : 0;
  }
  if (has(o.diastolicBp)) {
    const d = o.diastolicBp;
    parts.diastolicBp = d > 100 ? 3 : d >= 90 ? 1 : 0;
  }
  if (has(o.heartRate)) {
    const h = o.heartRate;
    parts.heartRate = h < 40 || h > 120 ? 3 : h < 50 || h > 100 ? 1 : 0;
  }
  if (has(o.respiratoryRate)) {
    const r = o.respiratoryRate;
    parts.respiratoryRate = r < 10 || r > 30 ? 3 : r > 20 ? 1 : 0;
  }
  if (has(o.spo2)) parts.spo2 = o.spo2 < 95 ? 3 : 0;
  if (o.consciousness) parts.consciousness = o.consciousness === "A" ? 0 : 3;

  const reds = Object.entries(parts).filter(([, v]) => v === 3).map(([k]) => k);
  const yellows = Object.values(parts).filter((v) => v === 1).length;
  const band: Band = reds.length > 0 ? "high" : yellows >= 2 ? "medium" : yellows === 1 ? "low_medium" : "low";
  const score = reds.length * 3 + yellows;
  const nextDueMinutes = band === "high" ? 15 : band === "medium" ? 30 : band === "low_medium" ? 60 : 240;
  const action =
    band === "high"
      ? "Red trigger: inform the obstetrician/doctor immediately for urgent review."
      : band === "medium"
        ? "Two yellow triggers: inform the doctor for urgent review."
        : band === "low_medium"
          ? "One yellow trigger: inform the midwife/nurse in charge and repeat observations within the hour."
          : "No triggers: continue routine observations.";
  return finish("meows", score, band, reds, parts, o, ["temperatureC", "systolicBp", "diastolicBp", "heartRate", "respiratoryRate", "spo2", "consciousness"], nextDueMinutes, action, band === "high" || band === "medium");
}

// ─── Paediatric (interim, APLS age ranges) ────────────────────────────────────

/** APLS normal ranges by age (years). */
const APLS = [
  { maxAge: 1, rr: [30, 40], hr: [110, 160], sbp: [70, 90] },
  { maxAge: 2, rr: [25, 35], hr: [100, 150], sbp: [85, 95] },
  { maxAge: 5, rr: [25, 30], hr: [95, 140], sbp: [85, 100] },
  { maxAge: 12, rr: [20, 25], hr: [80, 120], sbp: [90, 110] },
  { maxAge: 16, rr: [15, 20], hr: [60, 100], sbp: [100, 120] },
];

export function paedsRanges(ageYears: number) {
  return APLS.find((b) => ageYears < b.maxAge) ?? APLS[APLS.length - 1];
}

function outside(v: number, [lo, hi]: number[]): number {
  if (v >= lo && v <= hi) return 0;
  // Markedly abnormal: more than 20% beyond the normal range.
  return v < lo * 0.8 || v > hi * 1.2 ? 2 : 1;
}

export function scorePaeds(o: Observations, ageYears: number): ScoreResult {
  const r = paedsRanges(ageYears);
  const parts: Record<string, number> = {};
  if (has(o.respiratoryRate)) parts.respiratoryRate = outside(o.respiratoryRate, r.rr);
  if (has(o.heartRate)) parts.heartRate = outside(o.heartRate, r.hr);
  if (has(o.systolicBp)) parts.systolicBp = o.systolicBp < r.sbp[0] * 0.8 ? 2 : o.systolicBp < r.sbp[0] ? 1 : 0;
  if (has(o.spo2)) parts.spo2 = o.spo2 < 92 ? 2 : o.spo2 <= 94 ? 1 : 0;
  parts.oxygen = o.onOxygen ? 2 : 0;
  if (o.consciousness) parts.consciousness = o.consciousness === "A" ? 0 : 3;
  if (has(o.temperatureC)) parts.temperatureC = o.temperatureC >= 38.5 || o.temperatureC < 36 ? 1 : 0;

  const score = Object.values(parts).reduce((a, b) => a + b, 0);
  const triggers = Object.entries(parts).filter(([, v]) => v === 3).map(([k]) => k);
  const band: Band = score >= 5 || triggers.length > 0 ? "high" : score >= 3 ? "medium" : score >= 1 ? "low_medium" : "low";
  const nextDueMinutes = band === "high" ? 15 : band === "medium" ? 60 : band === "low_medium" ? 120 : 240;
  const action =
    band === "high"
      ? "Inform the doctor immediately for urgent review of this child."
      : band === "medium"
        ? "Inform the doctor for review within 30 minutes; observations at least hourly."
        : band === "low_medium"
          ? "Vital signs slightly outside the normal range for age: inform the nurse in charge, repeat within 2 hours."
          : "Vital signs normal for age: continue routine observations.";
  return finish("paeds", score, band, triggers, parts, o, ["respiratoryRate", "heartRate", "spo2", "consciousness", "temperatureC"], nextDueMinutes, action, band === "high" || band === "medium");
}

// ─── Shared ───────────────────────────────────────────────────────────────────

function finish(
  scoreType: ScoreType,
  score: number,
  band: Band,
  triggers: string[],
  parts: Record<string, number>,
  o: Observations,
  required: string[],
  nextDueMinutes: number,
  action: string,
  escalate: boolean,
): ScoreResult {
  const missing = required.filter((k) => {
    const v = (o as Record<string, unknown>)[k];
    return v === undefined || v === null || v === "";
  });
  return { scoreType, score, band, triggers, parts, missing, nextDueMinutes, action, escalate };
}

/**
 * Picks the right score for the patient: paediatric under 16, MEOWS when
 * pregnant or up to 6 weeks postpartum, otherwise NEWS2.
 */
export function chooseScoreType(ageYears: number | null, pregnantOrPostpartum: boolean): ScoreType {
  if (ageYears != null && ageYears < 16) return "paeds";
  if (pregnantOrPostpartum) return "meows";
  return "news2";
}

export function scoreObservations(type: ScoreType, o: Observations, ageYears: number | null): ScoreResult {
  if (type === "paeds") return scorePaeds(o, ageYears ?? 10);
  if (type === "meows") return scoreMeows(o);
  return scoreNews2(o);
}

export const SCORE_LABEL: Record<ScoreType, string> = {
  news2: "NEWS2",
  meows: "MEOWS",
  paeds: "Paediatric score (interim)",
};

export const BAND_LABEL: Record<Band, string> = {
  low: "Low",
  low_medium: "Low–medium",
  medium: "Medium",
  high: "High",
};

export const PARAM_LABEL: Record<string, string> = {
  respiratoryRate: "Resp. rate",
  spo2: "SpO₂",
  oxygen: "On oxygen",
  systolicBp: "Systolic BP",
  diastolicBp: "Diastolic BP",
  heartRate: "Pulse",
  consciousness: "Consciousness",
  temperatureC: "Temperature",
};

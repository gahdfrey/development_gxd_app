import type { LabTestParameter } from "@/lib/db/schema";

export type ResultFlag = "normal" | "low" | "high" | "critical_low" | "critical_high" | "abnormal";

/** Whole years between a YYYY-MM-DD date of birth and now. */
export function ageInYears(dob: string | null | undefined): number | null {
  if (!dob) return null;
  const birth = new Date(dob);
  if (isNaN(birth.getTime())) return null;
  const now = new Date();
  let years = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) years--;
  return years;
}

/** The reference range that applies to this patient: the first sex/age
 * match in refRanges, else the parameter's default refLow/refHigh. */
export function referenceRange(
  p: Pick<LabTestParameter, "refLow" | "refHigh" | "refRanges">,
  patient: { gender?: string | null; ageYears?: number | null },
): { low: number | null; high: number | null } {
  const sex = patient.gender?.toLowerCase();
  for (const r of p.refRanges ?? []) {
    if (r.sex && r.sex !== sex) continue;
    if (r.minAgeYears != null && (patient.ageYears == null || patient.ageYears < r.minAgeYears)) continue;
    if (r.maxAgeYears != null && (patient.ageYears == null || patient.ageYears > r.maxAgeYears)) continue;
    return { low: r.low ?? null, high: r.high ?? null };
  }
  return { low: p.refLow ?? null, high: p.refHigh ?? null };
}

/** Flags a result value against its range / critical limits / abnormal choices. */
export function flagValue(
  p: Pick<LabTestParameter, "valueType" | "criticalLow" | "criticalHigh" | "abnormalChoices">,
  range: { low: number | null; high: number | null },
  value: { numeric?: number | null; text?: string | null },
): ResultFlag {
  if (p.valueType === "numeric" && value.numeric != null) {
    const v = value.numeric;
    if (p.criticalLow != null && v < p.criticalLow) return "critical_low";
    if (p.criticalHigh != null && v > p.criticalHigh) return "critical_high";
    if (range.low != null && v < range.low) return "low";
    if (range.high != null && v > range.high) return "high";
    return "normal";
  }
  if (p.valueType === "choice" && value.text) {
    return (p.abnormalChoices ?? []).includes(value.text) ? "abnormal" : "normal";
  }
  return "normal";
}

export const isCritical = (f: string) => f === "critical_low" || f === "critical_high";

export const FLAG_LABEL: Record<ResultFlag, string> = {
  normal: "",
  low: "Low",
  high: "High",
  critical_low: "CRITICAL LOW",
  critical_high: "CRITICAL HIGH",
  abnormal: "Abnormal",
};

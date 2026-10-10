export interface AllergyRow {
  id: number;
  category: "drug" | "drug_class" | "food" | "environment" | "other";
  genericId: number | null;
  drugClassId: number | null;
  drugClassName: string | null;
  substance: string;
  type: "allergy" | "intolerance";
  reaction: string | null;
  severity: "mild" | "moderate" | "severe" | "life_threatening";
  verification: "unconfirmed" | "confirmed" | "refuted";
  onsetDate: string | null;
  notes: string | null;
  createdAt: string;
  recordedByFirstname: string | null;
  recordedByLastname: string | null;
}

export interface ProblemRow {
  id: number;
  icdCode: string | null;
  icdTitle: string | null;
  clinicalText: string | null;
  status: "active" | "inactive" | "resolved";
  onsetDate: string | null;
  resolvedDate: string | null;
  notes: string | null;
  sourceVisitId: number | null;
  createdAt: string;
  recordedByFirstname: string | null;
  recordedByLastname: string | null;
}

export interface MeasurementRow {
  id: number;
  weightKg: number | null;
  heightCm: number | null;
  source: "measured" | "reported";
  measuredAt: string;
  notes: string | null;
  recordedByFirstname: string | null;
  recordedByLastname: string | null;
}

export interface ClinicalSummary {
  allergyStatus: "not_assessed" | "nkda" | "has_allergies";
  allergyStatusUpdatedAt: string | null;
  allergies: AllergyRow[];
  problems: ProblemRow[];
  measurements: MeasurementRow[];
  latest: { weightKg: number | null; weightMeasuredAt: string | null; heightCm: number | null; bmi: number | null };
}

export const SEVERITY_LABEL: Record<AllergyRow["severity"], string> = {
  mild: "Mild",
  moderate: "Moderate",
  severe: "Severe",
  life_threatening: "Life-threatening",
};

export const CATEGORY_LABEL: Record<AllergyRow["category"], string> = {
  drug: "Drug",
  drug_class: "Drug family",
  food: "Food",
  environment: "Environment",
  other: "Other",
};

export const clinicalKey = (patientId: number) => `/api/patients/${patientId}/clinical`;

export function problemLabel(p: Pick<ProblemRow, "icdTitle" | "clinicalText">) {
  return p.icdTitle || p.clinicalText || "Condition";
}

/** Allergies that still count (not refuted). */
export function activeAllergies(list: AllergyRow[]) {
  return list.filter((a) => a.verification !== "refuted");
}

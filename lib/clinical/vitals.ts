import { db } from "@/lib/db";
import { patients, patientProblems, admissions, vitalSigns, users } from "@/lib/db/schema";
import { and, desc, eq, isNull, ne } from "drizzle-orm";
import { ageInYears } from "@/lib/lab/flags";
import { chooseScoreType, scoreObservations, type Consciousness, type Observations, type ScoreType } from "@/lib/clinical/ews";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Executor = typeof db | Tx;

/** ICD-11 chapter 18 (pregnancy, childbirth, puerperium) codes start JA–JB. */
const PREGNANCY_TEXT = /pregnan|postpartum|post-partum|puerper|antenatal|gravid|obstetric/i;

/** Age, pregnancy status (from the problem list) and current admission. */
export async function vitalsContext(executor: Executor, orgId: number, patientId: number) {
  const [patient] = await executor
    .select({ dob: patients.dob, gender: patients.gender })
    .from(patients)
    .where(and(eq(patients.id, patientId), eq(patients.organisationId, orgId), isNull(patients.deletedAt)))
    .limit(1);
  if (!patient) return null;

  const problems = await executor
    .select({ icdCode: patientProblems.icdCode, icdTitle: patientProblems.icdTitle, clinicalText: patientProblems.clinicalText })
    .from(patientProblems)
    .where(and(eq(patientProblems.patientId, patientId), ne(patientProblems.status, "resolved"), isNull(patientProblems.deletedAt)));
  const pregnant =
    patient.gender?.toLowerCase() === "female" &&
    problems.some((p) => /^J[AB]/.test(p.icdCode ?? "") || PREGNANCY_TEXT.test(`${p.icdTitle ?? ""} ${p.clinicalText ?? ""}`));

  const [admission] = await executor
    .select({ id: admissions.id })
    .from(admissions)
    .where(and(eq(admissions.patientId, patientId), eq(admissions.organisationId, orgId), eq(admissions.status, "admitted")))
    .orderBy(desc(admissions.admittedAt))
    .limit(1);

  const age = ageInYears(patient.dob);
  return {
    ageYears: age,
    gender: patient.gender,
    pregnantFromProblems: pregnant,
    defaultScoreType: chooseScoreType(age, pregnant),
    currentAdmissionId: admission?.id ?? null,
  };
}

export interface VitalsInput {
  temperatureC?: unknown;
  heartRate?: unknown;
  respiratoryRate?: unknown;
  systolicBp?: unknown;
  diastolicBp?: unknown;
  spo2?: unknown;
  onOxygen?: unknown;
  oxygenLpm?: unknown;
  spo2Scale2?: unknown;
  consciousness?: unknown;
  painScore?: unknown;
  bloodGlucose?: unknown;
  scoreType?: unknown;
  recordedAt?: unknown;
  escalatedTo?: unknown;
  escalationNote?: unknown;
  notes?: unknown;
}

// Physiologically possible bounds — catch typos, not clinical judgement.
const BOUNDS: Record<string, [number, number, string]> = {
  temperatureC: [25, 45, "Temperature (°C)"],
  heartRate: [20, 300, "Pulse"],
  respiratoryRate: [0, 100, "Respiratory rate"],
  systolicBp: [40, 300, "Systolic BP"],
  diastolicBp: [20, 200, "Diastolic BP"],
  spo2: [50, 100, "SpO₂"],
  oxygenLpm: [0, 60, "Oxygen flow"],
  painScore: [0, 10, "Pain score"],
  bloodGlucose: [10, 1000, "Blood glucose (mg/dL)"],
};
const INTEGER_FIELDS = new Set(["heartRate", "respiratoryRate", "systolicBp", "diastolicBp", "spo2", "painScore"]);

/** Validates observations and calculates the early-warning score. */
export function prepareVitals(input: VitalsInput, ctx: { ageYears: number | null; defaultScoreType: ScoreType }) {
  const values: Record<string, number | null> = {};
  for (const [key, [lo, hi, label]] of Object.entries(BOUNDS)) {
    const raw = (input as Record<string, unknown>)[key];
    if (raw === undefined || raw === null || raw === "") {
      values[key] = null;
      continue;
    }
    const n = Number(raw);
    if (!Number.isFinite(n) || n < lo || n > hi) return { error: `${label} must be between ${lo} and ${hi}` } as const;
    values[key] = INTEGER_FIELDS.has(key) ? Math.round(n) : Math.round(n * 10) / 10;
  }
  const consciousness = typeof input.consciousness === "string" && ["A", "C", "V", "P", "U"].includes(input.consciousness)
    ? (input.consciousness as Consciousness)
    : null;
  const core = ["temperatureC", "heartRate", "respiratoryRate", "systolicBp", "spo2"];
  if (core.every((k) => values[k] == null) && !consciousness) {
    return { error: "Enter at least one observation" } as const;
  }
  const onOxygen = input.onOxygen === true;
  const spo2Scale2 = input.spo2Scale2 === true;
  const scoreType: ScoreType = ["news2", "meows", "paeds"].includes(input.scoreType as string)
    ? (input.scoreType as ScoreType)
    : ctx.defaultScoreType;

  const obs: Observations = {
    temperatureC: values.temperatureC,
    heartRate: values.heartRate,
    respiratoryRate: values.respiratoryRate,
    systolicBp: values.systolicBp,
    diastolicBp: values.diastolicBp,
    spo2: values.spo2,
    onOxygen,
    spo2Scale2,
    consciousness,
  };
  const result = scoreObservations(scoreType, obs, ctx.ageYears);

  let recordedAt = new Date();
  if (input.recordedAt) {
    recordedAt = new Date(String(input.recordedAt));
    if (isNaN(recordedAt.getTime()) || recordedAt.getTime() > Date.now() + 5 * 60_000) {
      return { error: "Invalid observation time" } as const;
    }
  }
  const text = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);

  return {
    value: {
      recordedAt,
      temperatureC: values.temperatureC,
      heartRate: values.heartRate,
      respiratoryRate: values.respiratoryRate,
      systolicBp: values.systolicBp,
      diastolicBp: values.diastolicBp,
      spo2: values.spo2,
      onOxygen,
      oxygenLpm: onOxygen ? values.oxygenLpm : null,
      spo2Scale2,
      consciousness,
      painScore: values.painScore,
      bloodGlucose: values.bloodGlucose,
      scoreType: result.scoreType,
      score: result.score,
      band: result.band,
      triggers: result.triggers,
      nextDueAt: new Date(recordedAt.getTime() + result.nextDueMinutes * 60_000),
      escalatedTo: text(input.escalatedTo),
      escalationNote: text(input.escalationNote),
      notes: text(input.notes),
    },
    result,
  } as const;
}

/** A patient's recent observations, newest first, with who recorded them. */
export async function listVitals(executor: Executor, orgId: number, patientId: number, limit = 50) {
  return executor
    .select({ v: vitalSigns, byFirstname: users.firstname, byLastname: users.lastname })
    .from(vitalSigns)
    .leftJoin(users, eq(vitalSigns.recordedBy, users.id))
    .where(and(eq(vitalSigns.patientId, patientId), eq(vitalSigns.organisationId, orgId), isNull(vitalSigns.deletedAt)))
    .orderBy(desc(vitalSigns.recordedAt))
    .limit(limit)
    .then((rows) => rows.map((r) => ({ ...r.v, recordedByFirstname: r.byFirstname, recordedByLastname: r.byLastname })));
}

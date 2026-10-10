import { db } from "@/lib/db";
import {
  patients,
  patientAllergies,
  patientProblems,
  patientMeasurements,
  drugClasses,
  users,
} from "@/lib/db/schema";
import { and, desc, eq, isNull, ne } from "drizzle-orm";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Executor = typeof db | Tx;

export const ALLERGY_CATEGORIES = ["drug", "drug_class", "food", "environment", "other"] as const;
export const ALLERGY_TYPES = ["allergy", "intolerance"] as const;
export const ALLERGY_SEVERITIES = ["mild", "moderate", "severe", "life_threatening"] as const;
export const ALLERGY_VERIFICATIONS = ["unconfirmed", "confirmed", "refuted"] as const;
export const PROBLEM_STATUSES = ["active", "inactive", "resolved"] as const;

/** Loose date: YYYY, YYYY-MM or YYYY-MM-DD (patients often only know the year). */
export const LOOSE_DATE_RE = /^\d{4}(-\d{2}(-\d{2})?)?$/;

/** The patient's org-scoped row, or null. */
export async function findPatientInOrg(executor: Executor, orgId: number, idParam: string | number) {
  const id = typeof idParam === "number" ? idParam : parseInt(idParam);
  if (isNaN(id)) return null;
  const [p] = await executor
    .select({ id: patients.id, allergyStatus: patients.allergyStatus, dob: patients.dob, gender: patients.gender })
    .from(patients)
    .where(and(eq(patients.id, id), eq(patients.organisationId, orgId), isNull(patients.deletedAt)))
    .limit(1);
  return p ?? null;
}

/**
 * Keeps patients.allergyStatus consistent with the allergy list: while any
 * active (not refuted, not deleted) allergy exists it is "has_allergies";
 * when the last one goes it falls back to "not_assessed" — removing an
 * allergy is not the same as confirming the patient has none.
 */
export async function syncAllergyStatus(executor: Executor, patientId: number, actorId: number | null) {
  const [active] = await executor
    .select({ id: patientAllergies.id })
    .from(patientAllergies)
    .where(and(
      eq(patientAllergies.patientId, patientId),
      isNull(patientAllergies.deletedAt),
      ne(patientAllergies.verification, "refuted"),
    ))
    .limit(1);
  const [p] = await executor.select({ status: patients.allergyStatus }).from(patients).where(eq(patients.id, patientId)).limit(1);
  const next = active ? "has_allergies" : p?.status === "has_allergies" ? "not_assessed" : p?.status;
  if (next && next !== p?.status) {
    await executor
      .update(patients)
      .set({ allergyStatus: next, allergyStatusUpdatedAt: new Date(), allergyStatusUpdatedBy: actorId })
      .where(eq(patients.id, patientId));
  }
}

/** Allergies, problem list and weight/height for one patient. */
export async function getClinicalSummary(executor: Executor, orgId: number, patientId: number) {
  const [patient] = await executor
    .select({
      allergyStatus: patients.allergyStatus,
      allergyStatusUpdatedAt: patients.allergyStatusUpdatedAt,
      dob: patients.dob,
      gender: patients.gender,
    })
    .from(patients)
    .where(and(eq(patients.id, patientId), eq(patients.organisationId, orgId)))
    .limit(1);
  if (!patient) return null;

  const [allergies, problems, measurements] = await Promise.all([
    executor
      .select({
        id: patientAllergies.id,
        category: patientAllergies.category,
        genericId: patientAllergies.genericId,
        drugClassId: patientAllergies.drugClassId,
        drugClassName: drugClasses.name,
        substance: patientAllergies.substance,
        type: patientAllergies.type,
        reaction: patientAllergies.reaction,
        severity: patientAllergies.severity,
        verification: patientAllergies.verification,
        onsetDate: patientAllergies.onsetDate,
        notes: patientAllergies.notes,
        createdAt: patientAllergies.createdAt,
        recordedByFirstname: users.firstname,
        recordedByLastname: users.lastname,
      })
      .from(patientAllergies)
      .leftJoin(drugClasses, eq(patientAllergies.drugClassId, drugClasses.id))
      .leftJoin(users, eq(patientAllergies.recordedBy, users.id))
      .where(and(eq(patientAllergies.patientId, patientId), eq(patientAllergies.organisationId, orgId), isNull(patientAllergies.deletedAt)))
      .orderBy(desc(patientAllergies.createdAt)),
    executor
      .select({
        id: patientProblems.id,
        icdCode: patientProblems.icdCode,
        icdTitle: patientProblems.icdTitle,
        clinicalText: patientProblems.clinicalText,
        status: patientProblems.status,
        onsetDate: patientProblems.onsetDate,
        resolvedDate: patientProblems.resolvedDate,
        notes: patientProblems.notes,
        sourceVisitId: patientProblems.sourceVisitId,
        createdAt: patientProblems.createdAt,
        recordedByFirstname: users.firstname,
        recordedByLastname: users.lastname,
      })
      .from(patientProblems)
      .leftJoin(users, eq(patientProblems.recordedBy, users.id))
      .where(and(eq(patientProblems.patientId, patientId), eq(patientProblems.organisationId, orgId), isNull(patientProblems.deletedAt)))
      .orderBy(desc(patientProblems.createdAt)),
    executor
      .select({
        id: patientMeasurements.id,
        weightKg: patientMeasurements.weightKg,
        heightCm: patientMeasurements.heightCm,
        source: patientMeasurements.source,
        measuredAt: patientMeasurements.measuredAt,
        notes: patientMeasurements.notes,
        recordedByFirstname: users.firstname,
        recordedByLastname: users.lastname,
      })
      .from(patientMeasurements)
      .leftJoin(users, eq(patientMeasurements.recordedBy, users.id))
      .where(and(eq(patientMeasurements.patientId, patientId), eq(patientMeasurements.organisationId, orgId), isNull(patientMeasurements.deletedAt)))
      .orderBy(desc(patientMeasurements.measuredAt))
      .limit(20),
  ]);

  const latestWeight = measurements.find((m) => m.weightKg != null) ?? null;
  const latestHeight = measurements.find((m) => m.heightCm != null) ?? null;
  const bmi =
    latestWeight?.weightKg && latestHeight?.heightCm
      ? Math.round((latestWeight.weightKg / (latestHeight.heightCm / 100) ** 2) * 10) / 10
      : null;

  return {
    allergyStatus: patient.allergyStatus,
    allergyStatusUpdatedAt: patient.allergyStatusUpdatedAt,
    allergies,
    problems,
    measurements,
    latest: {
      weightKg: latestWeight?.weightKg ?? null,
      weightMeasuredAt: latestWeight?.measuredAt ?? null,
      heightCm: latestHeight?.heightCm ?? null,
      bmi,
    },
  };
}

export type ClinicalSummary = NonNullable<Awaited<ReturnType<typeof getClinicalSummary>>>;

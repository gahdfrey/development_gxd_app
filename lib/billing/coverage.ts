import { db } from "@/lib/db";
import {
  patients,
  hmos,
  patientCoverages,
  eligibilityChecks,
  organisations,
  type PatientCoverage,
} from "@/lib/db/schema";
import { and, desc, eq, inArray, isNull, ne, sql } from "drizzle-orm";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Executor = typeof db | Tx;

export const COVERAGE_RELATIONSHIPS = ["principal", "spouse", "child", "other"] as const;
export const COVERAGE_STATUSES = ["active", "suspended", "ended"] as const;
export const ELIGIBILITY_CHANNELS = ["phone", "whatsapp", "email", "hmo_portal", "card", "other"] as const;
export const ELIGIBILITY_RESULTS = ["eligible", "not_eligible", "pending"] as const;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const optionalText = (v: unknown) => (typeof v === "string" && v.trim() !== "" ? v.trim() : null);

/** Today's date (YYYY-MM-DD) in Nigeria. */
export function todayInLagos(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Lagos" });
}

export type CoverageFields = Pick<
  PatientCoverage,
  | "hmoId"
  | "planName"
  | "membershipNumber"
  | "relationship"
  | "principalName"
  | "principalMembershipNumber"
  | "primaryProvider"
  | "validFrom"
  | "validTo"
  | "status"
  | "notes"
>;

/** Validates a coverage create/update payload (a PATCH is merged onto the
 * existing row by the caller before validating). */
export function validateCoverage(input: Record<string, unknown>): { error: string } | { value: CoverageFields } {
  const hmoId = Number(input.hmoId);
  if (!Number.isInteger(hmoId) || hmoId <= 0) return { error: "Select the HMO" };

  const membershipNumber = optionalText(input.membershipNumber);
  if (!membershipNumber) return { error: "Membership / policy number is required" };

  const relationship = (input.relationship ?? "principal") as (typeof COVERAGE_RELATIONSHIPS)[number];
  if (!COVERAGE_RELATIONSHIPS.includes(relationship)) return { error: "Invalid relationship to principal" };

  const status = (input.status ?? "active") as (typeof COVERAGE_STATUSES)[number];
  if (!COVERAGE_STATUSES.includes(status)) return { error: "Invalid coverage status" };

  const validFrom = optionalText(input.validFrom);
  const validTo = optionalText(input.validTo);
  if (validFrom && !DATE_RE.test(validFrom)) return { error: "Invalid valid-from date" };
  if (validTo && !DATE_RE.test(validTo)) return { error: "Invalid valid-to date" };
  if (validFrom && validTo && validTo < validFrom) return { error: "Valid-to date can't be before valid-from" };

  const principalName = optionalText(input.principalName);
  const principalMembershipNumber = optionalText(input.principalMembershipNumber);
  if (relationship !== "principal" && !principalName && !principalMembershipNumber) {
    return { error: "For a dependant, give the principal member's name or membership number" };
  }

  return {
    value: {
      hmoId,
      planName: optionalText(input.planName),
      membershipNumber,
      relationship,
      principalName: relationship === "principal" ? null : principalName,
      principalMembershipNumber: relationship === "principal" ? null : principalMembershipNumber,
      primaryProvider: optionalText(input.primaryProvider),
      validFrom,
      validTo,
      status,
      notes: optionalText(input.notes),
    },
  };
}

/** True if the HMO exists, isn't deleted, and belongs to this organisation. */
export async function hmoBelongsToOrg(executor: Executor, orgId: number, hmoId: number): Promise<boolean> {
  const [row] = await executor
    .select({ id: hmos.id })
    .from(hmos)
    .where(and(eq(hmos.id, hmoId), eq(hmos.organisationId, orgId), isNull(hmos.deletedAt)))
    .limit(1);
  return !!row;
}

/**
 * Keeps patients.insuranceType / hmoId / policyNumber in step with the
 * patient's active coverage, since many screens read the HMO through them.
 * With no active coverage the patient is shown as self-pay ("private") if
 * they were previously on an HMO; other insurance types are left alone.
 */
export async function syncPatientMirror(executor: Executor, patientId: number): Promise<void> {
  const [active] = await executor
    .select({ hmoId: patientCoverages.hmoId, membershipNumber: patientCoverages.membershipNumber })
    .from(patientCoverages)
    .where(and(
      eq(patientCoverages.patientId, patientId),
      eq(patientCoverages.status, "active"),
      isNull(patientCoverages.deletedAt),
    ))
    .orderBy(desc(patientCoverages.updatedAt))
    .limit(1);

  if (active) {
    await executor
      .update(patients)
      .set({ insuranceType: "hmo", hmoId: active.hmoId, policyNumber: active.membershipNumber, updatedAt: new Date() })
      .where(eq(patients.id, patientId));
    return;
  }

  const [patient] = await executor
    .select({ insuranceType: patients.insuranceType })
    .from(patients)
    .where(eq(patients.id, patientId))
    .limit(1);
  if (patient?.insuranceType === "hmo") {
    await executor
      .update(patients)
      .set({ insuranceType: "private", hmoId: null, policyNumber: null, updatedAt: new Date() })
      .where(eq(patients.id, patientId));
  }
}

/** A patient may only have one active coverage: making one active ends the rest. */
export async function endOtherActiveCoverages(executor: Executor, patientId: number, keepId: number | null) {
  const conditions = [
    eq(patientCoverages.patientId, patientId),
    eq(patientCoverages.status, "active"),
    isNull(patientCoverages.deletedAt),
  ];
  if (keepId != null) conditions.push(ne(patientCoverages.id, keepId));
  await executor
    .update(patientCoverages)
    // Keep a real expiry date if one was recorded; otherwise it ended today.
    .set({ status: "ended", validTo: sql`coalesce(${patientCoverages.validTo}, ${todayInLagos()})`, updatedAt: new Date() })
    .where(and(...conditions));
}

/**
 * Applies the insurance fields from the patient registration / edit form
 * (insuranceType + HMO + policy number) to the coverage records, so the
 * quick form and the full coverage panel never disagree:
 *  - HMO patient, same HMO as the active coverage → update its membership no.
 *  - HMO patient, different (or no) active coverage → end it, start a new one.
 *  - Not an HMO patient → end any active coverage.
 * Call inside the same transaction as the patient insert/update.
 */
export async function applyRegistrationInsurance(
  executor: Executor,
  input: { orgId: number; patientId: number; actorId: number | null; insuranceType: string; hmoId: number | null; policyNumber: string | null },
): Promise<void> {
  const [active] = await executor
    .select()
    .from(patientCoverages)
    .where(and(
      eq(patientCoverages.patientId, input.patientId),
      eq(patientCoverages.status, "active"),
      isNull(patientCoverages.deletedAt),
    ))
    .orderBy(desc(patientCoverages.updatedAt))
    .limit(1);

  if (input.insuranceType === "hmo" && input.hmoId != null) {
    if (active && active.hmoId === input.hmoId) {
      if ((active.membershipNumber ?? null) !== (input.policyNumber ?? null)) {
        await executor
          .update(patientCoverages)
          .set({ membershipNumber: input.policyNumber, updatedAt: new Date() })
          .where(eq(patientCoverages.id, active.id));
      }
    } else {
      await endOtherActiveCoverages(executor, input.patientId, null);
      await executor.insert(patientCoverages).values({
        organisationId: input.orgId,
        patientId: input.patientId,
        hmoId: input.hmoId,
        membershipNumber: input.policyNumber,
        validFrom: todayInLagos(),
        status: "active",
        createdBy: input.actorId,
      });
    }
  } else if (active) {
    await endOtherActiveCoverages(executor, input.patientId, null);
  }
  await syncPatientMirror(executor, input.patientId);
}

export interface ActiveCoverage {
  coverageId: number;
  patientId: number;
  hmoId: number;
  hmoName: string | null;
  membershipNumber: string | null;
  planName: string | null;
  lastEligibility: { checkedAt: Date; result: string } | null;
  /** True when there's no "eligible" check within the org's recheck window. */
  eligibilityStale: boolean;
}

/**
 * The coverage that applies to each patient on `onDate`: status "active",
 * not deleted, and within its validity window. Patients with none (or an
 * expired/suspended one) are absent from the map and bill as self-pay.
 */
export async function getActiveCoverages(
  executor: Executor,
  orgId: number,
  patientIds: number[],
  onDate: string = todayInLagos(),
): Promise<Map<number, ActiveCoverage>> {
  const result = new Map<number, ActiveCoverage>();
  if (patientIds.length === 0) return result;

  // One round trip: the coverages with their latest eligibility checks, and
  // the org's recheck window alongside.
  const latest = (col: "checked_at" | "result") =>
    sql`(SELECT ec.${sql.raw(col)} FROM ${eligibilityChecks} ec WHERE ec.coverage_id = ${patientCoverages.id} ORDER BY ec.checked_at DESC LIMIT 1)`;
  const [rows, [org]] = await Promise.all([
    executor
      .select({
        coverageId: patientCoverages.id,
        patientId: patientCoverages.patientId,
        hmoId: patientCoverages.hmoId,
        hmoName: hmos.name,
        membershipNumber: patientCoverages.membershipNumber,
        planName: patientCoverages.planName,
        validFrom: patientCoverages.validFrom,
        validTo: patientCoverages.validTo,
        lastCheckedAt: sql<string | null>`${latest("checked_at")}`,
        lastResult: sql<string | null>`${latest("result")}`,
        lastEligibleAt: sql<string | null>`(SELECT max(ec.checked_at) FROM ${eligibilityChecks} ec WHERE ec.coverage_id = ${patientCoverages.id} AND ec.result = 'eligible')`,
      })
      .from(patientCoverages)
      .innerJoin(hmos, and(eq(patientCoverages.hmoId, hmos.id), isNull(hmos.deletedAt)))
      .where(and(
        eq(patientCoverages.organisationId, orgId),
        inArray(patientCoverages.patientId, patientIds),
        eq(patientCoverages.status, "active"),
        isNull(patientCoverages.deletedAt),
      ))
      .orderBy(desc(patientCoverages.updatedAt)),
    executor
      .select({ days: organisations.eligibilityRecheckDays })
      .from(organisations)
      .where(eq(organisations.id, orgId))
      .limit(1),
  ]);

  const inWindow = rows.filter(
    (r) => (!r.validFrom || r.validFrom <= onDate) && (!r.validTo || r.validTo >= onDate),
  );
  if (inWindow.length === 0) return result;
  const recheckMs = (org?.days ?? 30) * 24 * 60 * 60 * 1000;
  const latestCheckMap = new Map<number, { checkedAt: Date; result: string }>();
  const latestEligible = new Map<number, Date>();
  for (const r of inWindow) {
    if (r.lastCheckedAt && r.lastResult) latestCheckMap.set(r.coverageId, { checkedAt: new Date(r.lastCheckedAt), result: r.lastResult });
    if (r.lastEligibleAt) latestEligible.set(r.coverageId, new Date(r.lastEligibleAt));
  }

  for (const r of inWindow) {
    if (result.has(r.patientId)) continue; // one active coverage per patient; newest wins if data is inconsistent
    const last = latestCheckMap.get(r.coverageId) ?? null;
    const eligibleAt = latestEligible.get(r.coverageId);
    result.set(r.patientId, {
      coverageId: r.coverageId,
      patientId: r.patientId,
      hmoId: r.hmoId,
      hmoName: r.hmoName,
      membershipNumber: r.membershipNumber,
      planName: r.planName,
      lastEligibility: last,
      eligibilityStale:
        last?.result === "not_eligible" || !eligibleAt || Date.now() - eligibleAt.getTime() > recheckMs,
    });
  }
  return result;
}

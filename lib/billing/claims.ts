import { db } from "@/lib/db";
import {
  hmoCharges,
  hmoAuthorizations,
  hmos,
  requests,
  prescriptions,
  visits,
  visitDiagnoses,
  eligibilityChecks,
  organisations,
  claimBatches,
} from "@/lib/db/schema";
import { and, eq, inArray, isNotNull, sql } from "drizzle-orm";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Executor = typeof db | Tx;

export type IssueSeverity = "error" | "warning";
export interface ClaimIssue {
  code:
    | "missing_auth_code"
    | "auth_expired"
    | "missing_membership"
    | "missing_diagnosis"
    | "late_submission"
    | "eligibility_unverified"
    | "duplicate_line";
  severity: IssueSeverity;
  message: string;
}

/** WAT calendar date (YYYY-MM-DD) of a timestamp. */
function lagosDate(d: Date): string {
  return d.toLocaleDateString("en-CA", { timeZone: "Africa/Lagos" });
}

/** Start/end instants of a WAT (UTC+1) calendar month "YYYY-MM". */
export function monthBounds(month: string): { start: Date; end: Date } {
  const [y, m] = month.split("-").map(Number);
  return { start: new Date(Date.UTC(y, m - 1, 1, -1)), end: new Date(Date.UTC(y, m, 1, -1)) };
}

/**
 * Pre-submission checks ("claim scrubber") for HMO charge lines — the
 * reasons Nigerian HMOs most often reject or query claims:
 *  errors (fix before submitting): service needs authorization but has no
 *    code; the authorization had expired by the service date; no membership
 *    number on the claim.
 *  warnings (submit, but expect queries): no coded diagnosis on the visit;
 *    past the HMO's submission window; eligibility not verified around the
 *    service date; duplicate-looking lines (same patient, service, day).
 */
export async function scrubCharges(
  executor: Executor,
  orgId: number,
  chargeIds: number[],
  asOf: Date = new Date(),
): Promise<Map<number, ClaimIssue[]>> {
  const result = new Map<number, ClaimIssue[]>();
  if (chargeIds.length === 0) return result;

  const charges = await executor
    .select({
      id: hmoCharges.id,
      patientId: hmoCharges.patientId,
      coverageId: hmoCharges.coverageId,
      itemType: hmoCharges.itemType,
      itemId: hmoCharges.itemId,
      description: hmoCharges.description,
      policyNumber: hmoCharges.policyNumber,
      requiresAuthorization: hmoCharges.requiresAuthorization,
      authorizationCode: hmoCharges.authorizationCode,
      authValidUntil: hmoAuthorizations.validUntil,
      serviceDate: hmoCharges.serviceDate,
      submissionDays: hmos.claimSubmissionDays,
    })
    .from(hmoCharges)
    .leftJoin(hmoAuthorizations, eq(hmoCharges.authorizationId, hmoAuthorizations.id))
    .leftJoin(hmos, eq(hmoCharges.hmoId, hmos.id))
    .where(and(eq(hmoCharges.organisationId, orgId), inArray(hmoCharges.id, chargeIds)));

  // Diagnosis: request/prescription → appointment → visit → visit_diagnoses.
  const reqIds = charges.filter((c) => c.itemType === "request").map((c) => c.itemId);
  const rxIds = charges.filter((c) => c.itemType === "prescription").map((c) => c.itemId);
  const [reqAppts, rxAppts] = await Promise.all([
    reqIds.length
      ? executor.select({ id: requests.id, appointmentId: requests.appointmentId }).from(requests).where(inArray(requests.id, reqIds))
      : Promise.resolve([]),
    rxIds.length
      ? executor.select({ id: prescriptions.id, appointmentId: prescriptions.appointmentId }).from(prescriptions).where(inArray(prescriptions.id, rxIds))
      : Promise.resolve([]),
  ]);
  const apptByItem = new Map<string, number | null>([
    ...reqAppts.map((r) => [`request:${r.id}`, r.appointmentId] as const),
    ...rxAppts.map((r) => [`prescription:${r.id}`, r.appointmentId] as const),
  ]);
  const apptIds = [...new Set([...apptByItem.values()].filter((v): v is number => v != null))];
  const diagnosedAppts = new Set<number>();
  if (apptIds.length > 0) {
    const rows = await executor
      .selectDistinct({ appointmentId: visits.appointmentId })
      .from(visitDiagnoses)
      .innerJoin(visits, eq(visitDiagnoses.visitId, visits.id))
      .where(and(inArray(visits.appointmentId, apptIds), isNotNull(visitDiagnoses.icdCode)));
    for (const r of rows) diagnosedAppts.add(r.appointmentId);
  }

  // Eligibility: an "eligible" check within the org's recheck window
  // before (or on) the service date.
  const [org] = await executor
    .select({ days: organisations.eligibilityRecheckDays })
    .from(organisations)
    .where(eq(organisations.id, orgId))
    .limit(1);
  const windowMs = (org?.days ?? 30) * 86_400_000;
  const coverageIds = [...new Set(charges.map((c) => c.coverageId).filter((v): v is number => v != null))];
  const checksByCoverage = new Map<number, Date[]>();
  if (coverageIds.length > 0) {
    const checks = await executor
      .select({ coverageId: eligibilityChecks.coverageId, checkedAt: eligibilityChecks.checkedAt })
      .from(eligibilityChecks)
      .where(and(inArray(eligibilityChecks.coverageId, coverageIds), eq(eligibilityChecks.result, "eligible")));
    for (const c of checks) {
      const list = checksByCoverage.get(c.coverageId) ?? [];
      list.push(c.checkedAt);
      checksByCoverage.set(c.coverageId, list);
    }
  }

  const dupKey = (c: (typeof charges)[number]) => `${c.patientId}|${c.description}|${lagosDate(c.serviceDate)}`;
  const dupCounts = new Map<string, number>();
  for (const c of charges) dupCounts.set(dupKey(c), (dupCounts.get(dupKey(c)) ?? 0) + 1);

  for (const c of charges) {
    const issues: ClaimIssue[] = [];
    const serviceDay = lagosDate(c.serviceDate);

    if (c.requiresAuthorization && !c.authorizationCode) {
      issues.push({ code: "missing_auth_code", severity: "error", message: "HMO requires an authorization code for this service" });
    }
    if (c.authorizationCode && c.authValidUntil && c.authValidUntil < serviceDay) {
      issues.push({ code: "auth_expired", severity: "error", message: `Authorization expired ${c.authValidUntil}, before the service date` });
    }
    if (!c.policyNumber) {
      issues.push({ code: "missing_membership", severity: "error", message: "No membership / policy number" });
    }
    const appt = apptByItem.get(`${c.itemType}:${c.itemId}`);
    if (appt == null || !diagnosedAppts.has(appt)) {
      issues.push({
        code: "missing_diagnosis",
        severity: "warning",
        message: appt == null ? "Not linked to a consultation — no diagnosis on the claim" : "No ICD-11 diagnosis recorded on the consultation",
      });
    }
    if (c.submissionDays != null) {
      const deadline = new Date(c.serviceDate.getTime() + c.submissionDays * 86_400_000);
      if (asOf > deadline) {
        issues.push({ code: "late_submission", severity: "warning", message: `Past the HMO's ${c.submissionDays}-day submission window` });
      }
    }
    const checks = c.coverageId != null ? checksByCoverage.get(c.coverageId) ?? [] : [];
    const verified = checks.some((d) => d <= new Date(c.serviceDate.getTime() + 86_400_000) && c.serviceDate.getTime() - d.getTime() <= windowMs);
    if (!verified) {
      issues.push({ code: "eligibility_unverified", severity: "warning", message: "Eligibility wasn't verified around the service date" });
    }
    if ((dupCounts.get(dupKey(c)) ?? 0) > 1) {
      issues.push({ code: "duplicate_line", severity: "warning", message: "Same service for the same patient on the same day appears more than once" });
    }
    result.set(c.id, issues);
  }
  return result;
}

/** Next batch number for an HMO and month, e.g. CLM-LWH-202610-02. */
export async function nextBatchReference(executor: Executor, orgId: number, hmoId: number, month: string): Promise<string> {
  const [hmo] = await executor.select({ code: hmos.code, name: hmos.name }).from(hmos).where(eq(hmos.id, hmoId)).limit(1);
  const tag = (hmo?.code || (hmo?.name ?? "HMO").replace(/[^A-Za-z]/g, "").slice(0, 3) || "HMO").toUpperCase();
  const prefix = `CLM-${tag}-${month.replace("-", "")}-`;
  const [{ count }] = await executor
    .select({ count: sql<number>`count(*)::int` })
    .from(claimBatches)
    .where(and(eq(claimBatches.organisationId, orgId), sql`${claimBatches.reference} LIKE ${prefix + "%"}`));
  return `${prefix}${String(count + 1).padStart(2, "0")}`;
}

/** Closes a submitted batch once every line has a final outcome (paid / rejected). */
export async function closeBatchIfSettled(executor: Executor, batchId: number): Promise<void> {
  const [{ open }] = await executor
    .select({ open: sql<number>`count(*)::int` })
    .from(hmoCharges)
    .where(and(eq(hmoCharges.claimBatchId, batchId), sql`${hmoCharges.status} NOT IN ('paid', 'rejected')`));
  await executor
    .update(claimBatches)
    .set({ status: open === 0 ? "closed" : "submitted", updatedAt: new Date() })
    .where(and(eq(claimBatches.id, batchId), sql`${claimBatches.status} <> 'draft'`));
}

/**
 * ICD-11 diagnoses recorded on the consultation behind each charge line
 * (request/prescription → appointment → visit → visit_diagnoses), formatted
 * "CODE Title; CODE Title" — printed on the claim.
 */
export async function getLineDiagnoses(
  executor: Executor,
  lines: { id: number; itemType: string; itemId: number }[],
): Promise<Map<number, string>> {
  const result = new Map<number, string>();
  const reqIds = lines.filter((l) => l.itemType === "request").map((l) => l.itemId);
  const rxIds = lines.filter((l) => l.itemType === "prescription").map((l) => l.itemId);
  const [reqAppts, rxAppts] = await Promise.all([
    reqIds.length
      ? executor.select({ id: requests.id, appointmentId: requests.appointmentId }).from(requests).where(inArray(requests.id, reqIds))
      : Promise.resolve([]),
    rxIds.length
      ? executor.select({ id: prescriptions.id, appointmentId: prescriptions.appointmentId }).from(prescriptions).where(inArray(prescriptions.id, rxIds))
      : Promise.resolve([]),
  ]);
  const apptByItem = new Map<string, number | null>([
    ...reqAppts.map((r) => [`request:${r.id}`, r.appointmentId] as const),
    ...rxAppts.map((r) => [`prescription:${r.id}`, r.appointmentId] as const),
  ]);
  const apptIds = [...new Set([...apptByItem.values()].filter((v): v is number => v != null))];
  if (apptIds.length === 0) return result;

  const rows = await executor
    .select({ appointmentId: visits.appointmentId, code: visitDiagnoses.icdCode, title: visitDiagnoses.icdTitle, type: visitDiagnoses.diagnosisType })
    .from(visitDiagnoses)
    .innerJoin(visits, eq(visitDiagnoses.visitId, visits.id))
    .where(and(inArray(visits.appointmentId, apptIds), isNotNull(visitDiagnoses.icdCode)));
  const byAppt = new Map<number, string[]>();
  for (const r of rows.sort((a, b) => (a.type === "primary" ? -1 : 0) - (b.type === "primary" ? -1 : 0))) {
    const list = byAppt.get(r.appointmentId) ?? [];
    list.push(`${r.code}${r.title ? ` ${r.title}` : ""}`);
    byAppt.set(r.appointmentId, list);
  }
  for (const l of lines) {
    const appt = apptByItem.get(`${l.itemType}:${l.itemId}`);
    const dx = appt != null ? byAppt.get(appt) : undefined;
    if (dx?.length) result.set(l.id, dx.join("; "));
  }
  return result;
}

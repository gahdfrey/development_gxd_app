import { db } from "@/lib/db";
import { requests, labTests, labTestParameters, labResultValues, patients, criticalAlerts, departments } from "@/lib/db/schema";
import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import { ageInYears, referenceRange } from "@/lib/lab/flags";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Executor = typeof db | Tx;

/** Minutes a critical alert can stay unacknowledged before it shows as overdue. */
export const CRITICAL_ESCALATION_MINUTES = 30;

/** The request (org-scoped) with its test, patient and requester. */
export async function loadRequestForResults(executor: Executor, orgId: number, requestId: number) {
  const [row] = await executor
    .select({
      id: requests.id,
      testId: requests.testId,
      testName: labTests.name,
      departmentName: departments.name,
      patientId: requests.patientId,
      patientFirstname: patients.firstname,
      patientLastname: patients.lastname,
      patientGender: patients.gender,
      patientDob: patients.dob,
      requestedBy: requests.requestedBy,
      paymentStatus: requests.paymentStatus,
      status: requests.status,
    })
    .from(requests)
    .leftJoin(labTests, eq(requests.testId, labTests.id))
    .leftJoin(patients, eq(requests.patientId, patients.id))
    .leftJoin(departments, eq(requests.departmentId, departments.id))
    .where(and(eq(requests.id, requestId), eq(requests.organisationId, orgId)))
    .limit(1);
  return row ?? null;
}

/** The test's active result fields, each with the reference range that
 * applies to this patient. */
export async function parametersForPatient(
  executor: Executor,
  testId: number,
  patient: { gender: string | null; dob: string | null },
) {
  const params = await executor
    .select()
    .from(labTestParameters)
    .where(and(eq(labTestParameters.testId, testId), isNull(labTestParameters.deletedAt)))
    .orderBy(asc(labTestParameters.sortOrder), asc(labTestParameters.id));
  const ageYears = ageInYears(patient.dob);
  return params.map((p) => ({ ...p, range: referenceRange(p, { gender: patient.gender, ageYears }) }));
}

/** Structured values for a set of requests, keyed by request id (for history views). */
export async function getValuesForRequests(executor: Executor, orgId: number, requestIds: number[]) {
  const map = new Map<number, (typeof labResultValues.$inferSelect & { critical: { acknowledgedAt: Date | null } | null })[]>();
  if (requestIds.length === 0) return map;
  const rows = await executor
    .select({ value: labResultValues, sortOrder: labTestParameters.sortOrder, alertAck: criticalAlerts.acknowledgedAt, alertId: criticalAlerts.id })
    .from(labResultValues)
    .leftJoin(labTestParameters, eq(labResultValues.parameterId, labTestParameters.id))
    .leftJoin(criticalAlerts, eq(criticalAlerts.resultValueId, labResultValues.id))
    .where(and(eq(labResultValues.organisationId, orgId), inArray(labResultValues.requestId, requestIds)))
    .orderBy(asc(labTestParameters.sortOrder), asc(labResultValues.id));
  for (const r of rows) {
    const list = map.get(r.value.requestId) ?? [];
    list.push({ ...r.value, critical: r.alertId != null ? { acknowledgedAt: r.alertAck } : null });
    map.set(r.value.requestId, list);
  }
  return map;
}

/** Display string for a value, e.g. "2.4 mmol/L". */
export function displayValue(v: { valueNumeric: number | null; valueText: string | null; unit: string | null }) {
  const base = v.valueNumeric != null ? String(v.valueNumeric) : v.valueText ?? "";
  return v.unit && v.valueNumeric != null ? `${base} ${v.unit}` : base;
}

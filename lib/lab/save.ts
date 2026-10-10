import { db } from "@/lib/db";
import { labResultValues, criticalAlerts, requests } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { flagValue, isCritical } from "@/lib/lab/flags";
import { displayValue, parametersForPatient, type loadRequestForResults } from "@/lib/lab/results";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type LoadedRequest = NonNullable<Awaited<ReturnType<typeof loadRequestForResults>>>;

export interface ResultInput {
  parameterId: number;
  value: unknown;
  comment?: unknown;
}

/**
 * Validates, flags and saves structured results for one request inside a
 * transaction, and keeps critical alerts in step:
 *  - a new critical value raises an alert to the ordering clinician;
 *  - correcting it to a different critical value re-opens the alert;
 *  - correcting it out of the critical range closes the open alert.
 * Blank inputs are skipped. Marks the request completed.
 */
export async function saveResultValues(
  tx: Tx,
  { orgId, userId, req, input }: { orgId: number; userId: number; req: LoadedRequest; input: ResultInput[] },
): Promise<{ error: string } | { saved: (typeof labResultValues.$inferSelect)[]; newCriticals: (typeof labResultValues.$inferSelect)[] }> {
  const parameters = await parametersForPatient(tx, req.testId, { gender: req.patientGender, dob: req.patientDob });
  const paramById = new Map(parameters.map((p) => [p.id, p]));

  const rows: (typeof labResultValues.$inferInsert)[] = [];
  for (const v of input) {
    const p = paramById.get(Number(v.parameterId));
    if (!p) return { error: "Unknown result field" };
    const raw = typeof v.value === "string" ? v.value.trim() : v.value == null ? "" : String(v.value);
    if (raw === "") continue;
    let valueNumeric: number | null = null;
    let valueText: string | null = null;
    if (p.valueType === "numeric") {
      valueNumeric = Number(raw.replace(/,/g, ""));
      if (!Number.isFinite(valueNumeric)) return { error: `“${p.name}” must be a number` };
      if (p.decimals != null) valueNumeric = Math.round(valueNumeric * 10 ** p.decimals) / 10 ** p.decimals;
    } else if (p.valueType === "choice") {
      if (!(p.choices ?? []).includes(raw)) return { error: `“${p.name}”: choose one of the listed options` };
      valueText = raw;
    } else {
      valueText = raw.slice(0, 2000);
    }
    rows.push({
      organisationId: orgId,
      requestId: req.id,
      parameterId: p.id,
      name: p.name,
      valueNumeric,
      valueText,
      unit: p.unit,
      refLow: p.range.low,
      refHigh: p.range.high,
      flag: flagValue(p, p.range, { numeric: valueNumeric, text: valueText }),
      comment: typeof v.comment === "string" && v.comment.trim() ? v.comment.trim() : null,
      enteredBy: userId,
    });
  }
  if (rows.length === 0) return { error: "Enter at least one result" };

  const now = new Date();
  const before = await tx.select().from(labResultValues).where(eq(labResultValues.requestId, req.id));
  const beforeByParam = new Map(before.map((b) => [b.parameterId, b]));
  const saved: (typeof labResultValues.$inferSelect)[] = [];
  const newCriticals: (typeof labResultValues.$inferSelect)[] = [];

  for (const r of rows) {
    const prev = beforeByParam.get(r.parameterId);
    const changed = !prev || prev.valueNumeric !== r.valueNumeric || prev.valueText !== r.valueText || prev.comment !== r.comment;
    if (prev && !changed) {
      saved.push(prev);
      continue;
    }
    const [row] = prev
      ? await tx
          .update(labResultValues)
          .set({ ...r, amendedAt: now, enteredAt: prev.enteredAt })
          .where(eq(labResultValues.id, prev.id))
          .returning()
      : await tx.insert(labResultValues).values(r).returning();
    saved.push(row);

    const [alert] = await tx.select().from(criticalAlerts).where(eq(criticalAlerts.resultValueId, row.id)).limit(1);
    if (isCritical(row.flag)) {
      const value = displayValue(row);
      if (!alert) {
        await tx.insert(criticalAlerts).values({
          organisationId: orgId,
          patientId: req.patientId,
          requestId: req.id,
          resultValueId: row.id,
          parameterName: row.name,
          value,
          flag: row.flag,
          notifyUserId: req.requestedBy,
          raisedBy: userId,
        });
        newCriticals.push(row);
      } else if (alert.value !== value) {
        await tx
          .update(criticalAlerts)
          .set({ value, flag: row.flag, raisedAt: now, raisedBy: userId, acknowledgedAt: null, acknowledgedBy: null, actionNote: null, escalatedAt: null, escalationNote: null })
          .where(eq(criticalAlerts.id, alert.id));
        newCriticals.push(row);
      }
    } else if (alert && !alert.acknowledgedAt) {
      await tx
        .update(criticalAlerts)
        .set({ acknowledgedAt: now, acknowledgedBy: userId, actionNote: `Result corrected to ${displayValue(row)} — no longer critical` })
        .where(eq(criticalAlerts.id, alert.id));
    }
  }

  if (req.status !== "completed") {
    await tx.update(requests).set({ status: "completed", updatedAt: now }).where(eq(requests.id, req.id));
  }
  return { saved, newCriticals };
}

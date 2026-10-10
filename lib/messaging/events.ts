import { db } from "@/lib/db";
import { criticalAlerts, requests, labTests } from "@/lib/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { sendToPatient } from "@/lib/messaging/send";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Executor = typeof db | Tx;

/** "Your result is ready" SMS, once per request; held back while a critical
 * value on the request awaits the doctor's acknowledgement. */
export async function notifyResultsReady(orgId: number, patientId: number, requestId: number, testName: string | null, executor: Executor = db) {
  const [open] = await executor
    .select({ id: criticalAlerts.id })
    .from(criticalAlerts)
    .where(and(eq(criticalAlerts.requestId, requestId), isNull(criticalAlerts.acknowledgedAt)))
    .limit(1);
  if (open) return;
  let name = testName;
  if (!name) {
    const [r] = await executor.select({ name: labTests.name }).from(requests).leftJoin(labTests, eq(requests.testId, labTests.id)).where(eq(requests.id, requestId)).limit(1);
    name = r?.name ?? null;
  }
  await sendToPatient({
    orgId,
    patientId,
    kind: "results_ready",
    vars: { test: name ?? "test" },
    dedupeKey: `request:${requestId}:results_ready`,
    relatedType: "request",
    relatedId: requestId,
  }, executor);
}

/** Payment receipt SMS for a successful patient payment (once per payment). */
export async function notifyPaymentReceipt(orgId: number, patientId: number, paymentId: number, amount: number) {
  if (amount <= 0) return;
  await sendToPatient({
    orgId,
    patientId,
    kind: "payment_receipt",
    vars: { amount: amount.toLocaleString("en-NG") },
    dedupeKey: `payment:${paymentId}:payment_receipt`,
    relatedType: "payment",
    relatedId: paymentId,
  });
}

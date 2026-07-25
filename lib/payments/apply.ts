import { db } from "@/lib/db";
import { payments, paymentItems, requests, prescriptions } from "@/lib/db/schema";
import { eq, inArray } from "drizzle-orm";
import { getPaymentGateway } from "./index";
import { logAudit } from "@/lib/audit";

export type ApplyPaymentResult =
  | { outcome: "applied" }
  | { outcome: "already-applied" }
  | { outcome: "not-found" }
  | { outcome: "verification-failed" }
  | { outcome: "amount-mismatch" };

/**
 * The single place that turns "the gateway confirmed this payment
 * succeeded" into "the covered requests/prescriptions are now paid". Called
 * from both the webhook (authoritative) and the verify-on-return endpoint
 * (fast UI feedback) so the apply logic — and its idempotency guard — only
 * lives in one place.
 */
export async function applyPaymentByReference(reference: string): Promise<ApplyPaymentResult> {
  const [payment] = await db
    .select()
    .from(payments)
    .where(eq(payments.gatewayReference, reference))
    .limit(1);

  if (!payment) return { outcome: "not-found" };
  if (payment.status !== "pending") return { outcome: "already-applied" };

  const gateway = getPaymentGateway();
  const result = await gateway.verify(reference);

  if (!result.success) {
    await db
      .update(payments)
      .set({ status: "failed", updatedAt: new Date() })
      .where(eq(payments.id, payment.id));
    return { outcome: "verification-failed" };
  }

  // payments.amount is stored in whole Naira (matching the existing
  // labTests.price/products.price convention), but gateways report kobo.
  // The mock gateway never charges a real amount, so there's nothing to
  // reconcile against — every other provider must match what we expected.
  if (gateway.provider !== "mock" && result.amountKobo !== payment.amount * 100) {
    return { outcome: "amount-mismatch" };
  }

  const items = await db
    .select()
    .from(paymentItems)
    .where(eq(paymentItems.paymentId, payment.id));

  const applied = await db.transaction(async (tx) => {
    // Re-check inside the transaction in case the webhook and the
    // verify-on-return call raced each other to this point.
    const [current] = await tx
      .select({ status: payments.status })
      .from(payments)
      .where(eq(payments.id, payment.id))
      .limit(1);
    if (!current || current.status !== "pending") return false;

    await tx
      .update(payments)
      .set({ status: "success", updatedAt: new Date() })
      .where(eq(payments.id, payment.id));

    const requestIds = items.filter((i) => i.itemType === "request").map((i) => i.itemId);
    const prescriptionIds = items.filter((i) => i.itemType === "prescription").map((i) => i.itemId);

    if (requestIds.length > 0) {
      await tx
        .update(requests)
        .set({ paymentStatus: "paid", updatedAt: new Date() })
        .where(inArray(requests.id, requestIds));
    }
    if (prescriptionIds.length > 0) {
      await tx
        .update(prescriptions)
        .set({ paymentStatus: "paid", updatedAt: new Date() })
        .where(inArray(prescriptions.id, prescriptionIds));
    }

    return true;
  });

  if (!applied) return { outcome: "already-applied" };

  for (const item of items) {
    void logAudit({
      organisationId: payment.organisationId,
      action: "update",
      entityType: item.itemType,
      entityId: item.itemId,
      details: { paymentStatus: "paid", method: "online", paymentId: payment.id },
    });
  }

  return { outcome: "applied" };
}

import { db } from "@/lib/db";
import { payments, paymentItems, requests, prescriptions, type Payment } from "@/lib/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { getPaymentGateway } from "./index";
import { logAudit } from "@/lib/audit";
import { getWalletByPatientId, creditWallet } from "@/lib/wallet";

export type ApplyPaymentResult =
  | { outcome: "applied" }
  | { outcome: "already-applied" }
  | { outcome: "not-found" }
  | { outcome: "verification-failed" }
  | { outcome: "amount-mismatch" };

/**
 * Settles a payment row that has just been confirmed "success" — either by
 * marking its covered requests/prescriptions as paid (purpose "bill"), or by
 * crediting the patient's wallet (purpose "wallet_topup"). Shared by the
 * gateway path (applyPaymentByReference) and the bank-transfer confirmation
 * path (applyBankTransferPayment) so both settle the same way once a payment
 * is confirmed received, regardless of how it got there.
 *
 * The pending -> success transition is done as a single UPDATE conditioned
 * on the current status (not a separate SELECT-then-UPDATE) so two
 * concurrent settlement attempts for the *same* payment row — e.g. the
 * webhook and the verify-on-return endpoint racing each other, or a
 * finance officer double-clicking "Confirm Receipt" — can't both pass the
 * pending check and both apply the side effect (crediting the wallet
 * twice, in the wallet_topup case). A plain SELECT followed by an
 * unconditional UPDATE would only be safe by luck of timing, not by
 * construction — Postgres only guarantees atomicity of the check-and-set
 * when both happen in the same statement.
 */
async function settlePayment(payment: Payment): Promise<ApplyPaymentResult> {
  if (payment.purpose === "wallet_topup") {
    const wallet = await getWalletByPatientId(payment.patientId);
    if (!wallet) return { outcome: "not-found" };

    const applied = await db.transaction(async (tx) => {
      const updated = await tx
        .update(payments)
        .set({ status: "success", updatedAt: new Date() })
        .where(and(eq(payments.id, payment.id), eq(payments.status, "pending")))
        .returning({ id: payments.id });
      if (updated.length === 0) return false;

      await creditWallet(tx, {
        walletId: wallet.id,
        patientId: payment.patientId,
        organisationId: payment.organisationId,
        amount: payment.amount,
        source: "topup",
        referenceType: "payment",
        referenceId: payment.id,
        description: `Wallet top-up via ${payment.method}`,
      });

      return true;
    });

    if (!applied) return { outcome: "already-applied" };

    void logAudit({
      organisationId: payment.organisationId,
      action: "update",
      entityType: "wallet",
      entityId: payment.patientId,
      details: { source: "topup", amount: payment.amount, paymentId: payment.id },
    });

    return { outcome: "applied" };
  }

  // purpose "bill": mark the covered requests/prescriptions as paid.
  const items = await db.select().from(paymentItems).where(eq(paymentItems.paymentId, payment.id));

  const applied = await db.transaction(async (tx) => {
    const updated = await tx
      .update(payments)
      .set({ status: "success", updatedAt: new Date() })
      .where(and(eq(payments.id, payment.id), eq(payments.status, "pending")))
      .returning({ id: payments.id });
    if (updated.length === 0) return false;

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
      details: { paymentStatus: "paid", method: payment.method, paymentId: payment.id },
    });
  }

  return { outcome: "applied" };
}

/**
 * The single place that turns "the gateway confirmed this payment
 * succeeded" into the payment being settled. Called from both the webhook
 * (authoritative) and the verify-on-return endpoint (fast UI feedback) so
 * the apply logic — and its idempotency guard — only lives in one place.
 * Works for both bill payments and wallet top-ups (see settlePayment).
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

  return settlePayment(payment);
}

/**
 * Finance-officer confirmation that a bank_transfer payment was actually
 * received (there's no gateway to verify against — a human is the
 * verification). Settles the same way a gateway-confirmed payment would.
 */
export async function applyBankTransferPayment(
  paymentId: number,
  confirmedByUserId: number,
): Promise<ApplyPaymentResult> {
  const [payment] = await db.select().from(payments).where(eq(payments.id, paymentId)).limit(1);

  if (!payment || payment.method !== "bank_transfer") return { outcome: "not-found" };
  if (payment.status !== "pending") return { outcome: "already-applied" };

  await db
    .update(payments)
    .set({ confirmedBy: confirmedByUserId, updatedAt: new Date() })
    .where(eq(payments.id, payment.id));

  return settlePayment(payment);
}

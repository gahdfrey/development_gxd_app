import { db } from "@/lib/db";
import {
  patientSubscriptions,
  billingPlans,
  billingPlanItems,
  subscriptionCharges,
  payments,
  type PatientSubscription,
} from "@/lib/db/schema";
import { eq, and, lte } from "drizzle-orm";
import { debitWallet, getWalletByPatientId, InsufficientBalanceError } from "@/lib/wallet";
import { logAudit } from "@/lib/audit";

export function nextChargeDateFrom(from: Date, interval: string): Date {
  const next = new Date(from);
  if (interval === "weekly") next.setDate(next.getDate() + 7);
  else if (interval === "yearly") next.setFullYear(next.getFullYear() + 1);
  else next.setMonth(next.getMonth() + 1); // "monthly" default
  return next;
}

export type PlanCoverageItem = { itemType: "lab_test" | "product"; itemId: number; planId: number; planName: string };

/**
 * The catalog services (lab tests / products) a patient's currently active
 * subscriptions entitle them to for free, keyed by "itemType:itemId". A
 * subscription only grants coverage while "active" — "past_due", "paused",
 * and "cancelled" subscriptions grant nothing, so falling behind on payment
 * (or pausing) suspends the benefit immediately.
 */
export async function getPatientPlanCoverage(patientId: number): Promise<Map<string, PlanCoverageItem>> {
  const rows = await db
    .select({
      itemType: billingPlanItems.itemType,
      itemId: billingPlanItems.itemId,
      planId: billingPlans.id,
      planName: billingPlans.name,
    })
    .from(patientSubscriptions)
    .innerJoin(billingPlans, eq(patientSubscriptions.billingPlanId, billingPlans.id))
    .innerJoin(billingPlanItems, eq(billingPlanItems.billingPlanId, billingPlans.id))
    .where(and(eq(patientSubscriptions.patientId, patientId), eq(patientSubscriptions.status, "active")));

  const coverage = new Map<string, PlanCoverageItem>();
  for (const row of rows) {
    coverage.set(`${row.itemType}:${row.itemId}`, row as PlanCoverageItem);
  }
  return coverage;
}

export type ChargeSubscriptionResult =
  | { outcome: "success" }
  | { outcome: "insufficient-balance" }
  | { outcome: "plan-inactive" }
  | { outcome: "already-claimed" };

/**
 * Charges one subscription for its current cycle: debits the wallet,
 * records a payments row (so it shows up in Finance like any other
 * successful payment) and a subscriptionCharges row (billing history), and
 * advances nextChargeDate regardless of outcome — a subscription is never
 * charged twice for the same cycle. On insufficient balance, marks the
 * subscription "past_due" instead of "active".
 *
 * The very first thing this does is atomically "claim" the cycle: an UPDATE
 * conditioned on the subscription still being "active" with the exact
 * nextChargeDate we read, advancing it in the same statement. If two calls
 * for the same subscription ever overlap — e.g. the daily cron firing twice,
 * a retry racing the original run, or a manual `npm run cron:subscriptions`
 * overlapping the scheduled one — only one can win that compare-and-swap;
 * the other sees 0 rows affected and bails out via "already-claimed" before
 * touching the wallet at all. Without this, both could pass a plain
 * "is this due?" check and each independently debit the wallet for the same
 * cycle (the same class of race fixed in lib/payments/apply.ts).
 *
 * TODO: once this reliably auto-deducts, add an email notification here for
 * both successful charges and past_due failures (flagged by the user to
 * revisit after the core feature ships).
 */
export async function chargeSubscription(
  subscription: PatientSubscription,
): Promise<ChargeSubscriptionResult> {
  const [plan] = await db.select().from(billingPlans).where(eq(billingPlans.id, subscription.billingPlanId)).limit(1);

  const claimCondition = and(
    eq(patientSubscriptions.id, subscription.id),
    eq(patientSubscriptions.status, "active"),
    eq(patientSubscriptions.nextChargeDate, subscription.nextChargeDate),
  );

  if (!plan || !plan.isActive) {
    const claimed = await db
      .update(patientSubscriptions)
      .set({ status: "paused", updatedAt: new Date() })
      .where(claimCondition)
      .returning({ id: patientSubscriptions.id });
    if (claimed.length === 0) return { outcome: "already-claimed" };
    return { outcome: "plan-inactive" };
  }

  const nextChargeDate = nextChargeDateFrom(subscription.nextChargeDate, plan.billingInterval);

  // Claim this cycle before doing anything else that moves money. Status
  // stays "active" here even on the eventual failure path below — those
  // paths own the claim exclusively at that point and flip it themselves.
  const claimed = await db
    .update(patientSubscriptions)
    .set({ nextChargeDate, updatedAt: new Date() })
    .where(claimCondition)
    .returning({ id: patientSubscriptions.id });
  if (claimed.length === 0) return { outcome: "already-claimed" };

  const wallet = await getWalletByPatientId(subscription.patientId);

  if (!wallet) {
    await db
      .update(patientSubscriptions)
      .set({ status: "past_due", updatedAt: new Date() })
      .where(eq(patientSubscriptions.id, subscription.id));
    await db.insert(subscriptionCharges).values({
      organisationId: subscription.organisationId,
      patientSubscriptionId: subscription.id,
      patientId: subscription.patientId,
      amount: plan.amount,
      status: "failed",
      failureReason: "No wallet found",
    });
    return { outcome: "insufficient-balance" };
  }

  try {
    const { paymentId } = await db.transaction(async (tx) => {
      const { transaction: walletTxn } = await debitWallet(tx, {
        walletId: wallet.id,
        patientId: subscription.patientId,
        organisationId: subscription.organisationId,
        amount: plan.amount,
        source: "subscription_charge",
        referenceType: "subscription_charge",
        description: `Subscription charge: ${plan.name}`,
      });

      const [payment] = await tx
        .insert(payments)
        .values({
          organisationId: subscription.organisationId,
          patientId: subscription.patientId,
          amount: plan.amount,
          status: "success",
          method: "wallet",
          purpose: "subscription_charge",
          gatewayReference: `cv_sub_${subscription.id}_${Date.now()}`,
        })
        .returning();

      const [charge] = await tx
        .insert(subscriptionCharges)
        .values({
          organisationId: subscription.organisationId,
          patientSubscriptionId: subscription.id,
          patientId: subscription.patientId,
          amount: plan.amount,
          status: "success",
          walletTransactionId: walletTxn.id,
        })
        .returning();

      // nextChargeDate was already advanced by the claim above; this only
      // needs to flip status back to "active" (covers the case where the
      // subscription was "past_due" and this cycle's charge succeeded).
      await tx
        .update(patientSubscriptions)
        .set({ status: "active", lastChargedAt: new Date(), updatedAt: new Date() })
        .where(eq(patientSubscriptions.id, subscription.id));

      return { paymentId: payment.id, chargeId: charge.id };
    });

    void logAudit({
      organisationId: subscription.organisationId,
      action: "create",
      entityType: "subscription_charge",
      entityId: subscription.id,
      details: { planName: plan.name, amount: plan.amount, paymentId },
    });

    return { outcome: "success" };
  } catch (err) {
    if (err instanceof InsufficientBalanceError) {
      // nextChargeDate was already advanced by the claim above.
      await db
        .update(patientSubscriptions)
        .set({ status: "past_due", updatedAt: new Date() })
        .where(eq(patientSubscriptions.id, subscription.id));
      await db.insert(subscriptionCharges).values({
        organisationId: subscription.organisationId,
        patientSubscriptionId: subscription.id,
        patientId: subscription.patientId,
        amount: plan.amount,
        status: "failed",
        failureReason: "Insufficient wallet balance",
      });
      return { outcome: "insufficient-balance" };
    }
    throw err;
  }
}

/** Finds every active subscription due for a charge and processes it. Meant to run once daily (see /api/cron/subscriptions/process). */
export async function processDueSubscriptions() {
  const due = await db
    .select()
    .from(patientSubscriptions)
    .where(and(eq(patientSubscriptions.status, "active"), lte(patientSubscriptions.nextChargeDate, new Date())));

  const results: { subscriptionId: number; outcome: ChargeSubscriptionResult["outcome"] }[] = [];
  for (const subscription of due) {
    const result = await chargeSubscription(subscription);
    results.push({ subscriptionId: subscription.id, outcome: result.outcome });
  }
  return results;
}

import { db } from "@/lib/db";
import { paymentItems, payments } from "@/lib/db/schema";
import { and, eq, gt, inArray, or } from "drizzle-orm";

interface Item {
  itemType: "request" | "prescription";
  itemId: number;
}

// A pending payment older than this is treated as abandoned (e.g. the
// patient started a card checkout and never completed it) rather than a
// live in-flight attempt, so it doesn't permanently block the item from
// ever being paid another way. Successful payments always block regardless
// of age.
const PENDING_CONFLICT_WINDOW_MS = 30 * 60 * 1000;

/**
 * Finds items that already have another payment attempt in flight — pending
 * (awaiting gateway confirmation or a bank-transfer confirmation, started
 * recently) or already succeeded. Checking only requests/prescriptions.
 * paymentStatus at initiation time isn't enough: two different payment
 * methods (e.g. a bank transfer and a wallet payment) can both be started
 * for the same item before either settles, and both can go on to succeed
 * independently — double-charging the patient. Every bill-payment
 * initiation route (initialize, bank-transfer, pay-with-wallet,
 * pay-with-plan) must call this and refuse to start if it returns any
 * conflicts.
 */
export async function findInFlightPaymentConflicts(items: Item[]): Promise<Item[]> {
  if (items.length === 0) return [];

  const requestIds = items.filter((i) => i.itemType === "request").map((i) => i.itemId);
  const prescriptionIds = items.filter((i) => i.itemType === "prescription").map((i) => i.itemId);
  const recentCutoff = new Date(Date.now() - PENDING_CONFLICT_WINDOW_MS);

  const rows = await db
    .select({ itemType: paymentItems.itemType, itemId: paymentItems.itemId })
    .from(paymentItems)
    .innerJoin(payments, eq(paymentItems.paymentId, payments.id))
    .where(and(
      or(
        eq(payments.status, "success"),
        and(eq(payments.status, "pending"), gt(payments.createdAt, recentCutoff)),
      ),
      or(
        requestIds.length > 0 ? and(eq(paymentItems.itemType, "request"), inArray(paymentItems.itemId, requestIds)) : undefined,
        prescriptionIds.length > 0 ? and(eq(paymentItems.itemType, "prescription"), inArray(paymentItems.itemId, prescriptionIds)) : undefined,
      ),
    ));

  const conflictKeys = new Set(rows.map((r) => `${r.itemType}:${r.itemId}`));
  return items.filter((i) => conflictKeys.has(`${i.itemType}:${i.itemId}`));
}

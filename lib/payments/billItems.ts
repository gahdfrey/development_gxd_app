import { db } from "@/lib/db";
import { requests, prescriptions, patientCharges } from "@/lib/db/schema";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { findInFlightPaymentConflicts } from "@/lib/payments/guard";
import { priceBillItems, itemKey, type PricedItem } from "@/lib/billing/pricing";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** What a patient can pay for from their portal. "charge" covers vaccination
 * doses only — bed days and services are settled with the finance desk. */
export type PortalItemType = "request" | "prescription" | "charge";
export interface PortalItem {
  itemType: PortalItemType;
  itemId: number;
}

const PORTAL_CHARGE_SOURCES = ["vaccine"];

/** Parses `body.items`, or returns null when it's empty or malformed. */
export function parsePortalItems(body: { items?: unknown }): PortalItem[] | null {
  const items = Array.isArray(body.items) ? (body.items as PortalItem[]) : [];
  if (items.length === 0) return null;
  const ok = items.every((i) => i && ["request", "prescription", "charge"].includes(i.itemType) && Number.isInteger(i.itemId));
  return ok ? items.map((i) => ({ itemType: i.itemType, itemId: i.itemId })) : null;
}

type Resolved =
  | { error: string; status: number }
  | { priced: Map<string, PricedItem>; itemsForPayment: (PortalItem & { amount: number })[]; totalAmount: number };

/**
 * Re-checks a portal checkout against the database — never trusting a
 * client-sent amount: every item belongs to this patient, is unpaid, has no
 * other payment in flight, and is priced for whoever pays (the patient only
 * pays their own share; for HMO-covered items that's the co-pay and the
 * HMO's share becomes a receivable when the payment settles). Shared by the
 * card, bank-transfer and wallet checkout routes.
 */
export async function resolvePortalBill(orgId: number, patientId: number, items: PortalItem[]): Promise<Resolved> {
  const ids = (t: PortalItemType) => items.filter((i) => i.itemType === t).map((i) => i.itemId);
  const requestIds = ids("request");
  const prescriptionIds = ids("prescription");
  const chargeIds = ids("charge");

  const [requestRows, prescriptionRows, chargeRows] = await Promise.all([
    requestIds.length > 0
      ? db.select({ id: requests.id, paymentStatus: requests.paymentStatus }).from(requests)
          .where(and(inArray(requests.id, requestIds), eq(requests.patientId, patientId)))
      : Promise.resolve([]),
    prescriptionIds.length > 0
      ? db.select({ id: prescriptions.id, paymentStatus: prescriptions.paymentStatus }).from(prescriptions)
          .where(and(inArray(prescriptions.id, prescriptionIds), eq(prescriptions.patientId, patientId)))
      : Promise.resolve([]),
    chargeIds.length > 0
      ? db.select({ id: patientCharges.id, paymentStatus: patientCharges.paymentStatus }).from(patientCharges)
          .where(and(
            inArray(patientCharges.id, chargeIds),
            eq(patientCharges.patientId, patientId),
            inArray(patientCharges.sourceType, PORTAL_CHARGE_SOURCES),
            isNull(patientCharges.deletedAt),
          ))
      : Promise.resolve([]),
  ]);

  if (requestRows.length !== requestIds.length || prescriptionRows.length !== prescriptionIds.length || chargeRows.length !== chargeIds.length) {
    return { error: "One or more items were not found on your account", status: 404 };
  }
  if ([...requestRows, ...prescriptionRows].some((r) => r.paymentStatus === "paid") || chargeRows.some((c) => c.paymentStatus !== "not_paid")) {
    return { error: "One or more selected items have already been paid for", status: 409 };
  }

  const conflicts = await findInFlightPaymentConflicts(items);
  if (conflicts.length > 0) {
    return {
      error: "One or more selected items already have a payment in progress — try again shortly, or check Pending Payment for its status",
      status: 409,
    };
  }

  const refs: PortalItem[] = [
    ...requestRows.map((r) => ({ itemType: "request" as const, itemId: r.id })),
    ...prescriptionRows.map((r) => ({ itemType: "prescription" as const, itemId: r.id })),
    ...chargeRows.map((r) => ({ itemType: "charge" as const, itemId: r.id })),
  ];
  const priced = await priceBillItems(orgId, refs);
  const itemsForPayment = refs.map((r) => ({ ...r, amount: priced.get(itemKey(r.itemType, r.itemId))?.patientAmount ?? 0 }));
  const totalAmount = itemsForPayment.reduce((sum, i) => sum + i.amount, 0);

  if (totalAmount <= 0) {
    const hmoCovered = [...priced.values()].some((p) => p.basis === "covered");
    return {
      error: hmoCovered
        ? "The selected items are fully covered by your HMO — there's nothing for you to pay. The hospital's finance desk will clear them."
        : "Nothing payable was found for the selected items",
      status: 400,
    };
  }
  return { priced, itemsForPayment, totalAmount };
}

/** Flips the bill lines a settled payment covered to paid. */
export async function markBillItemsPaid(tx: Tx, items: { itemType: string; itemId: number }[]) {
  const ids = (t: string) => items.filter((i) => i.itemType === t).map((i) => i.itemId);
  const requestIds = ids("request");
  const prescriptionIds = ids("prescription");
  const chargeIds = ids("charge");
  const now = new Date();
  if (requestIds.length > 0) {
    await tx.update(requests).set({ paymentStatus: "paid", updatedAt: now }).where(inArray(requests.id, requestIds));
  }
  if (prescriptionIds.length > 0) {
    await tx.update(prescriptions).set({ paymentStatus: "paid", updatedAt: now }).where(inArray(prescriptions.id, prescriptionIds));
  }
  if (chargeIds.length > 0) {
    await tx.update(patientCharges).set({ paymentStatus: "paid", updatedAt: now }).where(inArray(patientCharges.id, chargeIds));
  }
}

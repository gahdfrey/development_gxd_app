import { db } from "@/lib/db";
import { cashierShifts, payments, paymentItems } from "@/lib/db/schema";
import { and, eq, sql } from "drizzle-orm";
import type { PricedItem } from "@/lib/billing/pricing";
import { isDeskChannel, type DeskChannel } from "@/lib/billing/deskChannels";

export { DESK_CHANNELS, SHIFT_STATUS_LABEL, isDeskChannel, type DeskChannel } from "@/lib/billing/deskChannels";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Executor = typeof db | Tx;

export async function getOpenShift(executor: Executor, orgId: number, userId: number) {
  const [shift] = await executor
    .select()
    .from(cashierShifts)
    .where(and(eq(cashierShifts.organisationId, orgId), eq(cashierShifts.userId, userId), eq(cashierShifts.status, "open")))
    .limit(1);
  return shift ?? null;
}

/** What the shift's desk payments add up to, per channel. */
export async function shiftTotals(executor: Executor, shiftId: number) {
  const rows = await executor
    .select({ channel: payments.channel, total: sql<number>`coalesce(sum(${payments.amount}), 0)::int`, count: sql<number>`count(*)::int` })
    .from(payments)
    .where(and(eq(payments.shiftId, shiftId), eq(payments.status, "success")))
    .groupBy(payments.channel);
  const by = (c: DeskChannel) => rows.find((r) => r.channel === c) ?? { total: 0, count: 0 };
  return {
    cash: by("cash").total,
    pos: by("pos").total,
    transfer: by("transfer").total,
    count: rows.reduce((s, r) => s + r.count, 0),
  };
}

export interface DeskPaymentInput {
  channel: DeskChannel;
  posReference: string | null;
}

/**
 * Validates the desk-payment part of a "mark paid" request body and finds the
 * cashier's open shift. Every desk settlement needs an open shift — even one
 * where the patient pays nothing (an item fully billed to the HMO) — so each
 * "mark paid" is tied to the cashier and shift that recorded it. How the
 * patient paid (channel) is only asked for when money changes hands.
 */
export async function prepareDeskPayment(
  orgId: number,
  userId: number,
  body: { channel?: unknown; posReference?: unknown },
  amount: number,
  /** The open shift if already looked up (e.g. in parallel with pricing); omitted = look it up. */
  openShift?: Awaited<ReturnType<typeof getOpenShift>>,
): Promise<{ desk: (DeskPaymentInput & { shiftId: number }) | null } | { error: string; status: number; code?: string }> {
  const shift = openShift !== undefined ? openShift : await getOpenShift(db, orgId, userId);
  if (!shift) {
    return { error: "Open your cashier shift before recording payments", status: 409, code: "NO_OPEN_SHIFT" };
  }
  if (amount <= 0) return { desk: null };
  if (!isDeskChannel(body.channel)) {
    return { error: "Choose how the patient paid: cash, POS or bank transfer", status: 400 };
  }
  const posReference = typeof body.posReference === "string" && body.posReference.trim() ? body.posReference.trim().slice(0, 64) : null;
  return { desk: { channel: body.channel, posReference, shiftId: shift.id } };
}

/**
 * Records money collected at the desk as a real payment (method "desk") in
 * the cashier's shift, with one payment item per settled bill line. Call in
 * the same transaction that flips the items to paid, with the items as
 * finally priced (see settleHmoItems' return value).
 */
export async function recordDeskPayment(
  tx: Tx,
  { orgId, userId, desk, items }: { orgId: number; userId: number; desk: DeskPaymentInput & { shiftId: number }; items: PricedItem[] },
) {
  const lines = items.filter((i) => i.patientAmount > 0);
  const amount = lines.reduce((s, i) => s + i.patientAmount, 0);
  if (amount <= 0) return null;
  const [payment] = await tx
    .insert(payments)
    .values({
      organisationId: orgId,
      patientId: lines[0].patientId,
      amount,
      status: "success",
      method: "desk",
      purpose: "bill",
      initiatedBy: "staff",
      confirmedBy: userId,
      gatewayReference: `cv_desk_${desk.shiftId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      shiftId: desk.shiftId,
      channel: desk.channel,
      posReference: desk.posReference,
    })
    .returning({ id: payments.id });
  await tx.insert(paymentItems).values(lines.map((i) => ({ paymentId: payment.id, itemType: i.itemType, itemId: i.itemId, amount: i.patientAmount })));
  return { paymentId: payment.id, amount };
}

/** Parses a counted amount from the close form (whole Naira, ≥ 0). */
export function parseAmount(v: unknown): number | null {
  const n = typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v.replace(/,/g, "")) : NaN;
  return Number.isInteger(n) && n >= 0 ? n : null;
}

import { db } from "@/lib/db";
import {
  admissions,
  admissionTransfers,
  wards,
  patients,
  patientCharges,
  requests,
  prescriptions,
  labTests,
  drugGenerics,
  products,
  wallets,
  payments,
  paymentItems,
} from "@/lib/db/schema";
import { and, asc, eq, gte, inArray, isNull, lte, ne, or } from "drizzle-orm";
import { priceBillItems, itemKey, type BillItemRef, type PricedItem } from "@/lib/billing/pricing";
import { settleHmoItems } from "@/lib/billing/settle";
import { debitWallet } from "@/lib/wallet";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Executor = typeof db | Tx;

const WAT = 3_600_000;
const watDate = (d: Date) => new Date(d.getTime() + WAT).toISOString().slice(0, 10);
const watHour = (d: Date) => new Date(d.getTime() + WAT).getUTCHours();
const addDays = (date: string, n: number) => {
  const [y, m, dd] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, dd + n)).toISOString().slice(0, 10);
};
/** End of a WAT calendar day as a UTC instant. */
const endOfWatDay = (date: string) => {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + 1) - WAT);
};

/**
 * Calendar days to charge for a stay: every WAT day from the admission day,
 * up to today while admitted. On discharge, the discharge day counts only
 * if the patient left at or after 12:00 (or was admitted and discharged the
 * same day) — the common "discharge before noon" rule.
 */
export function bedDays(admittedAt: Date, dischargedAt: Date | null, now: Date = new Date()): string[] {
  const first = watDate(admittedAt);
  let last: string;
  if (dischargedAt) {
    last = watDate(dischargedAt);
    if (last !== first && watHour(dischargedAt) < 12) last = addDays(last, -1);
  } else {
    last = watDate(now);
  }
  const days: string[] = [];
  for (let d = first; d <= last && days.length < 3660; d = addDays(d, 1)) days.push(d);
  return days;
}

/**
 * Creates any missing bed-day charges for an admission (idempotent: one per
 * admission per day via a unique index). The ward for each day is where the
 * patient was at the end of that day (following transfers); wards without a
 * daily rate aren't charged. Returns how many were added.
 */
export async function syncBedDayCharges(executor: Executor, orgId: number, admissionId: number, userId: number | null): Promise<number> {
  const [adm] = await executor
    .select({
      id: admissions.id,
      patientId: admissions.patientId,
      status: admissions.status,
      wardId: admissions.wardId,
      admittedAt: admissions.admittedAt,
      dischargedAt: admissions.dischargedAt,
    })
    .from(admissions)
    .where(and(eq(admissions.id, admissionId), eq(admissions.organisationId, orgId)))
    .limit(1);
  if (!adm?.admittedAt || (adm.status !== "admitted" && adm.status !== "discharged")) return 0;

  const transfers = await executor
    .select({ fromWardId: admissionTransfers.fromWardId, toWardId: admissionTransfers.toWardId, at: admissionTransfers.transferredAt })
    .from(admissionTransfers)
    .where(eq(admissionTransfers.admissionId, admissionId))
    .orderBy(asc(admissionTransfers.transferredAt));
  const initialWard = transfers[0]?.fromWardId ?? (transfers.length ? null : adm.wardId);
  const wardOn = (date: string) => {
    const end = endOfWatDay(date);
    let ward = initialWard ?? adm.wardId;
    for (const t of transfers) if (t.at <= end) ward = t.toWardId;
    return ward;
  };

  const days = bedDays(adm.admittedAt, adm.dischargedAt);
  const wardIds = [...new Set(days.map(wardOn).filter((v): v is number => v != null))];
  if (wardIds.length === 0) return 0;
  const wardRows = await executor.select({ id: wards.id, name: wards.name, rate: wards.dailyRate }).from(wards).where(inArray(wards.id, wardIds));
  const wardById = new Map(wardRows.map((w) => [w.id, w]));

  const rows = days
    .map((date) => {
      const w = wardById.get(wardOn(date) ?? -1);
      if (!w?.rate || w.rate <= 0) return null;
      return {
        organisationId: orgId,
        patientId: adm.patientId,
        admissionId: adm.id,
        sourceType: "bed_day",
        wardId: w.id,
        chargeDate: date,
        description: `Bed — ${w.name}`,
        quantity: 1,
        unitPrice: w.rate,
        createdBy: userId,
      };
    })
    .filter((r): r is NonNullable<typeof r> => r != null);
  if (rows.length === 0) return 0;
  const inserted = await executor.insert(patientCharges).values(rows).onConflictDoNothing().returning({ id: patientCharges.id });
  return inserted.length;
}

export type LineCategory = "bed" | "service" | "test" | "drug";

export interface BillLine {
  itemType: "request" | "prescription" | "charge";
  itemId: number;
  date: string;
  category: LineCategory;
  description: string;
  quantity: number;
  paymentStatus: string;
  priced: PricedItem | null;
}

/**
 * The running bill for one admission: bed days and services charged to it,
 * plus the lab/imaging tests and drugs ordered for the patient during the
 * stay (inpatient prescriptions, or anything created between admission and
 * discharge). Every line is priced for the patient's payer (HMO tariff +
 * co-pay, or self-pay).
 */
export async function getAdmissionBill(executor: Executor, orgId: number, admissionId: number) {
  const [adm] = await executor
    .select({
      id: admissions.id,
      patientId: admissions.patientId,
      status: admissions.status,
      admittedAt: admissions.admittedAt,
      dischargedAt: admissions.dischargedAt,
      createdAt: admissions.createdAt,
      dischargeBalance: admissions.dischargeBalance,
      dischargeBalanceNote: admissions.dischargeBalanceNote,
      patientFirstname: patients.firstname,
      patientLastname: patients.lastname,
      patientMrn: patients.mrn,
    })
    .from(admissions)
    .leftJoin(patients, eq(admissions.patientId, patients.id))
    .where(and(eq(admissions.id, admissionId), eq(admissions.organisationId, orgId)))
    .limit(1);
  if (!adm) return null;

  const from = adm.admittedAt ?? adm.createdAt;
  const to = adm.dischargedAt ?? new Date();

  const [charges, reqs, rxs, wallet] = await Promise.all([
    executor
      .select()
      .from(patientCharges)
      .where(and(eq(patientCharges.admissionId, adm.id), isNull(patientCharges.deletedAt)))
      .orderBy(asc(patientCharges.chargeDate), asc(patientCharges.id)),
    executor
      .select({ id: requests.id, createdAt: requests.createdAt, name: labTests.name, paymentStatus: requests.paymentStatus })
      .from(requests)
      .leftJoin(labTests, eq(requests.testId, labTests.id))
      .where(and(eq(requests.organisationId, orgId), eq(requests.patientId, adm.patientId), gte(requests.createdAt, from), lte(requests.createdAt, to))),
    executor
      .select({
        id: prescriptions.id,
        createdAt: prescriptions.createdAt,
        generic: drugGenerics.name,
        strength: drugGenerics.strength,
        product: products.name,
        paymentStatus: prescriptions.paymentStatus,
      })
      .from(prescriptions)
      .leftJoin(drugGenerics, eq(prescriptions.genericId, drugGenerics.id))
      .leftJoin(products, eq(prescriptions.productId, products.id))
      .where(and(
        eq(prescriptions.organisationId, orgId),
        eq(prescriptions.patientId, adm.patientId),
        ne(prescriptions.status, "cancelled"),
        or(eq(prescriptions.admissionId, adm.id), and(gte(prescriptions.createdAt, from), lte(prescriptions.createdAt, to))),
      )),
    executor.select({ balance: wallets.balance }).from(wallets).where(eq(wallets.patientId, adm.patientId)).limit(1),
  ]);

  const refs: BillItemRef[] = [
    ...charges.map((c) => ({ itemType: "charge" as const, itemId: c.id })),
    ...reqs.map((r) => ({ itemType: "request" as const, itemId: r.id })),
    ...rxs.map((r) => ({ itemType: "prescription" as const, itemId: r.id })),
  ];
  const priced = await priceBillItems(orgId, refs, executor);
  const lines: BillLine[] = [
    ...charges.map((c) => ({
      itemType: "charge" as const,
      itemId: c.id,
      date: c.chargeDate,
      category: (c.sourceType === "bed_day" ? "bed" : "service") as LineCategory,
      description: c.description,
      quantity: c.quantity,
      paymentStatus: c.paymentStatus,
      priced: priced.get(itemKey("charge", c.id)) ?? null,
    })),
    ...reqs.map((r) => ({
      itemType: "request" as const,
      itemId: r.id,
      date: watDate(r.createdAt),
      category: "test" as LineCategory,
      description: r.name ?? "Test",
      quantity: 1,
      paymentStatus: r.paymentStatus,
      priced: priced.get(itemKey("request", r.id)) ?? null,
    })),
    ...rxs.map((r) => ({
      itemType: "prescription" as const,
      itemId: r.id,
      date: watDate(r.createdAt),
      category: "drug" as LineCategory,
      description: r.product ?? `${r.generic ?? "Medication"} ${r.strength ?? ""}`.trim(),
      quantity: 1,
      paymentStatus: r.paymentStatus,
      priced: priced.get(itemKey("prescription", r.id)) ?? null,
    })),
  ].sort((a, b) => a.date.localeCompare(b.date));

  const sum = (f: (l: BillLine) => number) => lines.reduce((s, l) => s + f(l), 0);
  const open = (l: BillLine) => l.paymentStatus === "not_paid";
  const totals = {
    gross: sum((l) => l.priced?.price ?? 0),
    hmo: sum((l) => (l.paymentStatus !== "waived" ? l.priced?.hmoAmount ?? 0 : 0)),
    patient: sum((l) => (l.paymentStatus !== "waived" ? l.priced?.patientAmount ?? 0 : 0)),
    paid: sum((l) => (l.paymentStatus === "paid" ? l.priced?.patientAmount ?? 0 : 0)),
    waived: sum((l) => (l.paymentStatus === "waived" ? l.priced?.patientAmount ?? 0 : 0)),
    outstanding: sum((l) => (open(l) ? l.priced?.patientAmount ?? 0 : 0)),
    unpricedLines: lines.filter((l) => open(l) && (l.priced?.price == null)).length,
    openLines: lines.filter(open).length,
  };
  return { admission: adm, lines, totals, walletBalance: wallet[0]?.balance ?? 0 };
}

/**
 * Settles every open line of the bill from the patient's wallet (e.g. an
 * admission deposit): debits the patient's total share in one wallet
 * transaction, records a "wallet" payment with its items, marks the lines
 * paid and records the HMO's share as receivables.
 */
export async function payBillFromWallet(tx: Tx, { orgId, admissionId, userId }: { orgId: number; admissionId: number; userId: number }) {
  const bill = await getAdmissionBill(tx, orgId, admissionId);
  if (!bill) return { error: "Admission not found", status: 404 } as const;
  const open = bill.lines.filter((l) => l.paymentStatus === "not_paid" && l.priced && l.priced.price != null);
  if (open.length === 0) return { error: "Nothing outstanding on this bill" } as const;
  const total = open.reduce((s, l) => s + (l.priced?.patientAmount ?? 0), 0);
  const [wallet] = await tx.select().from(wallets).where(eq(wallets.patientId, bill.admission.patientId)).limit(1);
  if (total > 0 && (!wallet || wallet.balance < total)) {
    return { error: `Wallet balance (₦${(wallet?.balance ?? 0).toLocaleString()}) is less than the ₦${total.toLocaleString()} outstanding` } as const;
  }

  const [payment] = await tx
    .insert(payments)
    .values({
      organisationId: orgId,
      patientId: bill.admission.patientId,
      amount: total,
      status: "success",
      method: "wallet",
      purpose: "bill",
      initiatedBy: "staff",
      confirmedBy: userId,
      gatewayReference: `cv_adm_${admissionId}_${Date.now()}`,
    })
    .returning();
  await tx.insert(paymentItems).values(open.map((l) => ({ paymentId: payment.id, itemType: l.itemType, itemId: l.itemId, amount: l.priced?.patientAmount ?? 0 })));
  if (total > 0 && wallet) {
    await debitWallet(tx, {
      walletId: wallet.id,
      patientId: bill.admission.patientId,
      organisationId: orgId,
      amount: total,
      source: "bill_payment",
      referenceType: "payment",
      referenceId: payment.id,
      description: `Admission bill #${admissionId}`,
    });
  }
  const now = new Date();
  const idsOf = (t: BillLine["itemType"]) => open.filter((l) => l.itemType === t).map((l) => l.itemId);
  if (idsOf("charge").length) await tx.update(patientCharges).set({ paymentStatus: "paid", updatedAt: now }).where(inArray(patientCharges.id, idsOf("charge")));
  if (idsOf("request").length) await tx.update(requests).set({ paymentStatus: "paid", updatedAt: now }).where(inArray(requests.id, idsOf("request")));
  if (idsOf("prescription").length) await tx.update(prescriptions).set({ paymentStatus: "paid", updatedAt: now }).where(inArray(prescriptions.id, idsOf("prescription")));
  await settleHmoItems(tx, orgId, open.map((l) => l.priced!).filter(Boolean), { actorId: userId });
  return { paymentId: payment.id, amount: total, lines: open.length, patientId: bill.admission.patientId } as const;
}

/**
 * After discharge: removes (voids) unpaid bed-day charges for days that, by
 * the before-noon rule, are no longer billable — e.g. today's bed day that
 * was charged while the patient was still in, when they left at 10:00.
 */
export async function trimBedDaysAfterDischarge(executor: Executor, orgId: number, admissionId: number) {
  const [adm] = await executor
    .select({ admittedAt: admissions.admittedAt, dischargedAt: admissions.dischargedAt })
    .from(admissions)
    .where(and(eq(admissions.id, admissionId), eq(admissions.organisationId, orgId)))
    .limit(1);
  if (!adm?.admittedAt || !adm.dischargedAt) return 0;
  const days = bedDays(adm.admittedAt, adm.dischargedAt);
  const last = days[days.length - 1];
  if (!last) return 0;
  const trimmed = await executor
    .update(patientCharges)
    .set({ deletedAt: new Date(), voidReason: "Discharged before noon — day not billable", updatedAt: new Date() })
    .where(and(
      eq(patientCharges.admissionId, admissionId),
      eq(patientCharges.sourceType, "bed_day"),
      eq(patientCharges.paymentStatus, "not_paid"),
      isNull(patientCharges.deletedAt),
      gte(patientCharges.chargeDate, addDays(last, 1)),
    ))
    .returning({ id: patientCharges.id });
  return trimmed.length;
}

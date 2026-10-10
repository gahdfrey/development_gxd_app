import { db } from "@/lib/db";
import { prescriptions, drugGenerics, products, medicationAdministrations, users, admissions } from "@/lib/db/schema";
import { and, asc, desc, eq, gte, inArray, isNull, lt, ne, or } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { OVERDUE_AFTER_MINUTES, scheduledSlots, watDayBounds, courseEnd } from "@/lib/emar/schedule";
import { isHighAlert } from "@/lib/emar/highAlert";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Executor = typeof db | Tx;

const administeredBy = alias(users, "administered_by_user");
const witnessedBy = alias(users, "witnessed_by_user");
const preferredProduct = alias(products, "preferred_product");

/** Inpatient prescriptions on an admission's chart (not cancelled). */
export async function chartPrescriptions(executor: Executor, orgId: number, admissionId: number) {
  return executor
    .select({
      id: prescriptions.id,
      patientId: prescriptions.patientId,
      genericId: prescriptions.genericId,
      genericName: drugGenerics.name,
      genericStrength: drugGenerics.strength,
      genericForm: drugGenerics.form,
      productName: preferredProduct.name,
      dosage: prescriptions.dosage,
      doseAmount: prescriptions.doseAmount,
      route: prescriptions.route,
      frequency: prescriptions.frequency,
      durationDays: prescriptions.durationDays,
      startAt: prescriptions.startAt,
      createdAt: prescriptions.createdAt,
      isPrn: prescriptions.isPrn,
      prnIndication: prescriptions.prnIndication,
      prnMaxPer24h: prescriptions.prnMaxPer24h,
      prnMinIntervalHours: prescriptions.prnMinIntervalHours,
      stoppedAt: prescriptions.stoppedAt,
      stopReason: prescriptions.stopReason,
      status: prescriptions.status,
      paymentStatus: prescriptions.paymentStatus,
    })
    .from(prescriptions)
    .leftJoin(drugGenerics, eq(prescriptions.genericId, drugGenerics.id))
    .leftJoin(preferredProduct, eq(prescriptions.productId, preferredProduct.id))
    .where(and(
      eq(prescriptions.organisationId, orgId),
      eq(prescriptions.admissionId, admissionId),
      ne(prescriptions.status, "cancelled"),
    ))
    .orderBy(asc(prescriptions.isPrn), asc(prescriptions.createdAt));
}

/** Administration events for prescriptions in a time window (by givenAt or scheduledAt). */
export async function administrationsFor(executor: Executor, prescriptionIds: number[], from: Date, to: Date) {
  if (prescriptionIds.length === 0) return [];
  return executor
    .select({
      e: medicationAdministrations,
      byFirstname: administeredBy.firstname,
      byLastname: administeredBy.lastname,
      witnessFirstname: witnessedBy.firstname,
      witnessLastname: witnessedBy.lastname,
    })
    .from(medicationAdministrations)
    .leftJoin(administeredBy, eq(medicationAdministrations.administeredBy, administeredBy.id))
    .leftJoin(witnessedBy, eq(medicationAdministrations.witnessedBy, witnessedBy.id))
    .where(and(
      inArray(medicationAdministrations.prescriptionId, prescriptionIds),
      isNull(medicationAdministrations.deletedAt),
      or(
        and(gte(medicationAdministrations.scheduledAt, from), lt(medicationAdministrations.scheduledAt, to)),
        and(gte(medicationAdministrations.givenAt, from), lt(medicationAdministrations.givenAt, to)),
      ),
    ))
    .orderBy(desc(medicationAdministrations.givenAt))
    .then((rows) =>
      rows.map((r) => ({ ...r.e, byFirstname: r.byFirstname, byLastname: r.byLastname, witnessFirstname: r.witnessFirstname, witnessLastname: r.witnessLastname })),
    );
}

export type SlotState = "given" | "held" | "refused" | "not_available" | "missed" | "due" | "overdue" | "upcoming";

/**
 * The medication chart for one WAT calendar day: each prescription with its
 * scheduled slots (and their state), PRN doses in the last 24 h, and flags.
 */
export async function getMedicationChart(executor: Executor, orgId: number, admissionId: number, date: string) {
  const { start, end } = watDayBounds(date);
  const rxs = await chartPrescriptions(executor, orgId, admissionId);
  const now = new Date();
  const windowFrom = new Date(Math.min(start.getTime(), now.getTime() - 86_400_000));
  const events = await administrationsFor(executor, rxs.map((r) => r.id), windowFrom, end);

  const items = rxs.map((rx) => {
    const rxEvents = events.filter((e) => e.prescriptionId === rx.id);
    const slots = scheduledSlots(rx, start, end).map((t) => {
      const ev = rxEvents.find((e) => e.scheduledAt && e.scheduledAt.getTime() === t.getTime());
      let state: SlotState;
      if (ev) state = ev.status as SlotState;
      else if (now.getTime() > t.getTime() + OVERDUE_AFTER_MINUTES * 60_000) state = "overdue";
      else if (now.getTime() >= t.getTime() - OVERDUE_AFTER_MINUTES * 60_000) state = "due";
      else state = "upcoming";
      return { scheduledAt: t, state, event: ev ?? null };
    });
    const unscheduled = rxEvents.filter((e) => e.scheduledAt == null);
    const prnLast24h = unscheduled.filter((e) => e.status === "given" && now.getTime() - e.givenAt.getTime() < 86_400_000);
    const lastPrn = prnLast24h[0] ?? null;
    const end_ = courseEnd(rx);
    return {
      ...rx,
      highAlert: isHighAlert(rx.genericName),
      active: !rx.stoppedAt && (!end_ || end_ > now),
      courseEnd: end_,
      dispensed: rx.status === "dispatched",
      slots,
      unscheduled,
      prn: rx.isPrn
        ? {
            givenLast24h: prnLast24h.length,
            lastGivenAt: lastPrn?.givenAt ?? null,
            nextAllowedAt: lastPrn && rx.prnMinIntervalHours
              ? new Date(lastPrn.givenAt.getTime() + rx.prnMinIntervalHours * 3_600_000)
              : null,
            limitReached: rx.prnMaxPer24h != null && prnLast24h.length >= rx.prnMaxPer24h,
          }
        : null,
    };
  });
  return { date, items };
}

/** Due-now and overdue dose counts for every current admission (ward view). */
export async function wardMedicationSummary(executor: Executor, orgId: number) {
  const now = new Date();
  const from = new Date(now.getTime() - 86_400_000);
  const dueTo = new Date(now.getTime() + OVERDUE_AFTER_MINUTES * 60_000);
  const rxs = await executor
    .select({
      id: prescriptions.id,
      admissionId: prescriptions.admissionId,
      frequency: prescriptions.frequency,
      startAt: prescriptions.startAt,
      createdAt: prescriptions.createdAt,
      durationDays: prescriptions.durationDays,
      stoppedAt: prescriptions.stoppedAt,
      isPrn: prescriptions.isPrn,
    })
    .from(prescriptions)
    .innerJoin(admissions, eq(prescriptions.admissionId, admissions.id))
    .where(and(eq(prescriptions.organisationId, orgId), eq(admissions.status, "admitted"), ne(prescriptions.status, "cancelled")));
  const events = await administrationsFor(executor, rxs.map((r) => r.id), from, dueTo);
  const recorded = new Set(events.filter((e) => e.scheduledAt).map((e) => `${e.prescriptionId}:${e.scheduledAt!.getTime()}`));

  const summary = new Map<number, { admissionId: number; dueNow: number; overdue: number }>();
  for (const rx of rxs) {
    if (rx.admissionId == null) continue;
    const s = summary.get(rx.admissionId) ?? { admissionId: rx.admissionId, dueNow: 0, overdue: 0 };
    for (const t of scheduledSlots(rx, from, dueTo)) {
      if (recorded.has(`${rx.id}:${t.getTime()}`)) continue;
      if (now.getTime() > t.getTime() + OVERDUE_AFTER_MINUTES * 60_000) s.overdue++;
      else s.dueNow++;
    }
    summary.set(rx.admissionId, s);
  }
  return [...summary.values()];
}

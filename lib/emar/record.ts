import { db } from "@/lib/db";
import { medicationAdministrations, users } from "@/lib/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { getMedicationChart } from "@/lib/emar/chart";
import { scheduledSlots, todayWat } from "@/lib/emar/schedule";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export const ADMIN_STATUSES = ["given", "held", "refused", "not_available", "missed"] as const;
export type AdminStatus = (typeof ADMIN_STATUSES)[number];

export interface RecordInput {
  prescriptionId: unknown;
  scheduledAt?: unknown;
  status: unknown;
  doseGiven?: unknown;
  reason?: unknown;
  prnIndication?: unknown;
  witnessUserId?: unknown;
  givenAt?: unknown;
  notes?: unknown;
}

const text = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);

/**
 * Records one administration decision on an admission's chart. Enforces:
 * the prescription is on this chart and still active; a scheduled slot is a
 * real slot of its schedule and not already recorded; held / refused /
 * missed / not available need a reason; PRN doses respect the max-per-24h
 * and minimum interval; high-alert medicines need a second, different staff
 * member as witness.
 */
export async function recordAdministration(
  tx: Tx,
  { orgId, userId, admissionId, patientId, input }: { orgId: number; userId: number; admissionId: number; patientId: number; input: RecordInput },
): Promise<{ error: string; status?: number } | { event: typeof medicationAdministrations.$inferSelect }> {
  const status = input.status as AdminStatus;
  if (!ADMIN_STATUSES.includes(status)) return { error: "Choose what happened to this dose" };
  const reason = text(input.reason);
  if (status !== "given" && !reason) return { error: "Give the reason this dose wasn't given" };

  const chart = await getMedicationChart(tx, orgId, admissionId, todayWat());
  const rx = chart.items.find((i) => i.id === Number(input.prescriptionId));
  if (!rx) return { error: "This drug isn't on the patient's medication chart", status: 404 };
  if (!rx.active && status === "given") return { error: "This drug has been stopped or its course has ended" };

  let scheduledAt: Date | null = null;
  if (input.scheduledAt) {
    scheduledAt = new Date(String(input.scheduledAt));
    if (isNaN(scheduledAt.getTime())) return { error: "Invalid dose time" };
    const window = 2 * 86_400_000;
    const real = scheduledSlots(rx, new Date(scheduledAt.getTime() - window), new Date(scheduledAt.getTime() + window))
      .some((t) => t.getTime() === scheduledAt!.getTime());
    if (!real) return { error: "That isn't one of this drug's scheduled dose times" };
    const [existing] = await tx
      .select({ id: medicationAdministrations.id })
      .from(medicationAdministrations)
      .where(and(
        eq(medicationAdministrations.prescriptionId, rx.id),
        eq(medicationAdministrations.scheduledAt, scheduledAt),
        isNull(medicationAdministrations.deletedAt),
      ))
      .limit(1);
    if (existing) return { error: "This dose has already been recorded", status: 409 };
  } else if (!rx.isPrn && rx.frequency !== "STAT") {
    return { error: "Choose which scheduled dose this is" };
  }

  let givenAt = new Date();
  if (input.givenAt) {
    givenAt = new Date(String(input.givenAt));
    if (isNaN(givenAt.getTime()) || givenAt.getTime() > Date.now() + 5 * 60_000 || Date.now() - givenAt.getTime() > 2 * 86_400_000) {
      return { error: "Time given must be within the last 48 hours" };
    }
  }

  if (rx.isPrn && status === "given") {
    if (rx.prn?.limitReached) return { error: `Maximum of ${rx.prnMaxPer24h} doses in 24 hours already given` };
    if (rx.prn?.nextAllowedAt && givenAt < rx.prn.nextAllowedAt) {
      return {
        error: `Too soon — the last dose was less than ${rx.prnMinIntervalHours} h ago. Next allowed at ${rx.prn.nextAllowedAt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Lagos" })}`,
      };
    }
  }

  let witnessedBy: number | null = null;
  if (rx.highAlert && status === "given") {
    witnessedBy = Number(input.witnessUserId);
    if (!Number.isInteger(witnessedBy)) return { error: "High-alert medicine: a second nurse must check and be recorded as witness" };
    if (witnessedBy === userId) return { error: "The witness must be a different person" };
    const [w] = await tx
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.id, witnessedBy), eq(users.organisationId, orgId), isNull(users.deletedAt)))
      .limit(1);
    if (!w) return { error: "Witness not found" };
  }

  const [event] = await tx
    .insert(medicationAdministrations)
    .values({
      organisationId: orgId,
      prescriptionId: rx.id,
      patientId,
      admissionId,
      scheduledAt,
      status,
      givenAt,
      doseGiven: status === "given" ? text(input.doseGiven) ?? rx.doseAmount : null,
      route: status === "given" ? rx.route : null,
      reason: status === "given" ? null : reason,
      prnIndication: rx.isPrn && status === "given" ? text(input.prnIndication) : null,
      administeredBy: userId,
      witnessedBy,
      notes: text(input.notes),
    })
    .returning();
  return { event };
}

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { patientCharges, vaccinationCourses, vaccinationDoses } from "@/lib/db/schema";
import { and, eq, gt, inArray, isNull } from "drizzle-orm";
import { addDays, differenceInCalendarDays, format, parseISO } from "date-fns";
import { requirePermission } from "@/lib/authz";
import { logAudit } from "@/lib/audit";
import { todayInLagos } from "@/lib/billing/coverage";
import { isDateString } from "@/lib/vaccination";
import { findInFlightPaymentConflicts } from "@/lib/payments/guard";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

const text = (v: unknown, max = 200) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);

/** A course ends once none of its doses are still to come. */
async function syncCourseStatus(tx: Tx, courseId: number) {
  const doses = await tx.select({ status: vaccinationDoses.status }).from(vaccinationDoses).where(eq(vaccinationDoses.courseId, courseId));
  const open = doses.some((d) => d.status === "scheduled" || d.status === "missed");
  const status = open ? "active" : doses.some((d) => d.status === "given") ? "completed" : "cancelled";
  await tx.update(vaccinationCourses).set({ status, updatedAt: new Date() }).where(eq(vaccinationCourses.id, courseId));
}

/**
 * PATCH /api/vaccinations/doses/[id]
 *   { action: "give", batchNumber?, site?, notes? }          dose administered
 *   { action: "reschedule", scheduledDate, shiftLater? }      move the visit (and, optionally, every later dose by the same amount)
 *   { action: "missed" }                                      patient didn't come
 *   { action: "cancel", reason }                              won't be given — voids its unpaid bill line
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authz = await requirePermission([["vaccination", "edit"]]);
    if (authz.error) return authz.error;
    const { orgId, userId, userEmail } = authz.ctx;
    const id = parseInt((await params).id);
    const body = await request.json();

    const [dose] = await db
      .select()
      .from(vaccinationDoses)
      .where(and(eq(vaccinationDoses.id, id), eq(vaccinationDoses.organisationId, orgId)))
      .limit(1);
    if (!dose) return NextResponse.json({ error: "Dose not found" }, { status: 404 });
    const isOpen = dose.status === "scheduled" || dose.status === "missed";
    const audit = (action: string, details: Record<string, unknown>) =>
      void logAudit({ organisationId: orgId, userId, userEmail, action, entityType: "vaccination_dose", entityId: id, details: { patientId: dose.patientId, ...details } });

    if (body.action === "give") {
      if (!isOpen) return NextResponse.json({ error: `This dose is already ${dose.status}` }, { status: 409 });
      const values = { batchNumber: text(body.batchNumber, 64), site: text(body.site, 64), notes: text(body.notes, 1000) };
      await db.transaction(async (tx) => {
        await tx
          .update(vaccinationDoses)
          .set({ ...values, status: "given", givenAt: new Date(), givenBy: userId, updatedAt: new Date() })
          .where(eq(vaccinationDoses.id, id));
        await syncCourseStatus(tx, dose.courseId);
      });
      audit("vaccination.give", values);
      return NextResponse.json({ success: true });
    }

    if (body.action === "reschedule") {
      if (!isOpen) return NextResponse.json({ error: `This dose is already ${dose.status}` }, { status: 409 });
      if (!isDateString(body.scheduledDate)) return NextResponse.json({ error: "Choose the new date" }, { status: 400 });
      if (body.scheduledDate < todayInLagos()) return NextResponse.json({ error: "The new date can't be in the past" }, { status: 400 });
      const shiftDays = differenceInCalendarDays(parseISO(body.scheduledDate), parseISO(dose.scheduledDate));
      const moved = await db.transaction(async (tx) => {
        const later = body.shiftLater
          ? await tx
              .select({ id: vaccinationDoses.id, scheduledDate: vaccinationDoses.scheduledDate, chargeId: vaccinationDoses.chargeId })
              .from(vaccinationDoses)
              .where(and(
                eq(vaccinationDoses.courseId, dose.courseId),
                gt(vaccinationDoses.doseNumber, dose.doseNumber),
                inArray(vaccinationDoses.status, ["scheduled", "missed"]),
              ))
          : [];
        const updates = [
          { id: dose.id, chargeId: dose.chargeId, date: body.scheduledDate as string },
          ...later.map((d) => ({ id: d.id, chargeId: d.chargeId, date: format(addDays(parseISO(d.scheduledDate), shiftDays), "yyyy-MM-dd") })),
        ];
        for (const u of updates) {
          await tx.update(vaccinationDoses).set({ scheduledDate: u.date, status: "scheduled", updatedAt: new Date() }).where(eq(vaccinationDoses.id, u.id));
          // The bill line's date follows the visit (only while it's still open).
          if (u.chargeId != null) {
            await tx
              .update(patientCharges)
              .set({ chargeDate: u.date, updatedAt: new Date() })
              .where(and(eq(patientCharges.id, u.chargeId), eq(patientCharges.paymentStatus, "not_paid"), isNull(patientCharges.deletedAt)));
          }
        }
        await syncCourseStatus(tx, dose.courseId);
        return updates.length;
      });
      audit("vaccination.reschedule", { from: dose.scheduledDate, to: body.scheduledDate, dosesMoved: moved });
      return NextResponse.json({ success: true, dosesMoved: moved });
    }

    if (body.action === "missed") {
      if (dose.status !== "scheduled") return NextResponse.json({ error: `This dose is already ${dose.status}` }, { status: 409 });
      await db.update(vaccinationDoses).set({ status: "missed", updatedAt: new Date() }).where(eq(vaccinationDoses.id, id));
      audit("vaccination.missed", { scheduledDate: dose.scheduledDate });
      return NextResponse.json({ success: true });
    }

    if (body.action === "cancel") {
      if (!isOpen) return NextResponse.json({ error: `This dose is already ${dose.status}` }, { status: 409 });
      const reason = text(body.reason, 500);
      if (!reason) return NextResponse.json({ error: "Say why this dose is being cancelled" }, { status: 400 });
      const [charge] = dose.chargeId != null
        ? await db.select({ paymentStatus: patientCharges.paymentStatus }).from(patientCharges)
            .where(and(eq(patientCharges.id, dose.chargeId), isNull(patientCharges.deletedAt))).limit(1)
        : [];
      if (charge?.paymentStatus === "paid") {
        return NextResponse.json({ error: "This dose has been paid for — reschedule it, or refund it through Finance before cancelling" }, { status: 409 });
      }
      if (dose.chargeId != null && (await findInFlightPaymentConflicts([{ itemType: "charge", itemId: dose.chargeId }])).length > 0) {
        return NextResponse.json({ error: "The patient has a payment in progress for this dose — try again once it settles" }, { status: 409 });
      }
      await db.transaction(async (tx) => {
        await tx.update(vaccinationDoses).set({ status: "cancelled", cancelReason: reason, updatedAt: new Date() }).where(eq(vaccinationDoses.id, id));
        if (dose.chargeId != null && charge?.paymentStatus === "not_paid") {
          await tx
            .update(patientCharges)
            .set({ deletedAt: new Date(), voidReason: `Vaccination dose cancelled: ${reason}`, updatedAt: new Date() })
            .where(eq(patientCharges.id, dose.chargeId));
        }
        await syncCourseStatus(tx, dose.courseId);
      });
      audit("vaccination.cancel", { reason });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  } catch (error) {
    console.error("Error updating vaccination dose:", error);
    return NextResponse.json({ error: "Failed to update dose" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { patientCharges, vaccinationCourses, vaccinationDoses } from "@/lib/db/schema";
import { and, eq, inArray, isNull, ne } from "drizzle-orm";
import { requirePermission } from "@/lib/authz";
import { logAudit } from "@/lib/audit";
import { priceBillItems } from "@/lib/billing/pricing";
import { settleHmoItems } from "@/lib/billing/settle";
import { getOpenShift, prepareDeskPayment, recordDeskPayment } from "@/lib/billing/shifts";
import { findInFlightPaymentConflicts } from "@/lib/payments/guard";

class SettleConflict extends Error {}

/**
 * POST /api/vaccinations/courses/[id]/collect — { channel, posReference? }
 * The cashier takes payment for every unpaid dose of a vaccination course at
 * once: one desk payment in their open shift covering all of them.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authz = await requirePermission([["finance", "edit"], ["finance", "add"]]);
    if (authz.error) return authz.error;
    const { orgId, userId, userEmail } = authz.ctx;
    const courseId = parseInt((await params).id);
    const body = await request.json();

    // The course's unpaid doses (org-scoped through the course) and the
    // cashier's open shift, in parallel.
    const [unpaid, shift] = await Promise.all([
      db
        .select({ chargeId: patientCharges.id })
        .from(vaccinationCourses)
        .innerJoin(vaccinationDoses, eq(vaccinationDoses.courseId, vaccinationCourses.id))
        .innerJoin(patientCharges, eq(vaccinationDoses.chargeId, patientCharges.id))
        .where(and(
          eq(vaccinationCourses.id, courseId),
          eq(vaccinationCourses.organisationId, orgId),
          ne(vaccinationDoses.status, "cancelled"),
          eq(patientCharges.paymentStatus, "not_paid"),
          isNull(patientCharges.deletedAt),
        )),
      getOpenShift(db, orgId, userId),
    ]);
    const chargeIds = unpaid.map((u) => u.chargeId);
    if (chargeIds.length === 0) return NextResponse.json({ error: "Nothing left to pay on this vaccination" }, { status: 409 });

    const refs = chargeIds.map((id) => ({ itemType: "charge" as const, itemId: id }));
    const [conflicts, priced] = await Promise.all([findInFlightPaymentConflicts(refs), priceBillItems(orgId, refs)]);
    if (conflicts.length > 0) {
      return NextResponse.json({ error: "The patient has a payment in progress for one of these doses — try again once it settles" }, { status: 409 });
    }
    const amount = [...priced.values()].reduce((s, p) => s + p.patientAmount, 0);
    const prep = await prepareDeskPayment(orgId, userId, body, amount, shift);
    if ("error" in prep) return NextResponse.json({ error: prep.error, code: prep.code }, { status: prep.status });

    const settled = await db.transaction(async (tx) => {
      const rows = await tx
        .update(patientCharges)
        .set({ paymentStatus: "paid", updatedAt: new Date() })
        .where(and(inArray(patientCharges.id, chargeIds), eq(patientCharges.paymentStatus, "not_paid"), isNull(patientCharges.deletedAt)))
        .returning({ id: patientCharges.id });
      // Something changed underneath us (paid elsewhere / voided) — undo.
      if (rows.length !== chargeIds.length) throw new SettleConflict();
      const final = await settleHmoItems(tx, orgId, [...priced.values()], { authorizationCode: body.authorizationCode, actorId: userId });
      if (prep.desk) await recordDeskPayment(tx, { orgId, userId, desk: prep.desk, items: final });
      return true;
    }).catch((e) => {
      if (e instanceof SettleConflict) return false;
      throw e;
    });
    if (!settled) return NextResponse.json({ error: "Some of these doses were just settled elsewhere — refresh and try again" }, { status: 409 });

    for (const id of chargeIds) {
      void logAudit({ organisationId: orgId, userId, userEmail, action: "update", entityType: "patient_charge", entityId: id, details: { paymentStatus: "paid", vaccinationCourseId: courseId } });
    }
    return NextResponse.json({ success: true, amount, doses: chargeIds.length });
  } catch (error) {
    console.error("Error collecting vaccination payment:", error);
    return NextResponse.json({ error: "Failed to record payment" }, { status: 500 });
  }
}

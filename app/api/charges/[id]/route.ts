import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { patientCharges } from "@/lib/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { requirePermission } from "@/lib/authz";
import { logAudit } from "@/lib/audit";
import { priceBillItems, itemKey } from "@/lib/billing/pricing";
import { settleHmoItems } from "@/lib/billing/settle";
import { prepareDeskPayment, recordDeskPayment } from "@/lib/billing/shifts";

/**
 * PATCH /api/charges/[id] — finance actions on a bed-day / service charge:
 *   { paymentStatus: "paid", channel, posReference?, authorizationCode? }  collected at the desk
 *   { action: "waive", reason }                     written off (approved waiver)
 *   { action: "void", reason }                      charged in error (unpaid only)
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const body = await request.json();
    const authz = await requirePermission(
      body.action === "void" ? [["finance", "edit"], ["admission", "edit"]] : [["finance", "edit"], ["finance", "add"]],
    );
    if (authz.error) return authz.error;
    const { orgId, userId, userEmail } = authz.ctx;
    const id = parseInt((await params).id);
    const where = and(eq(patientCharges.id, id), eq(patientCharges.organisationId, orgId), isNull(patientCharges.deletedAt));
    const [charge] = await db.select().from(patientCharges).where(where).limit(1);
    if (!charge) return NextResponse.json({ error: "Charge not found" }, { status: 404 });
    const reason = typeof body.reason === "string" ? body.reason.trim() : "";

    if (body.paymentStatus === "paid") {
      if (charge.paymentStatus !== "not_paid") return NextResponse.json({ error: "Already settled" }, { status: 409 });
      const priced = await priceBillItems(orgId, [{ itemType: "charge", itemId: id }]);
      const prep = await prepareDeskPayment(orgId, userId, body, priced.get(itemKey("charge", id))?.patientAmount ?? 0);
      if ("error" in prep) return NextResponse.json({ error: prep.error, code: prep.code }, { status: prep.status });
      const settled = await db.transaction(async (tx) => {
        const [row] = await tx
          .update(patientCharges)
          .set({ paymentStatus: "paid", updatedAt: new Date() })
          .where(and(where, eq(patientCharges.paymentStatus, "not_paid")))
          .returning({ id: patientCharges.id });
        if (!row) return false;
        const final = await settleHmoItems(tx, orgId, [...priced.values()], { authorizationCode: body.authorizationCode, actorId: userId });
        if (prep.desk) await recordDeskPayment(tx, { orgId, userId, desk: prep.desk, items: final });
        return true;
      });
      if (!settled) return NextResponse.json({ error: "Already settled" }, { status: 409 });
      void logAudit({ organisationId: orgId, userId, userEmail, action: "update", entityType: "patient_charge", entityId: id, details: { paymentStatus: "paid" } });
      return NextResponse.json({ success: true });
    }
    if (body.action === "waive") {
      if (!reason) return NextResponse.json({ error: "Give the reason for the waiver and who approved it" }, { status: 400 });
      if (charge.paymentStatus !== "not_paid") return NextResponse.json({ error: "Already settled" }, { status: 409 });
      await db.update(patientCharges).set({ paymentStatus: "waived", waivedReason: reason, waivedBy: userId, updatedAt: new Date() }).where(where);
      void logAudit({ organisationId: orgId, userId, userEmail, action: "patient_charge.waive", entityType: "patient_charge", entityId: id, details: { reason, amount: charge.unitPrice * charge.quantity } });
      return NextResponse.json({ success: true });
    }
    if (body.action === "void") {
      if (!reason) return NextResponse.json({ error: "Say why this charge is being removed" }, { status: 400 });
      if (charge.paymentStatus === "paid") return NextResponse.json({ error: "A paid charge can't be removed — refund it instead" }, { status: 409 });
      await db.update(patientCharges).set({ deletedAt: new Date(), voidReason: reason, updatedAt: new Date() }).where(where);
      void logAudit({ organisationId: orgId, userId, userEmail, action: "patient_charge.void", entityType: "patient_charge", entityId: id, details: { reason, description: charge.description, chargeDate: charge.chargeDate } });
      return NextResponse.json({ success: true });
    }
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  } catch (error) {
    console.error("Error updating charge:", error);
    return NextResponse.json({ error: "Failed to update charge" }, { status: 500 });
  }
}

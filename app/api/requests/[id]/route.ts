import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requests } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { requirePermission } from "@/lib/authz";
import { logAudit } from "@/lib/audit";
import { priceBillItems, itemKey } from "@/lib/billing/pricing";
import { settleHmoItems } from "@/lib/billing/settle";
import { prepareDeskPayment, recordDeskPayment } from "@/lib/billing/shifts";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Marking a request as paid is a finance-desk action.
    const authz = await requirePermission([["finance", "edit"], ["finance", "add"]]);
    if (authz.error) return authz.error;
    const { orgId, userId: actorId, userEmail: actorEmail } = authz.ctx;

    const { id: idParam } = await params;
    const id = parseInt(idParam);

    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid request ID" }, { status: 400 });
    }

    const body = await request.json();
    const { paymentStatus, authorizationCode } = body;

    if (!paymentStatus || paymentStatus !== "paid") {
      return NextResponse.json(
        { error: "paymentStatus can only be set to 'paid'" },
        { status: 400 },
      );
    }

    const orgFilter = and(eq(requests.id, id), eq(requests.organisationId, orgId));

    const [existing] = await db
      .select({ paymentStatus: requests.paymentStatus })
      .from(requests)
      .where(orgFilter)
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    if (existing.paymentStatus === "paid") {
      return NextResponse.json(
        { error: "This request has already been marked as paid and cannot be changed" },
        { status: 409 },
      );
    }

    // For HMO patients the desk only collects the co-pay; the HMO's share is
    // recorded as a receivable in the same transaction as the status flip.
    // Money the patient hands over is recorded against the cashier's open shift.
    const priced = await priceBillItems(orgId, [{ itemType: "request", itemId: id }]);
    const prep = await prepareDeskPayment(orgId, actorId, body, priced.get(itemKey("request", id))?.patientAmount ?? 0);
    if ("error" in prep) return NextResponse.json({ error: prep.error, code: prep.code }, { status: prep.status });
    const updated = await db.transaction(async (tx) => {
      const [row] = await tx
        .update(requests)
        .set({ paymentStatus: "paid", updatedAt: new Date() })
        .where(and(orgFilter, eq(requests.paymentStatus, "not_paid")))
        .returning();
      if (row) {
        const final = await settleHmoItems(tx, orgId, [...priced.values()], { authorizationCode, actorId });
        if (prep.desk) await recordDeskPayment(tx, { orgId, userId: actorId, desk: prep.desk, items: final });
      }
      return row;
    });

    if (!updated) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    void logAudit({
      organisationId: orgId,
      userId: actorId,
      userEmail: actorEmail,
      action: "update",
      entityType: "request",
      entityId: id,
      details: {
        paymentStatus: "paid",
        ...(priced.get(itemKey("request", id))?.basis === "covered" && {
          hmoAmount: priced.get(itemKey("request", id))!.hmoAmount,
          patientAmount: priced.get(itemKey("request", id))!.patientAmount,
          authorizationCode: authorizationCode || null,
        }),
      },
    });

    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    console.error("Error updating request:", error);
    return NextResponse.json({ error: "Failed to update request" }, { status: 500 });
  }
}

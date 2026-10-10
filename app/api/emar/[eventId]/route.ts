import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { medicationAdministrations } from "@/lib/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { requirePermission } from "@/lib/authz";
import { logAudit } from "@/lib/audit";
import { CLINICAL_EDIT } from "@/lib/clinical/access";

type Params = { params: Promise<{ eventId: string }> };

// PATCH { prnEffect } — record whether an as-needed dose worked.
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const authz = await requirePermission(CLINICAL_EDIT);
    if (authz.error) return authz.error;
    const { orgId, userId, userEmail } = authz.ctx;
    const body = await request.json();
    const prnEffect = typeof body.prnEffect === "string" ? body.prnEffect.trim() : "";
    if (!prnEffect) return NextResponse.json({ error: "Describe the effect" }, { status: 400 });

    const [row] = await db
      .update(medicationAdministrations)
      .set({ prnEffect, prnEffectAt: new Date() })
      .where(and(
        eq(medicationAdministrations.id, parseInt((await params).eventId)),
        eq(medicationAdministrations.organisationId, orgId),
        isNull(medicationAdministrations.deletedAt),
      ))
      .returning({ id: medicationAdministrations.id });
    if (!row) return NextResponse.json({ error: "Dose not found" }, { status: 404 });
    void logAudit({ organisationId: orgId, userId, userEmail, action: "update", entityType: "medication_administration", entityId: row.id, details: { prnEffect } });
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error updating administration:", error);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

// DELETE { reason } — undo a dose recorded in error (soft delete, reason kept
// in the audit log). The slot becomes due again.
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const authz = await requirePermission(CLINICAL_EDIT);
    if (authz.error) return authz.error;
    const { orgId, userId, userEmail } = authz.ctx;
    const body = await request.json().catch(() => ({}));
    const reason = typeof body.reason === "string" ? body.reason.trim() : "";
    if (!reason) return NextResponse.json({ error: "Say why this entry is being removed" }, { status: 400 });

    const [row] = await db
      .update(medicationAdministrations)
      .set({ deletedAt: new Date() })
      .where(and(
        eq(medicationAdministrations.id, parseInt((await params).eventId)),
        eq(medicationAdministrations.organisationId, orgId),
        isNull(medicationAdministrations.deletedAt),
      ))
      .returning();
    if (!row) return NextResponse.json({ error: "Dose not found" }, { status: 404 });
    void logAudit({
      organisationId: orgId,
      userId,
      userEmail,
      action: "delete",
      entityType: "medication_administration",
      entityId: row.id,
      details: { reason, status: row.status, prescriptionId: row.prescriptionId, scheduledAt: row.scheduledAt, givenAt: row.givenAt },
    });
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error removing administration:", error);
    return NextResponse.json({ error: "Failed to remove" }, { status: 500 });
  }
}

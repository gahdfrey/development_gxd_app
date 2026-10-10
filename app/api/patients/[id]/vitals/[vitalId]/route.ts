import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { vitalSigns } from "@/lib/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { requirePermission } from "@/lib/authz";
import { logAudit } from "@/lib/audit";
import { CLINICAL_EDIT } from "@/lib/clinical/access";

type Params = { params: Promise<{ id: string; vitalId: string }> };

// PATCH { escalatedTo, escalationNote } — record who was informed after the fact.
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const authz = await requirePermission(CLINICAL_EDIT);
    if (authz.error) return authz.error;
    const { orgId, userId, userEmail } = authz.ctx;
    const p = await params;
    const body = await request.json();
    const escalatedTo = typeof body.escalatedTo === "string" && body.escalatedTo.trim() ? body.escalatedTo.trim() : null;
    if (!escalatedTo) return NextResponse.json({ error: "Who did you inform?" }, { status: 400 });

    const [row] = await db
      .update(vitalSigns)
      .set({ escalatedTo, escalationNote: typeof body.escalationNote === "string" && body.escalationNote.trim() ? body.escalationNote.trim() : null })
      .where(and(
        eq(vitalSigns.id, parseInt(p.vitalId)),
        eq(vitalSigns.patientId, parseInt(p.id)),
        eq(vitalSigns.organisationId, orgId),
        isNull(vitalSigns.deletedAt),
      ))
      .returning({ id: vitalSigns.id });
    if (!row) return NextResponse.json({ error: "Observation not found" }, { status: 404 });

    void logAudit({ organisationId: orgId, userId, userEmail, action: "update", entityType: "vital_signs", entityId: row.id, details: { escalatedTo } });
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error updating vitals:", error);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

// DELETE — remove a set entered in error (soft delete).
export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const authz = await requirePermission(CLINICAL_EDIT);
    if (authz.error) return authz.error;
    const { orgId, userId, userEmail } = authz.ctx;
    const p = await params;
    const [row] = await db
      .update(vitalSigns)
      .set({ deletedAt: new Date() })
      .where(and(
        eq(vitalSigns.id, parseInt(p.vitalId)),
        eq(vitalSigns.patientId, parseInt(p.id)),
        eq(vitalSigns.organisationId, orgId),
        isNull(vitalSigns.deletedAt),
      ))
      .returning({ id: vitalSigns.id, score: vitalSigns.score });
    if (!row) return NextResponse.json({ error: "Observation not found" }, { status: 404 });

    void logAudit({ organisationId: orgId, userId, userEmail, action: "delete", entityType: "vital_signs", entityId: row.id, details: { reason: "entered in error" } });
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error deleting vitals:", error);
    return NextResponse.json({ error: "Failed to remove" }, { status: 500 });
  }
}

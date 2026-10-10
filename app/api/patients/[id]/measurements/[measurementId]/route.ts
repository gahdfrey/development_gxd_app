import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { patientMeasurements } from "@/lib/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { requirePermission } from "@/lib/authz";
import { logAudit } from "@/lib/audit";
import { CLINICAL_EDIT } from "@/lib/clinical/access";

// DELETE — remove a reading entered in error (soft delete).
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string; measurementId: string }> }) {
  try {
    const authz = await requirePermission(CLINICAL_EDIT);
    if (authz.error) return authz.error;
    const { orgId, userId, userEmail } = authz.ctx;

    const p = await params;
    const patientId = parseInt(p.id);
    const measurementId = parseInt(p.measurementId);
    if (isNaN(patientId) || isNaN(measurementId)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

    const [removed] = await db
      .update(patientMeasurements)
      .set({ deletedAt: new Date() })
      .where(and(
        eq(patientMeasurements.id, measurementId),
        eq(patientMeasurements.patientId, patientId),
        eq(patientMeasurements.organisationId, orgId),
        isNull(patientMeasurements.deletedAt),
      ))
      .returning({ id: patientMeasurements.id, weightKg: patientMeasurements.weightKg, heightCm: patientMeasurements.heightCm });
    if (!removed) return NextResponse.json({ error: "Reading not found" }, { status: 404 });

    void logAudit({
      organisationId: orgId,
      userId,
      userEmail,
      action: "delete",
      entityType: "patient_measurement",
      entityId: removed.id,
      details: { patientId, weightKg: removed.weightKg, heightCm: removed.heightCm, reason: "entered in error" },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error deleting measurement:", error);
    return NextResponse.json({ error: "Failed to remove reading" }, { status: 500 });
  }
}

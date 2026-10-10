import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { patientCoverages } from "@/lib/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { requirePermission } from "@/lib/authz";
import { logAudit } from "@/lib/audit";
import {
  validateCoverage,
  hmoBelongsToOrg,
  endOtherActiveCoverages,
  syncPatientMirror,
} from "@/lib/billing/coverage";
import { COVERAGE_EDIT } from "@/lib/billing/coverageAccess";

type Params = { params: Promise<{ id: string; coverageId: string }> };

async function findCoverage(orgId: number, p: { id: string; coverageId: string }) {
  const patientId = parseInt(p.id);
  const coverageId = parseInt(p.coverageId);
  if (isNaN(patientId) || isNaN(coverageId)) return null;
  const [row] = await db
    .select()
    .from(patientCoverages)
    .where(and(
      eq(patientCoverages.id, coverageId),
      eq(patientCoverages.patientId, patientId),
      eq(patientCoverages.organisationId, orgId),
      isNull(patientCoverages.deletedAt),
    ))
    .limit(1);
  return row ?? null;
}

// PATCH /api/patients/[id]/coverages/[coverageId] — edit an enrollee record,
// or change its status (suspend / end / reactivate).
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const authz = await requirePermission(COVERAGE_EDIT);
    if (authz.error) return authz.error;
    const { orgId, userId, userEmail } = authz.ctx;

    const existing = await findCoverage(orgId, await params);
    if (!existing) return NextResponse.json({ error: "Coverage not found" }, { status: 404 });

    const body = await request.json();
    const validated = validateCoverage({ ...existing, ...body });
    if ("error" in validated) return NextResponse.json({ error: validated.error }, { status: 400 });
    const fields = validated.value;

    if (fields.hmoId !== existing.hmoId && !(await hmoBelongsToOrg(db, orgId, fields.hmoId))) {
      return NextResponse.json({ error: "HMO not found" }, { status: 404 });
    }

    const updated = await db.transaction(async (tx) => {
      if (fields.status === "active") await endOtherActiveCoverages(tx, existing.patientId, existing.id);
      const [row] = await tx
        .update(patientCoverages)
        .set({ ...fields, updatedAt: new Date() })
        .where(eq(patientCoverages.id, existing.id))
        .returning();
      await syncPatientMirror(tx, existing.patientId);
      return row;
    });

    void logAudit({
      organisationId: orgId,
      userId,
      userEmail,
      action: "update",
      entityType: "patient_coverage",
      entityId: existing.id,
      details: { patientId: existing.patientId, before: { status: existing.status, hmoId: existing.hmoId }, after: fields },
    });

    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    console.error("Error updating coverage:", error);
    return NextResponse.json({ error: "Failed to update coverage" }, { status: 500 });
  }
}

// DELETE /api/patients/[id]/coverages/[coverageId] — remove a coverage entered
// by mistake (soft delete). To record that a patient left an HMO, PATCH the
// status to "ended" instead so the history is kept.
export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const authz = await requirePermission(COVERAGE_EDIT);
    if (authz.error) return authz.error;
    const { orgId, userId, userEmail } = authz.ctx;

    const existing = await findCoverage(orgId, await params);
    if (!existing) return NextResponse.json({ error: "Coverage not found" }, { status: 404 });

    await db.transaction(async (tx) => {
      await tx
        .update(patientCoverages)
        .set({ deletedAt: new Date(), updatedAt: new Date() })
        .where(eq(patientCoverages.id, existing.id));
      await syncPatientMirror(tx, existing.patientId);
    });

    void logAudit({
      organisationId: orgId,
      userId,
      userEmail,
      action: "delete",
      entityType: "patient_coverage",
      entityId: existing.id,
      details: { patientId: existing.patientId, hmoId: existing.hmoId, membershipNumber: existing.membershipNumber },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error deleting coverage:", error);
    return NextResponse.json({ error: "Failed to delete coverage" }, { status: 500 });
  }
}

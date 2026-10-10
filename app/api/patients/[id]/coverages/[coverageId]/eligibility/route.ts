import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { patientCoverages, eligibilityChecks } from "@/lib/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { requirePermission } from "@/lib/authz";
import { logAudit } from "@/lib/audit";
import { ELIGIBILITY_CHANNELS, ELIGIBILITY_RESULTS } from "@/lib/billing/coverage";
import { ELIGIBILITY_LOG } from "@/lib/billing/coverageAccess";

// POST /api/patients/[id]/coverages/[coverageId]/eligibility — record that
// staff verified this enrollee with the HMO (and what the HMO said).
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; coverageId: string }> },
) {
  try {
    const authz = await requirePermission(ELIGIBILITY_LOG);
    if (authz.error) return authz.error;
    const { orgId, userId, userEmail } = authz.ctx;

    const p = await params;
    const patientId = parseInt(p.id);
    const coverageId = parseInt(p.coverageId);
    if (isNaN(patientId) || isNaN(coverageId)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

    const [coverage] = await db
      .select({ id: patientCoverages.id })
      .from(patientCoverages)
      .where(and(
        eq(patientCoverages.id, coverageId),
        eq(patientCoverages.patientId, patientId),
        eq(patientCoverages.organisationId, orgId),
        isNull(patientCoverages.deletedAt),
      ))
      .limit(1);
    if (!coverage) return NextResponse.json({ error: "Coverage not found" }, { status: 404 });

    const body = await request.json();
    if (!(ELIGIBILITY_CHANNELS as readonly string[]).includes(body.channel)) {
      return NextResponse.json({ error: "Select how eligibility was checked" }, { status: 400 });
    }
    if (!(ELIGIBILITY_RESULTS as readonly string[]).includes(body.result)) {
      return NextResponse.json({ error: "Select the HMO's response" }, { status: 400 });
    }
    const reference = typeof body.reference === "string" && body.reference.trim() ? body.reference.trim() : null;
    const notes = typeof body.notes === "string" && body.notes.trim() ? body.notes.trim() : null;
    if (body.result === "not_eligible" && !notes) {
      return NextResponse.json({ error: "Note the reason the HMO gave" }, { status: 400 });
    }

    const [check] = await db
      .insert(eligibilityChecks)
      .values({ organisationId: orgId, coverageId, patientId, channel: body.channel, result: body.result, reference, notes, checkedBy: userId })
      .returning();

    void logAudit({
      organisationId: orgId,
      userId,
      userEmail,
      action: "create",
      entityType: "eligibility_check",
      entityId: check.id,
      details: { patientId, coverageId, channel: check.channel, result: check.result },
    });

    return NextResponse.json(check, { status: 201 });
  } catch (error) {
    console.error("Error logging eligibility check:", error);
    return NextResponse.json({ error: "Failed to log eligibility check" }, { status: 500 });
  }
}

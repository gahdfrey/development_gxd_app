import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { admissions } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { requirePermission } from "@/lib/authz";
import { logAudit } from "@/lib/audit";
import { admissionQuery } from "@/lib/admissions";

/**
 * Turn down a doctor's admission request (no beds, patient sent home, handled
 * as an outpatient…). The row is kept with status "declined" and the reason,
 * so the requesting doctor can see what happened to it.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authz = await requirePermission([["admission", "edit"]]);
    if (authz.error) return authz.error;
    const { orgId, userId: actorId, userEmail: actorEmail } = authz.ctx;

    const { id: idParam } = await params;
    const id = parseInt(idParam);
    if (isNaN(id)) return NextResponse.json({ error: "Invalid admission ID" }, { status: 400 });

    const body = await request.json();
    const { declineReason } = body;

    if (!declineReason?.trim()) {
      return NextResponse.json({ error: "A reason is required to decline a request" }, { status: 400 });
    }

    const [admission] = await db
      .select({ id: admissions.id, status: admissions.status })
      .from(admissions)
      .where(and(eq(admissions.id, id), eq(admissions.organisationId, orgId)))
      .limit(1);

    if (!admission) return NextResponse.json({ error: "Admission request not found" }, { status: 404 });
    if (admission.status !== "requested") {
      return NextResponse.json({ error: "This request has already been actioned" }, { status: 409 });
    }

    await db
      .update(admissions)
      .set({
        status: "declined",
        declineReason: declineReason.trim(),
        declinedBy: actorId,
        declinedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(admissions.id, id));

    const [record] = await admissionQuery().where(eq(admissions.id, id));

    void logAudit({
      organisationId: orgId,
      userId: actorId,
      userEmail: actorEmail,
      action: "decline",
      entityType: "admission_request",
      entityId: id,
      details: { declineReason: declineReason.trim() },
    });

    return NextResponse.json(record, { status: 200 });
  } catch (error) {
    console.error("Error declining admission request:", error);
    return NextResponse.json({ error: "Failed to decline admission request" }, { status: 500 });
  }
}

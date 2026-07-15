import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { patientConsents } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { getAuthContext, hasAnyPermission } from "@/lib/authz";
import { logAudit } from "@/lib/audit";

/**
 * PATCH /api/patients/[id]/consents/[consentId] — withdraw a consent.
 * Body: { action: "withdraw" }
 * Withdrawal must be as easy as granting (NDHA): patients can withdraw their
 * own consents from their portal account; staff can record a withdrawal a
 * patient requested in person. Consent rows are never deleted.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; consentId: string }> },
) {
  try {
    const ctx = await getAuthContext();
    if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: idParam, consentId: consentIdParam } = await params;
    const patientId = parseInt(idParam);
    const consentId = parseInt(consentIdParam);
    if (isNaN(patientId) || isNaN(consentId)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const isOwnRecord = ctx.patientId === patientId;
    const isStaff = hasAnyPermission(ctx, [
      ["patients", "edit"],
      ["dashboard", "edit"],
    ]);
    if (!isOwnRecord && !isStaff) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    if (body?.action !== "withdraw") {
      return NextResponse.json(
        { error: "Unsupported action. Only { action: \"withdraw\" } is allowed." },
        { status: 400 },
      );
    }

    const [updated] = await db
      .update(patientConsents)
      .set({
        status: "withdrawn",
        withdrawnAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(
        eq(patientConsents.id, consentId),
        eq(patientConsents.patientId, patientId),
        eq(patientConsents.organisationId, ctx.orgId),
        eq(patientConsents.status, "granted"),
      ))
      .returning();

    if (!updated) {
      return NextResponse.json(
        { error: "Consent not found or already withdrawn" },
        { status: 404 },
      );
    }

    void logAudit({
      organisationId: ctx.orgId,
      userId: ctx.userId,
      userEmail: ctx.userEmail,
      action: "consent.withdrawn",
      entityType: "patient_consent",
      entityId: consentId,
      details: { patientId, purpose: updated.purpose, selfService: isOwnRecord },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error withdrawing consent:", error);
    return NextResponse.json({ error: "Failed to withdraw consent" }, { status: 500 });
  }
}

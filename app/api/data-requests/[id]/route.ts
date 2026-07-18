import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { dataRequests } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { requirePermission } from "@/lib/authz";
import { logAudit } from "@/lib/audit";

const VALID_STATUSES = ["resolved", "rejected"];

/**
 * PATCH /api/data-requests/[id] — staff resolve or reject a data request.
 * Body: { status: "resolved" | "rejected", resolutionNote? }
 * This records the decision; any actual data change (correcting a field, or
 * erasing/soft-deleting the patient) is performed through the normal patient
 * screens so it is itself audited.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authz = await requirePermission([["data-requests", "edit"]]);
    if (authz.error) return authz.error;
    const { orgId, userId: actorId, userEmail: actorEmail } = authz.ctx;

    const { id: idParam } = await params;
    const id = parseInt(idParam);
    if (isNaN(id)) return NextResponse.json({ error: "Invalid request ID" }, { status: 400 });

    const body = await request.json();
    const { status, resolutionNote } = body;

    if (!status || !VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: `status must be one of: ${VALID_STATUSES.join(", ")}` },
        { status: 400 },
      );
    }

    const [updated] = await db
      .update(dataRequests)
      .set({
        status,
        resolutionNote: resolutionNote?.trim() || null,
        resolvedBy: actorId,
        resolvedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(
        eq(dataRequests.id, id),
        eq(dataRequests.organisationId, orgId),
        eq(dataRequests.status, "pending"),
      ))
      .returning();

    if (!updated) {
      return NextResponse.json(
        { error: "Request not found or already handled." },
        { status: 404 },
      );
    }

    void logAudit({
      organisationId: orgId,
      userId: actorId,
      userEmail: actorEmail,
      action: `data_request.${status}`,
      entityType: "data_request",
      entityId: id,
      details: { patientId: updated.patientId, type: updated.type },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating data request:", error);
    return NextResponse.json({ error: "Failed to update data request" }, { status: 500 });
  }
}

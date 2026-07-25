import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { beds } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { requirePermission } from "@/lib/authz";
import { logAudit } from "@/lib/audit";
import { getPgErrorCode } from "@/lib/db/pg-error";

const VALID_STATUSES = ["available", "occupied", "maintenance"];

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authz = await requirePermission([["admission", "edit"]]);
    if (authz.error) return authz.error;
    const { orgId, userId: actorId, userEmail: actorEmail } = authz.ctx;

    const { id: idParam } = await params;
    const id = parseInt(idParam);
    if (isNaN(id)) return NextResponse.json({ error: "Invalid bed ID" }, { status: 400 });

    const body = await request.json();
    const { bedNumber, status } = body;

    const [existing] = await db
      .select()
      .from(beds)
      .where(and(eq(beds.id, id), eq(beds.organisationId, orgId), isNull(beds.deletedAt)));
    if (!existing) return NextResponse.json({ error: "Bed not found" }, { status: 404 });

    // A bed's occupied/available status is normally driven by admit/discharge/
    // transfer, not edited directly — only allow manually toggling it when
    // it isn't currently occupied by a patient (i.e. marking maintenance on
    // vs. off), to avoid silently orphaning an active admission's bed link.
    if (status && status !== existing.status && existing.status === "occupied") {
      return NextResponse.json(
        { error: "This bed is currently occupied. Discharge or transfer the patient before changing its status." },
        { status: 409 },
      );
    }
    if (status && !VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: "Invalid bed status" }, { status: 400 });
    }

    const [updated] = await db
      .update(beds)
      .set({
        bedNumber: bedNumber?.trim() || existing.bedNumber,
        status: status || existing.status,
        updatedAt: new Date(),
      })
      .where(eq(beds.id, id))
      .returning();

    void logAudit({
      organisationId: orgId,
      userId: actorId,
      userEmail: actorEmail,
      action: "update",
      entityType: "bed",
      entityId: id,
      details: { bedNumber: updated.bedNumber, status: updated.status },
    });

    return NextResponse.json(updated, { status: 200 });
  } catch (error: any) {
    console.error("Error updating bed:", error);
    if (getPgErrorCode(error) === "23505") return NextResponse.json({ error: "A bed with this number already exists in this ward" }, { status: 409 });
    return NextResponse.json({ error: "Failed to update bed" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authz = await requirePermission([["admission", "delete"]]);
    if (authz.error) return authz.error;
    const { orgId, userId: actorId, userEmail: actorEmail } = authz.ctx;

    const { id: idParam } = await params;
    const id = parseInt(idParam);
    if (isNaN(id)) return NextResponse.json({ error: "Invalid bed ID" }, { status: 400 });

    const [target] = await db
      .select({ id: beds.id, bedNumber: beds.bedNumber, status: beds.status })
      .from(beds)
      .where(and(eq(beds.id, id), eq(beds.organisationId, orgId), isNull(beds.deletedAt)));

    if (!target) return NextResponse.json({ error: "Bed not found" }, { status: 404 });
    if (target.status === "occupied") {
      return NextResponse.json({ error: "Cannot delete an occupied bed" }, { status: 409 });
    }

    await db
      .update(beds)
      .set({ deletedAt: new Date(), bedNumber: `${target.bedNumber}__deleted_${Date.now()}`, updatedAt: new Date() })
      .where(eq(beds.id, id));

    void logAudit({
      organisationId: orgId,
      userId: actorId,
      userEmail: actorEmail,
      action: "delete",
      entityType: "bed",
      entityId: id,
      details: { bedNumber: target.bedNumber, softDelete: true },
    });

    return NextResponse.json({ message: "Bed deleted successfully" }, { status: 200 });
  } catch (error) {
    console.error("Error deleting bed:", error);
    return NextResponse.json({ error: "Failed to delete bed" }, { status: 500 });
  }
}

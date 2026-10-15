import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { referrers } from "@/lib/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { requirePermission } from "@/lib/authz";
import { logAudit } from "@/lib/audit";
import { parseReferrerInput } from "@/lib/referrals";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authz = await requirePermission([["setup", "edit"]]);
    if (authz.error) return authz.error;
    const { orgId, userId: actorId, userEmail: actorEmail } = authz.ctx;

    const id = parseInt((await params).id);
    if (isNaN(id)) return NextResponse.json({ error: "Invalid referrer ID" }, { status: 400 });

    const parsed = parseReferrerInput(await request.json());
    if (!parsed.data) return NextResponse.json({ error: parsed.error }, { status: 400 });

    const [updated] = await db
      .update(referrers)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(and(eq(referrers.id, id), eq(referrers.organisationId, orgId), isNull(referrers.deletedAt)))
      .returning();

    if (!updated) return NextResponse.json({ error: "Referrer not found" }, { status: 404 });

    void logAudit({
      organisationId: orgId,
      userId: actorId,
      userEmail: actorEmail,
      action: "update",
      entityType: "referrer",
      entityId: id,
      details: { code: updated.code, name: updated.name },
    });

    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    console.error("Error updating referrer:", error);
    return NextResponse.json({ error: "Failed to update referrer" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authz = await requirePermission([["setup", "delete"], ["setup", "edit"]]);
    if (authz.error) return authz.error;
    const { orgId, userId: actorId, userEmail: actorEmail } = authz.ctx;

    const id = parseInt((await params).id);
    if (isNaN(id)) return NextResponse.json({ error: "Invalid referrer ID" }, { status: 400 });

    // Soft delete: patients already referred keep their referrer and history.
    const [deleted] = await db
      .update(referrers)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(referrers.id, id), eq(referrers.organisationId, orgId), isNull(referrers.deletedAt)))
      .returning();

    if (!deleted) return NextResponse.json({ error: "Referrer not found" }, { status: 404 });

    void logAudit({
      organisationId: orgId,
      userId: actorId,
      userEmail: actorEmail,
      action: "delete",
      entityType: "referrer",
      entityId: id,
      details: { code: deleted.code, name: deleted.name, softDelete: true },
    });

    return NextResponse.json({ message: "Referrer deleted successfully" }, { status: 200 });
  } catch (error) {
    console.error("Error deleting referrer:", error);
    return NextResponse.json({ error: "Failed to delete referrer" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { wards, beds } from "@/lib/db/schema";
import { eq, and, isNull, count } from "drizzle-orm";
import { requirePermission } from "@/lib/authz";
import { logAudit } from "@/lib/audit";

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
    if (isNaN(id)) return NextResponse.json({ error: "Invalid ward ID" }, { status: 400 });

    const body = await request.json();
    const { name, departmentId } = body;

    if (!name || name.trim() === "") {
      return NextResponse.json({ error: "Ward name is required" }, { status: 400 });
    }

    const [updated] = await db
      .update(wards)
      .set({
        name: name.trim(),
        departmentId: departmentId ? parseInt(departmentId) : null,
        updatedAt: new Date(),
      })
      .where(and(eq(wards.id, id), eq(wards.organisationId, orgId), isNull(wards.deletedAt)))
      .returning();

    if (!updated) return NextResponse.json({ error: "Ward not found" }, { status: 404 });

    void logAudit({
      organisationId: orgId,
      userId: actorId,
      userEmail: actorEmail,
      action: "update",
      entityType: "ward",
      entityId: id,
      details: { name: updated.name },
    });

    return NextResponse.json(updated, { status: 200 });
  } catch (error: any) {
    console.error("Error updating ward:", error);
    if (error.code === "23505") return NextResponse.json({ error: "A ward with this name already exists" }, { status: 409 });
    return NextResponse.json({ error: "Failed to update ward" }, { status: 500 });
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
    if (isNaN(id)) return NextResponse.json({ error: "Invalid ward ID" }, { status: 400 });

    const [{ value: linkedBeds }] = await db
      .select({ value: count() })
      .from(beds)
      .where(and(eq(beds.wardId, id), isNull(beds.deletedAt)));

    if (linkedBeds > 0) {
      return NextResponse.json(
        { error: "Cannot delete ward — it still has beds. Remove its beds first." },
        { status: 409 },
      );
    }

    const [target] = await db
      .select({ id: wards.id, name: wards.name })
      .from(wards)
      .where(and(eq(wards.id, id), eq(wards.organisationId, orgId), isNull(wards.deletedAt)));

    if (!target) return NextResponse.json({ error: "Ward not found" }, { status: 404 });

    await db
      .update(wards)
      .set({ deletedAt: new Date(), name: `${target.name}__deleted_${Date.now()}`, updatedAt: new Date() })
      .where(eq(wards.id, id));

    void logAudit({
      organisationId: orgId,
      userId: actorId,
      userEmail: actorEmail,
      action: "delete",
      entityType: "ward",
      entityId: id,
      details: { name: target.name, softDelete: true },
    });

    return NextResponse.json({ message: "Ward deleted successfully" }, { status: 200 });
  } catch (error) {
    console.error("Error deleting ward:", error);
    return NextResponse.json({ error: "Failed to delete ward" }, { status: 500 });
  }
}

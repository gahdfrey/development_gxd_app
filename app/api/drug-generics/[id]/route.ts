import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { drugGenerics } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { requirePermission } from "@/lib/authz";
import { logAudit } from "@/lib/audit";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authz = await requirePermission([["products", "edit"], ["setup", "edit"]]);
    if (authz.error) return authz.error;
    const { orgId, userId: actorId, userEmail: actorEmail } = authz.ctx;

    const { id: idStr } = await params;
    const id = parseInt(idStr);
    if (isNaN(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

    const body = await request.json();
    const { name, strength, form } = body;

    if (name !== undefined && !name.trim()) return NextResponse.json({ error: "Active ingredient name is required" }, { status: 400 });
    if (strength !== undefined && !strength.trim()) return NextResponse.json({ error: "Strength is required" }, { status: 400 });

    const [updated] = await db
      .update(drugGenerics)
      .set({
        ...(name !== undefined && { name: name.trim() }),
        ...(strength !== undefined && { strength: strength.trim() }),
        ...(form !== undefined && { form: form?.trim() || null }),
        updatedAt: new Date(),
      })
      .where(and(eq(drugGenerics.id, id), eq(drugGenerics.organisationId, orgId), isNull(drugGenerics.deletedAt)))
      .returning();

    if (!updated) return NextResponse.json({ error: "Active ingredient not found" }, { status: 404 });

    void logAudit({
      organisationId: orgId,
      userId: actorId,
      userEmail: actorEmail,
      action: "update",
      entityType: "drug_generic",
      entityId: id,
      details: { name: updated.name, strength: updated.strength },
    });

    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    console.error("Error updating drug generic:", error);
    return NextResponse.json({ error: "Failed to update drug generic" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authz = await requirePermission([["products", "delete"], ["setup", "delete"], ["setup", "edit"]]);
    if (authz.error) return authz.error;
    const { orgId, userId: actorId, userEmail: actorEmail } = authz.ctx;

    const { id: idStr } = await params;
    const id = parseInt(idStr);
    if (isNaN(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

    // Soft delete: brands (products) and historical prescriptions keep their reference.
    const [deleted] = await db
      .update(drugGenerics)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(drugGenerics.id, id), eq(drugGenerics.organisationId, orgId), isNull(drugGenerics.deletedAt)))
      .returning();

    if (!deleted) return NextResponse.json({ error: "Active ingredient not found" }, { status: 404 });

    void logAudit({
      organisationId: orgId,
      userId: actorId,
      userEmail: actorEmail,
      action: "delete",
      entityType: "drug_generic",
      entityId: id,
      details: { name: deleted.name, softDelete: true },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error deleting drug generic:", error);
    return NextResponse.json({ error: "Failed to delete drug generic" }, { status: 500 });
  }
}

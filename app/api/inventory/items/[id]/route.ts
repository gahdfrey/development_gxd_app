import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { inventoryItems } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { requirePermission } from "@/lib/authz";
import { logAudit } from "@/lib/audit";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authz = await requirePermission([["supply-orders", "edit"], ["setup", "edit"]]);
    if (authz.error) return authz.error;
    const { orgId, userId: actorId, userEmail: actorEmail } = authz.ctx;

    const { id: idStr } = await params;
    const id = parseInt(idStr);
    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid item ID" }, { status: 400 });
    }

    const body = await request.json();
    const { name, description, unit, quantity, reorderLevel } = body;

    const [updated] = await db
      .update(inventoryItems)
      .set({
        ...(name !== undefined && { name: name.trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(unit !== undefined && { unit: unit.trim() }),
        ...(quantity !== undefined && { quantity }),
        ...(reorderLevel !== undefined && { reorderLevel }),
        updatedAt: new Date(),
      })
      .where(and(eq(inventoryItems.id, id), eq(inventoryItems.organisationId, orgId), isNull(inventoryItems.deletedAt)))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    void logAudit({
      organisationId: orgId,
      userId: actorId,
      userEmail: actorEmail,
      action: "update",
      entityType: "inventory_item",
      entityId: id,
      details: { name: updated.name, quantityChanged: quantity !== undefined },
    });

    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    console.error("Error updating inventory item:", error);
    return NextResponse.json({ error: "Failed to update inventory item" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authz = await requirePermission([["supply-orders", "delete"], ["setup", "delete"], ["setup", "edit"]]);
    if (authz.error) return authz.error;
    const { orgId, userId: actorId, userEmail: actorEmail } = authz.ctx;

    const { id: idStr } = await params;
    const id = parseInt(idStr);
    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid item ID" }, { status: 400 });
    }

    // Soft delete: existing supply-order items keep their reference.
    const [deleted] = await db
      .update(inventoryItems)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(inventoryItems.id, id), eq(inventoryItems.organisationId, orgId), isNull(inventoryItems.deletedAt)))
      .returning();

    if (!deleted) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    void logAudit({
      organisationId: orgId,
      userId: actorId,
      userEmail: actorEmail,
      action: "delete",
      entityType: "inventory_item",
      entityId: id,
      details: { name: deleted.name, softDelete: true },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: unknown) {
    console.error("Error deleting inventory item:", error);
    return NextResponse.json({ error: "Failed to delete inventory item" }, { status: 500 });
  }
}

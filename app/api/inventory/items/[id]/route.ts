import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { inventoryItems } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getOrgId } from "@/lib/org";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const orgId = await getOrgId();
    if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
      .where(and(eq(inventoryItems.id, id), eq(inventoryItems.organisationId, orgId)))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

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
    const orgId = await getOrgId();
    if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: idStr } = await params;
    const id = parseInt(idStr);
    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid item ID" }, { status: 400 });
    }

    const [deleted] = await db
      .delete(inventoryItems)
      .where(and(eq(inventoryItems.id, id), eq(inventoryItems.organisationId, orgId)))
      .returning();

    if (!deleted) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: unknown) {
    console.error("Error deleting inventory item:", error);
    if ((error as { code?: string }).code === "23503") {
      return NextResponse.json(
        { error: "Cannot delete item — it is referenced by existing supply orders" },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: "Failed to delete inventory item" }, { status: 500 });
  }
}

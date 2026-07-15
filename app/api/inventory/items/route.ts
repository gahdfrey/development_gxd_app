import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { inventoryItems } from "@/lib/db/schema";
import { asc, ilike, eq, and, isNull } from "drizzle-orm";
import { requireAuth, requirePermission } from "@/lib/authz";
import { logAudit } from "@/lib/audit";

export async function GET(request: NextRequest) {
  try {
    const authz = await requireAuth();
    if (authz.error) return authz.error;
    const orgId = authz.ctx.orgId;

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");

    const conditions: any[] = [eq(inventoryItems.organisationId, orgId), isNull(inventoryItems.deletedAt)];
    if (search) conditions.push(ilike(inventoryItems.name, `%${search}%`));

    const rows = await db.select().from(inventoryItems)
      .where(and(...conditions))
      .orderBy(asc(inventoryItems.name));

    return NextResponse.json(rows, { status: 200 });
  } catch (error) {
    console.error("Error fetching inventory items:", error);
    return NextResponse.json({ error: "Failed to fetch inventory items" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authz = await requirePermission([["supply-orders", "add"], ["setup", "edit"]]);
    if (authz.error) return authz.error;
    const { orgId, userId: actorId, userEmail: actorEmail } = authz.ctx;

    const body = await request.json();
    const { name, description, unit, quantity, reorderLevel } = body;

    if (!name?.trim() || !unit?.trim()) {
      return NextResponse.json({ error: "Name and unit are required" }, { status: 400 });
    }

    const [item] = await db.insert(inventoryItems).values({
      organisationId: orgId,
      name: name.trim(),
      description: description?.trim() || null,
      unit: unit.trim(),
      quantity: quantity ?? 0,
      reorderLevel: reorderLevel ?? 10,
    }).returning();

    void logAudit({
      organisationId: orgId,
      userId: actorId,
      userEmail: actorEmail,
      action: "create",
      entityType: "inventory_item",
      entityId: item.id,
      details: { name: item.name, unit: item.unit },
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error("Error creating inventory item:", error);
    return NextResponse.json({ error: "Failed to create inventory item" }, { status: 500 });
  }
}

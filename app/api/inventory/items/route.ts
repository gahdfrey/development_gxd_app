import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { inventoryItems } from "@/lib/db/schema";
import { asc, ilike, eq, and } from "drizzle-orm";
import { getOrgId } from "@/lib/org";

export async function GET(request: NextRequest) {
  try {
    const orgId = await getOrgId();
    if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");

    const conditions: any[] = [eq(inventoryItems.organisationId, orgId)];
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
    const orgId = await getOrgId();
    if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error("Error creating inventory item:", error);
    return NextResponse.json({ error: "Failed to create inventory item" }, { status: 500 });
  }
}

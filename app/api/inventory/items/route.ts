import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { inventoryItems } from "@/lib/db/schema";
import { asc, ilike } from "drizzle-orm";

// GET /api/inventory/items
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");

    const query = db.select().from(inventoryItems);

    const rows = search
      ? await query.where(ilike(inventoryItems.name, `%${search}%`)).orderBy(asc(inventoryItems.name))
      : await query.orderBy(asc(inventoryItems.name));

    return NextResponse.json(rows, { status: 200 });
  } catch (error) {
    console.error("Error fetching inventory items:", error);
    return NextResponse.json({ error: "Failed to fetch inventory items" }, { status: 500 });
  }
}

// POST /api/inventory/items
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, unit, quantity, reorderLevel } = body;

    if (!name?.trim() || !unit?.trim()) {
      return NextResponse.json({ error: "Name and unit are required" }, { status: 400 });
    }

    const [item] = await db
      .insert(inventoryItems)
      .values({
        name: name.trim(),
        description: description?.trim() || null,
        unit: unit.trim(),
        quantity: quantity ?? 0,
        reorderLevel: reorderLevel ?? 10,
      })
      .returning();

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error("Error creating inventory item:", error);
    return NextResponse.json({ error: "Failed to create inventory item" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { products } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";

const VALID_CATEGORIES = ["pharmacy", "laboratory", "radiology", "general"];

// GET /api/products/[id]
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idStr } = await params;
    const id = parseInt(idStr);
    if (isNaN(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

    const [product] = await db
      .select({
        id: products.id,
        name: products.name,
        description: products.description,
        category: products.category,
        casesInStock: products.casesInStock,
        unitsPerCase: products.unitsPerCase,
        looseUnitsInStock: products.looseUnitsInStock,
        reorderLevel: products.reorderLevel,
        price: products.price,
        totalUnits: sql<number>`(${products.casesInStock} * ${products.unitsPerCase}) + ${products.looseUnitsInStock}`,
        createdAt: products.createdAt,
        updatedAt: products.updatedAt,
      })
      .from(products)
      .where(eq(products.id, id));

    if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });
    return NextResponse.json(product, { status: 200 });
  } catch (error) {
    console.error("Error fetching product:", error);
    return NextResponse.json({ error: "Failed to fetch product" }, { status: 500 });
  }
}

// PATCH /api/products/[id]
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idStr } = await params;
    const id = parseInt(idStr);
    if (isNaN(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

    const body = await request.json();
    const { name, description, category, casesInStock, unitsPerCase, looseUnitsInStock, reorderLevel, price } = body;

    if (unitsPerCase !== undefined && unitsPerCase < 1) {
      return NextResponse.json({ error: "Units per case must be at least 1" }, { status: 400 });
    }
    if (price !== undefined && (isNaN(price) || price < 0)) {
      return NextResponse.json({ error: "Price must be a positive number" }, { status: 400 });
    }
    if (category !== undefined && !VALID_CATEGORIES.includes(category)) {
      return NextResponse.json({ error: "Invalid category" }, { status: 400 });
    }

    const [updated] = await db
      .update(products)
      .set({
        ...(name !== undefined && { name: name.trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(category !== undefined && { category }),
        ...(casesInStock !== undefined && { casesInStock }),
        ...(unitsPerCase !== undefined && { unitsPerCase }),
        ...(looseUnitsInStock !== undefined && { looseUnitsInStock }),
        ...(reorderLevel !== undefined && { reorderLevel }),
        ...(price !== undefined && { price }),
        updatedAt: new Date(),
      })
      .where(eq(products.id, id))
      .returning();

    if (!updated) return NextResponse.json({ error: "Product not found" }, { status: 404 });
    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    console.error("Error updating product:", error);
    return NextResponse.json({ error: "Failed to update product" }, { status: 500 });
  }
}

// DELETE /api/products/[id]
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idStr } = await params;
    const id = parseInt(idStr);
    if (isNaN(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

    const [deleted] = await db
      .delete(products)
      .where(eq(products.id, id))
      .returning();

    if (!deleted) return NextResponse.json({ error: "Product not found" }, { status: 404 });
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error deleting product:", error);
    return NextResponse.json({ error: "Failed to delete product" }, { status: 500 });
  }
}

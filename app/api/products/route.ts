import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { products } from "@/lib/db/schema";
import { asc, ilike, sql } from "drizzle-orm";

// GET /api/products
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");

    const query = db
      .select({
        id: products.id,
        name: products.name,
        description: products.description,
        casesInStock: products.casesInStock,
        unitsPerCase: products.unitsPerCase,
        looseUnitsInStock: products.looseUnitsInStock,
        reorderLevel: products.reorderLevel,
        totalUnits: sql<number>`(${products.casesInStock} * ${products.unitsPerCase}) + ${products.looseUnitsInStock}`,
        createdAt: products.createdAt,
        updatedAt: products.updatedAt,
      })
      .from(products);

    const rows = search
      ? await query
          .where(ilike(products.name, `%${search}%`))
          .orderBy(asc(products.name))
      : await query.orderBy(asc(products.name));

    return NextResponse.json(rows, { status: 200 });
  } catch (error) {
    console.error("Error fetching products:", error);
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
  }
}

// POST /api/products
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, casesInStock, unitsPerCase, looseUnitsInStock, reorderLevel } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: "Product name is required" }, { status: 400 });
    }
    if (!unitsPerCase || unitsPerCase < 1) {
      return NextResponse.json({ error: "Units per case must be at least 1" }, { status: 400 });
    }

    const [product] = await db
      .insert(products)
      .values({
        name: name.trim(),
        description: description?.trim() || null,
        casesInStock: casesInStock ?? 0,
        unitsPerCase,
        looseUnitsInStock: looseUnitsInStock ?? 0,
        reorderLevel: reorderLevel ?? 20,
      })
      .returning();

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error("Error creating product:", error);
    return NextResponse.json({ error: "Failed to create product" }, { status: 500 });
  }
}

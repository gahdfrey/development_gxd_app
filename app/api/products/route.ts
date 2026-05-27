import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { products } from "@/lib/db/schema";
import { asc, ilike, eq, and, sql, SQL } from "drizzle-orm";

// GET /api/products
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const category = searchParams.get("category"); // optional filter
    const prescribable = searchParams.get("prescribable"); // "true" = drugs only

    const conditions: SQL[] = [];
    if (search) conditions.push(ilike(products.name, `%${search}%`));
    if (category && category !== "all") conditions.push(eq(products.category, category));
    if (prescribable === "true") conditions.push(eq(products.isPrescribable, true));

    const query = db
      .select({
        id: products.id,
        name: products.name,
        description: products.description,
        category: products.category,
        isPrescribable: products.isPrescribable,
        casesInStock: products.casesInStock,
        unitsPerCase: products.unitsPerCase,
        looseUnitsInStock: products.looseUnitsInStock,
        reorderLevel: products.reorderLevel,
        price: products.price,
        totalUnits: sql<number>`(${products.casesInStock} * ${products.unitsPerCase}) + ${products.looseUnitsInStock}`,
        createdAt: products.createdAt,
        updatedAt: products.updatedAt,
      })
      .from(products);

    const rows = conditions.length
      ? await query.where(and(...conditions)).orderBy(asc(products.name))
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
    const { name, description, category, casesInStock, unitsPerCase, looseUnitsInStock, reorderLevel, price, isPrescribable } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: "Product name is required" }, { status: 400 });
    }
    if (!unitsPerCase || unitsPerCase < 1) {
      return NextResponse.json({ error: "Units per case must be at least 1" }, { status: 400 });
    }
    if (price !== undefined && (isNaN(price) || price < 0)) {
      return NextResponse.json({ error: "Price must be a positive number" }, { status: 400 });
    }

    const VALID_CATEGORIES = ["pharmacy", "laboratory", "radiology", "general"];
    if (category && !VALID_CATEGORIES.includes(category)) {
      return NextResponse.json({ error: "Invalid category" }, { status: 400 });
    }

    const [product] = await db
      .insert(products)
      .values({
        name: name.trim(),
        description: description?.trim() || null,
        category: category ?? "general",
        isPrescribable: isPrescribable ?? false,
        casesInStock: casesInStock ?? 0,
        unitsPerCase,
        looseUnitsInStock: looseUnitsInStock ?? 0,
        reorderLevel: reorderLevel ?? 20,
        price: price ?? 0,
      })
      .returning();

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error("Error creating product:", error);
    return NextResponse.json({ error: "Failed to create product" }, { status: 500 });
  }
}

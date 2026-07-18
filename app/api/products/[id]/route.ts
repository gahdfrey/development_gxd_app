import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { products } from "@/lib/db/schema";
import { eq, and, sql, isNull } from "drizzle-orm";
import { requireAuth, requirePermission } from "@/lib/authz";
import { logAudit } from "@/lib/audit";

const VALID_CATEGORIES = ["pharmacy", "laboratory", "radiology", "general"];

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authz = await requireAuth();
    if (authz.error) return authz.error;
    const orgId = authz.ctx.orgId;

    const { id: idStr } = await params;
    const id = parseInt(idStr);
    if (isNaN(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

    const [product] = await db
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
      .from(products)
      .where(and(eq(products.id, id), eq(products.organisationId, orgId), isNull(products.deletedAt)));

    if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });
    return NextResponse.json(product, { status: 200 });
  } catch (error) {
    console.error("Error fetching product:", error);
    return NextResponse.json({ error: "Failed to fetch product" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Edited from the product-inventory screen ("products" module) and the
    // org setup screen ("setup" module).
    const authz = await requirePermission([["products", "edit"], ["setup", "edit"]]);
    if (authz.error) return authz.error;
    const { orgId, userId: actorId, userEmail: actorEmail } = authz.ctx;

    const { id: idStr } = await params;
    const id = parseInt(idStr);
    if (isNaN(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

    const body = await request.json();
    const { name, description, category, casesInStock, unitsPerCase, looseUnitsInStock, reorderLevel, price, isPrescribable } = body;

    if (unitsPerCase !== undefined && unitsPerCase < 1) {
      return NextResponse.json({ error: "Units per case must be at least 1" }, { status: 400 });
    }
    if (price !== undefined && (isNaN(price) || price < 0)) {
      return NextResponse.json({ error: "Price must be a positive number" }, { status: 400 });
    }
    if (category !== undefined && !VALID_CATEGORIES.includes(category)) {
      return NextResponse.json({ error: "Invalid category" }, { status: 400 });
    }
    if (casesInStock !== undefined && (isNaN(casesInStock) || casesInStock < 0)) {
      return NextResponse.json({ error: "Cases in stock cannot be negative" }, { status: 400 });
    }
    if (looseUnitsInStock !== undefined && (isNaN(looseUnitsInStock) || looseUnitsInStock < 0)) {
      return NextResponse.json({ error: "Loose units cannot be negative" }, { status: 400 });
    }

    // Normalize loose units into whole cases when they reach/exceed a full
    // case (e.g. 43 loose at 20 units/case → +2 cases, 3 loose). Done here so
    // stock is always stored canonically, regardless of how it was entered.
    let normalizedCases = casesInStock;
    let normalizedLoose = looseUnitsInStock;
    if (looseUnitsInStock !== undefined) {
      // unitsPerCase and the base case count may not be in this request —
      // fall back to the product's current values.
      let effectiveUnitsPerCase = unitsPerCase;
      let baseCases = casesInStock;
      if (effectiveUnitsPerCase === undefined || baseCases === undefined) {
        const [current] = await db
          .select({ unitsPerCase: products.unitsPerCase, casesInStock: products.casesInStock })
          .from(products)
          .where(and(eq(products.id, id), eq(products.organisationId, orgId), isNull(products.deletedAt)));
        if (!current) return NextResponse.json({ error: "Product not found" }, { status: 404 });
        if (effectiveUnitsPerCase === undefined) effectiveUnitsPerCase = current.unitsPerCase;
        if (baseCases === undefined) baseCases = current.casesInStock;
      }

      if (effectiveUnitsPerCase >= 1 && looseUnitsInStock >= effectiveUnitsPerCase) {
        normalizedCases = baseCases + Math.floor(looseUnitsInStock / effectiveUnitsPerCase);
        normalizedLoose = looseUnitsInStock % effectiveUnitsPerCase;
      } else {
        normalizedCases = baseCases;
        normalizedLoose = looseUnitsInStock;
      }
    }

    const [updated] = await db
      .update(products)
      .set({
        ...(name !== undefined && { name: name.trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(category !== undefined && { category }),
        // When loose units are being set, write the normalized case/loose pair;
        // otherwise fall back to a cases-only update.
        ...(looseUnitsInStock !== undefined
          ? { casesInStock: normalizedCases, looseUnitsInStock: normalizedLoose }
          : casesInStock !== undefined && { casesInStock }),
        ...(unitsPerCase !== undefined && { unitsPerCase }),
        ...(reorderLevel !== undefined && { reorderLevel }),
        ...(price !== undefined && { price }),
        ...(isPrescribable !== undefined && { isPrescribable }),
        updatedAt: new Date(),
      })
      .where(and(eq(products.id, id), eq(products.organisationId, orgId), isNull(products.deletedAt)))
      .returning();

    if (!updated) return NextResponse.json({ error: "Product not found" }, { status: 404 });

    void logAudit({
      organisationId: orgId,
      userId: actorId,
      userEmail: actorEmail,
      action: "update",
      entityType: "product",
      entityId: id,
      details: {
        name: updated.name,
        stockChanged: casesInStock !== undefined || looseUnitsInStock !== undefined,
        priceChanged: price !== undefined,
      },
    });

    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    console.error("Error updating product:", error);
    return NextResponse.json({ error: "Failed to update product" }, { status: 500 });
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

    // Soft delete: prescriptions and supply-order items keep their reference.
    const [deleted] = await db
      .update(products)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(products.id, id), eq(products.organisationId, orgId), isNull(products.deletedAt)))
      .returning();

    if (!deleted) return NextResponse.json({ error: "Product not found" }, { status: 404 });

    void logAudit({
      organisationId: orgId,
      userId: actorId,
      userEmail: actorEmail,
      action: "delete",
      entityType: "product",
      entityId: id,
      details: { name: deleted.name, softDelete: true },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error deleting product:", error);
    return NextResponse.json({ error: "Failed to delete product" }, { status: 500 });
  }
}

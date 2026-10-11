import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { priceLists, priceListItems, labTests, products, serviceItems, wards, vaccines } from "@/lib/db/schema";
import { and, eq, isNull, inArray, sql } from "drizzle-orm";
import { requirePermission } from "@/lib/authz";
import { logAudit } from "@/lib/audit";

type CatalogType = "lab_test" | "product" | "service" | "ward_bed" | "vaccine";
const CATALOG_TYPES: CatalogType[] = ["lab_test", "product", "service", "ward_bed", "vaccine"];

interface LineInput {
  itemType: CatalogType;
  itemId: number;
  price: number;
  coverage: "covered" | "excluded";
  copayPercent: number;
  requiresAuthorization: boolean;
}

// PUT /api/price-lists/[id]/items — bulk save tariff lines.
// Body: { upsert: LineInput[], remove: { itemType, itemId }[] }
// Removing a line makes the service "not listed" (patient pays self-pay).
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authz = await requirePermission([["finance", "edit"]]);
    if (authz.error) return authz.error;
    const { orgId, userId, userEmail } = authz.ctx;

    const { id: idParam } = await params;
    const listId = parseInt(idParam);
    if (isNaN(listId)) return NextResponse.json({ error: "Invalid price list ID" }, { status: 400 });

    const [list] = await db
      .select({ id: priceLists.id })
      .from(priceLists)
      .where(and(eq(priceLists.id, listId), eq(priceLists.organisationId, orgId), isNull(priceLists.deletedAt)))
      .limit(1);
    if (!list) return NextResponse.json({ error: "Price list not found" }, { status: 404 });

    const body = await request.json();
    const upsert: LineInput[] = Array.isArray(body.upsert) ? body.upsert : [];
    const remove: { itemType: CatalogType; itemId: number }[] = Array.isArray(body.remove) ? body.remove : [];

    for (const l of upsert) {
      if (!CATALOG_TYPES.includes(l.itemType) || !Number.isInteger(l.itemId)) {
        return NextResponse.json({ error: "Invalid item" }, { status: 400 });
      }
      if (!Number.isInteger(l.price) || l.price < 0) {
        return NextResponse.json({ error: "Tariff prices must be whole Naira amounts of 0 or more" }, { status: 400 });
      }
      if (!["covered", "excluded"].includes(l.coverage)) {
        return NextResponse.json({ error: "Invalid coverage" }, { status: 400 });
      }
      if (!Number.isInteger(l.copayPercent) || l.copayPercent < 0 || l.copayPercent > 100) {
        return NextResponse.json({ error: "Co-pay must be between 0 and 100%" }, { status: 400 });
      }
    }

    // Every referenced catalog item must belong to this org.
    const testIds = [...new Set(upsert.filter((l) => l.itemType === "lab_test").map((l) => l.itemId))];
    const productIds = [...new Set(upsert.filter((l) => l.itemType === "product").map((l) => l.itemId))];
    const serviceIds = [...new Set(upsert.filter((l) => l.itemType === "service").map((l) => l.itemId))];
    const wardIds = [...new Set(upsert.filter((l) => l.itemType === "ward_bed").map((l) => l.itemId))];
    const vaccineIds = [...new Set(upsert.filter((l) => l.itemType === "vaccine").map((l) => l.itemId))];
    const [tests, prods, svcs, wardRows, vaccineRows] = await Promise.all([
      testIds.length > 0
        ? db.select({ id: labTests.id }).from(labTests)
            .where(and(inArray(labTests.id, testIds), eq(labTests.organisationId, orgId), isNull(labTests.deletedAt)))
        : Promise.resolve([]),
      productIds.length > 0
        ? db.select({ id: products.id }).from(products)
            .where(and(inArray(products.id, productIds), eq(products.organisationId, orgId), isNull(products.deletedAt)))
        : Promise.resolve([]),
      serviceIds.length > 0
        ? db.select({ id: serviceItems.id }).from(serviceItems)
            .where(and(inArray(serviceItems.id, serviceIds), eq(serviceItems.organisationId, orgId), isNull(serviceItems.deletedAt)))
        : Promise.resolve([]),
      wardIds.length > 0
        ? db.select({ id: wards.id }).from(wards)
            .where(and(inArray(wards.id, wardIds), eq(wards.organisationId, orgId), isNull(wards.deletedAt)))
        : Promise.resolve([]),
      vaccineIds.length > 0
        ? db.select({ id: vaccines.id }).from(vaccines)
            .where(and(inArray(vaccines.id, vaccineIds), eq(vaccines.organisationId, orgId), isNull(vaccines.deletedAt)))
        : Promise.resolve([]),
    ]);
    if (
      tests.length !== testIds.length || prods.length !== productIds.length ||
      svcs.length !== serviceIds.length || wardRows.length !== wardIds.length ||
      vaccineRows.length !== vaccineIds.length
    ) {
      return NextResponse.json({ error: "One or more services were not found" }, { status: 404 });
    }

    await db.transaction(async (tx) => {
      if (upsert.length > 0) {
        await tx
          .insert(priceListItems)
          .values(upsert.map((l) => ({
            organisationId: orgId,
            priceListId: listId,
            itemType: l.itemType,
            itemId: l.itemId,
            price: l.price,
            coverage: l.coverage,
            copayPercent: l.copayPercent,
            requiresAuthorization: l.requiresAuthorization === true,
          })))
          .onConflictDoUpdate({
            target: [priceListItems.priceListId, priceListItems.itemType, priceListItems.itemId],
            set: {
              price: sql`excluded.price`,
              coverage: sql`excluded.coverage`,
              copayPercent: sql`excluded.copay_percent`,
              requiresAuthorization: sql`excluded.requires_authorization`,
              updatedAt: new Date(),
            },
          });
      }
      for (const r of remove) {
        await tx
          .delete(priceListItems)
          .where(and(
            eq(priceListItems.priceListId, listId),
            eq(priceListItems.itemType, r.itemType),
            eq(priceListItems.itemId, Number(r.itemId)),
          ));
      }
      await tx.update(priceLists).set({ updatedAt: new Date() }).where(eq(priceLists.id, listId));
    });

    void logAudit({
      organisationId: orgId,
      userId,
      userEmail,
      action: "update",
      entityType: "price_list",
      entityId: listId,
      details: { linesSaved: upsert.length, linesRemoved: remove.length },
    });

    return NextResponse.json({ success: true, saved: upsert.length, removed: remove.length }, { status: 200 });
  } catch (error) {
    console.error("Error saving price list items:", error);
    return NextResponse.json({ error: "Failed to save tariff lines" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { priceLists, priceListItems, hmos, labTests, products, serviceItems, wards } from "@/lib/db/schema";
import { and, eq, isNull, isNotNull, desc, sql } from "drizzle-orm";
import { requirePermission } from "@/lib/authz";
import { logAudit } from "@/lib/audit";
import { validatePriceListHeader, findOverlappingPriceList } from "@/lib/billing/priceLists";

// GET /api/price-lists — the org's HMO / payer tariff schedules
export async function GET() {
  try {
    const authz = await requirePermission([["finance", "view"]]);
    if (authz.error) return authz.error;
    const { orgId } = authz.ctx;

    const rows = await db
      .select({
        id: priceLists.id,
        name: priceLists.name,
        payerType: priceLists.payerType,
        hmoId: priceLists.hmoId,
        hmoName: hmos.name,
        effectiveFrom: priceLists.effectiveFrom,
        effectiveTo: priceLists.effectiveTo,
        isActive: priceLists.isActive,
        notes: priceLists.notes,
        createdAt: priceLists.createdAt,
        updatedAt: priceLists.updatedAt,
        itemCount: sql<number>`(
          SELECT count(*)::int FROM price_list_items
          WHERE price_list_items.price_list_id = ${priceLists.id}
        )`,
      })
      .from(priceLists)
      .leftJoin(hmos, eq(priceLists.hmoId, hmos.id))
      .where(and(eq(priceLists.organisationId, orgId), isNull(priceLists.deletedAt)))
      .orderBy(desc(priceLists.createdAt));

    return NextResponse.json(rows, { status: 200 });
  } catch (error) {
    console.error("Error fetching price lists:", error);
    return NextResponse.json({ error: "Failed to fetch price lists" }, { status: 500 });
  }
}

// POST /api/price-lists — create a tariff schedule for an HMO.
// `seed: "base_prices"` pre-fills a line for every lab test and prescribable
// product at its current self-pay price, as a starting point to edit down to
// the negotiated tariff.
export async function POST(request: NextRequest) {
  try {
    const authz = await requirePermission([["finance", "add"]]);
    if (authz.error) return authz.error;
    const { orgId, userId, userEmail } = authz.ctx;

    const body = await request.json();
    const validated = validatePriceListHeader(body);
    if ("error" in validated) return NextResponse.json({ error: validated.error }, { status: 400 });
    const header = validated.value;

    const [hmo] = await db
      .select({ id: hmos.id })
      .from(hmos)
      .where(and(eq(hmos.id, header.hmoId), eq(hmos.organisationId, orgId), isNull(hmos.deletedAt)))
      .limit(1);
    if (!hmo) return NextResponse.json({ error: "HMO not found" }, { status: 404 });

    if (header.isActive) {
      const clash = await findOverlappingPriceList(orgId, header);
      if (clash) {
        return NextResponse.json(
          { error: `"${clash}" is already active for this HMO over an overlapping period. End it first, or choose different dates.` },
          { status: 409 },
        );
      }
    }

    const created = await db.transaction(async (tx) => {
      const [list] = await tx
        .insert(priceLists)
        .values({ ...header, organisationId: orgId, createdBy: userId })
        .returning();

      if (body.seed === "base_prices") {
        const [tests, prods, svcs, wardRows] = await Promise.all([
          tx.select({ id: labTests.id, price: labTests.price }).from(labTests)
            .where(and(eq(labTests.organisationId, orgId), isNull(labTests.deletedAt))),
          tx.select({ id: products.id, price: products.price }).from(products)
            .where(and(eq(products.organisationId, orgId), isNull(products.deletedAt), eq(products.isPrescribable, true))),
          tx.select({ id: serviceItems.id, price: serviceItems.price }).from(serviceItems)
            .where(and(eq(serviceItems.organisationId, orgId), isNull(serviceItems.deletedAt))),
          tx.select({ id: wards.id, price: wards.dailyRate }).from(wards)
            .where(and(eq(wards.organisationId, orgId), isNull(wards.deletedAt), isNotNull(wards.dailyRate))),
        ]);
        const lines = [
          ...tests.map((t) => ({ itemType: "lab_test", itemId: t.id, price: t.price })),
          ...prods.map((p) => ({ itemType: "product", itemId: p.id, price: p.price })),
          ...svcs.map((s) => ({ itemType: "service", itemId: s.id, price: s.price })),
          ...wardRows.map((w) => ({ itemType: "ward_bed", itemId: w.id, price: w.price ?? 0 })),
        ];
        if (lines.length > 0) {
          await tx.insert(priceListItems).values(
            lines.map((l) => ({ ...l, organisationId: orgId, priceListId: list.id })),
          );
        }
      }
      return list;
    });

    void logAudit({
      organisationId: orgId,
      userId,
      userEmail,
      action: "create",
      entityType: "price_list",
      entityId: created.id,
      details: { name: created.name, hmoId: created.hmoId, seed: body.seed ?? "empty" },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("Error creating price list:", error);
    return NextResponse.json({ error: "Failed to create price list" }, { status: 500 });
  }
}

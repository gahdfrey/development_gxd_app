import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { priceLists, priceListItems, hmos, labTests, products, departments, serviceItems, wards, vaccines } from "@/lib/db/schema";
import { SERVICE_CATEGORIES } from "@/lib/billing/serviceItems";
import { and, eq, isNull, asc } from "drizzle-orm";
import { requirePermission } from "@/lib/authz";
import { logAudit } from "@/lib/audit";
import { validatePriceListHeader, findOverlappingPriceList } from "@/lib/billing/priceLists";

type Params = { params: Promise<{ id: string }> };

async function loadList(orgId: number, idParam: string) {
  const id = parseInt(idParam);
  if (isNaN(id)) return null;
  const [list] = await db
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
    })
    .from(priceLists)
    .leftJoin(hmos, eq(priceLists.hmoId, hmos.id))
    .where(and(eq(priceLists.id, id), eq(priceLists.organisationId, orgId), isNull(priceLists.deletedAt)))
    .limit(1);
  return list ?? null;
}

// GET /api/price-lists/[id] — the list header plus the full billable catalog
// (every lab test, prescribable product, service, ward bed rate and vaccine) with this list's tariff line for
// each, so the editor can show unlisted services alongside listed ones.
export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const authz = await requirePermission([["finance", "view"]]);
    if (authz.error) return authz.error;
    const { orgId } = authz.ctx;

    const { id } = await params;
    const list = await loadList(orgId, id);
    if (!list) return NextResponse.json({ error: "Price list not found" }, { status: 404 });

    const [tests, prods, services, wardRows, vaccineRows, lines] = await Promise.all([
      db.select({ id: labTests.id, name: labTests.name, basePrice: labTests.price, group: departments.name })
        .from(labTests)
        .leftJoin(departments, eq(labTests.departmentId, departments.id))
        .where(and(eq(labTests.organisationId, orgId), isNull(labTests.deletedAt)))
        .orderBy(asc(labTests.name)),
      db.select({ id: products.id, name: products.name, basePrice: products.price, group: products.category })
        .from(products)
        .where(and(eq(products.organisationId, orgId), isNull(products.deletedAt), eq(products.isPrescribable, true)))
        .orderBy(asc(products.name)),
      db.select({ id: serviceItems.id, name: serviceItems.name, basePrice: serviceItems.price, category: serviceItems.category })
        .from(serviceItems)
        .where(and(eq(serviceItems.organisationId, orgId), isNull(serviceItems.deletedAt)))
        .orderBy(asc(serviceItems.name)),
      // Bed-day tariffs are per ward; wards without a daily rate can still be tariffed.
      db.select({ id: wards.id, name: wards.name, basePrice: wards.dailyRate })
        .from(wards)
        .where(and(eq(wards.organisationId, orgId), isNull(wards.deletedAt)))
        .orderBy(asc(wards.name)),
      // Vaccines are tariffed per dose.
      db.select({ id: vaccines.id, name: vaccines.name, basePrice: vaccines.price })
        .from(vaccines)
        .where(and(eq(vaccines.organisationId, orgId), isNull(vaccines.deletedAt)))
        .orderBy(asc(vaccines.name)),
      db.select().from(priceListItems).where(eq(priceListItems.priceListId, list.id)),
    ]);

    const lineByKey = new Map(lines.map((l) => [`${l.itemType}:${l.itemId}`, l]));
    const toRow = (itemType: "lab_test" | "product" | "service" | "ward_bed" | "vaccine") => (c: { id: number; name: string; basePrice: number; group: string | null }) => {
      const line = lineByKey.get(`${itemType}:${c.id}`);
      return {
        itemType,
        itemId: c.id,
        name: c.name,
        group: c.group,
        basePrice: c.basePrice,
        listed: !!line,
        price: line?.price ?? null,
        coverage: line?.coverage ?? null,
        copayPercent: line?.copayPercent ?? 0,
        requiresAuthorization: line?.requiresAuthorization ?? false,
      };
    };

    return NextResponse.json(
      { ...list, items: [...tests.map(toRow("lab_test")), ...prods.map(toRow("product")),
          ...services.map((s) => toRow("service")({ ...s, group: SERVICE_CATEGORIES[s.category as keyof typeof SERVICE_CATEGORIES] ?? s.category })),
          ...wardRows.map((w) => toRow("ward_bed")({ ...w, basePrice: w.basePrice ?? 0, name: `${w.name} — bed per day`, group: "Bed charge per day" })),
          ...vaccineRows.map((v) => toRow("vaccine")({ ...v, name: `${v.name} — per dose`, group: "Vaccine" }))] },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error fetching price list:", error);
    return NextResponse.json({ error: "Failed to fetch price list" }, { status: 500 });
  }
}

// PATCH /api/price-lists/[id] — edit the header (name, dates, active flag)
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const authz = await requirePermission([["finance", "edit"]]);
    if (authz.error) return authz.error;
    const { orgId, userId, userEmail } = authz.ctx;

    const { id } = await params;
    const existing = await loadList(orgId, id);
    if (!existing) return NextResponse.json({ error: "Price list not found" }, { status: 404 });

    const body = await request.json();
    const validated = validatePriceListHeader({
      name: body.name ?? existing.name,
      payerType: body.payerType ?? existing.payerType,
      // The HMO a tariff belongs to is fixed once created — recorded
      // hmo_charges point at this list, so re-pointing it would misattribute them.
      hmoId: existing.hmoId,
      effectiveFrom: body.effectiveFrom ?? existing.effectiveFrom,
      effectiveTo: body.effectiveTo !== undefined ? body.effectiveTo : existing.effectiveTo,
      isActive: body.isActive ?? existing.isActive,
      notes: body.notes !== undefined ? body.notes : existing.notes,
    });
    if ("error" in validated) return NextResponse.json({ error: validated.error }, { status: 400 });
    const header = validated.value;

    if (header.isActive) {
      const clash = await findOverlappingPriceList(orgId, header, existing.id);
      if (clash) {
        return NextResponse.json(
          { error: `"${clash}" is already active for this HMO over an overlapping period.` },
          { status: 409 },
        );
      }
    }

    const [updated] = await db
      .update(priceLists)
      .set({ ...header, updatedAt: new Date() })
      .where(and(eq(priceLists.id, existing.id), eq(priceLists.organisationId, orgId)))
      .returning();

    void logAudit({
      organisationId: orgId,
      userId,
      userEmail,
      action: "update",
      entityType: "price_list",
      entityId: existing.id,
      details: header,
    });

    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    console.error("Error updating price list:", error);
    return NextResponse.json({ error: "Failed to update price list" }, { status: 500 });
  }
}

// DELETE /api/price-lists/[id] — soft delete; already-recorded hmo_charges
// keep their snapshotted amounts.
export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const authz = await requirePermission([["finance", "delete"]]);
    if (authz.error) return authz.error;
    const { orgId, userId, userEmail } = authz.ctx;

    const { id } = await params;
    const existing = await loadList(orgId, id);
    if (!existing) return NextResponse.json({ error: "Price list not found" }, { status: 404 });

    await db
      .update(priceLists)
      .set({ deletedAt: new Date(), isActive: false, updatedAt: new Date() })
      .where(and(eq(priceLists.id, existing.id), eq(priceLists.organisationId, orgId)));

    void logAudit({
      organisationId: orgId,
      userId,
      userEmail,
      action: "delete",
      entityType: "price_list",
      entityId: existing.id,
      details: { name: existing.name },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error deleting price list:", error);
    return NextResponse.json({ error: "Failed to delete price list" }, { status: 500 });
  }
}

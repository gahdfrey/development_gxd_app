import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { billingPlans, billingPlanItems, labTests, products } from "@/lib/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { requirePermission, requireAuth } from "@/lib/authz";
import { logAudit } from "@/lib/audit";

/** The catalog services this plan entitles a subscriber to. Any authenticated staff can read it (same access as the catalog endpoints it's built from). */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authz = await requireAuth();
    if (authz.error) return authz.error;
    const { orgId } = authz.ctx;

    const { id: idParam } = await params;
    const billingPlanId = parseInt(idParam);
    if (!Number.isFinite(billingPlanId)) return NextResponse.json({ error: "Invalid plan id" }, { status: 400 });

    const [plan] = await db
      .select({ id: billingPlans.id })
      .from(billingPlans)
      .where(and(eq(billingPlans.id, billingPlanId), eq(billingPlans.organisationId, orgId)))
      .limit(1);
    if (!plan) return NextResponse.json({ error: "Billing plan not found" }, { status: 404 });

    const items = await db.select().from(billingPlanItems).where(eq(billingPlanItems.billingPlanId, billingPlanId));

    const testIds = items.filter((i) => i.itemType === "lab_test").map((i) => i.itemId);
    const productIds = items.filter((i) => i.itemType === "product").map((i) => i.itemId);

    const [testRows, productRows] = await Promise.all([
      testIds.length > 0
        ? db.select({ id: labTests.id, name: labTests.name, price: labTests.price }).from(labTests).where(inArray(labTests.id, testIds))
        : Promise.resolve([]),
      productIds.length > 0
        ? db.select({ id: products.id, name: products.name, price: products.price }).from(products).where(inArray(products.id, productIds))
        : Promise.resolve([]),
    ]);
    const testById = new Map(testRows.map((t) => [t.id, t]));
    const productById = new Map(productRows.map((p) => [p.id, p]));

    const result = items.map((i) => ({
      id: i.id,
      itemType: i.itemType,
      itemId: i.itemId,
      name: i.itemType === "lab_test" ? testById.get(i.itemId)?.name : productById.get(i.itemId)?.name,
      price: i.itemType === "lab_test" ? testById.get(i.itemId)?.price : productById.get(i.itemId)?.price,
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching billing plan items:", error);
    return NextResponse.json({ error: "Failed to fetch billing plan items" }, { status: 500 });
  }
}

/** Add a catalog service (lab test or product) to this plan's coverage. */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authz = await requirePermission([["billing", "edit"]]);
    if (authz.error) return authz.error;
    const { orgId, userId: actorId, userEmail: actorEmail } = authz.ctx;

    const { id: idParam } = await params;
    const billingPlanId = parseInt(idParam);
    if (!Number.isFinite(billingPlanId)) return NextResponse.json({ error: "Invalid plan id" }, { status: 400 });

    const [plan] = await db
      .select({ id: billingPlans.id, name: billingPlans.name })
      .from(billingPlans)
      .where(and(eq(billingPlans.id, billingPlanId), eq(billingPlans.organisationId, orgId)))
      .limit(1);
    if (!plan) return NextResponse.json({ error: "Billing plan not found" }, { status: 404 });

    const body = await request.json();
    const itemType = body.itemType;
    const itemId = Number(body.itemId);
    if (!["lab_test", "product"].includes(itemType) || !Number.isFinite(itemId)) {
      return NextResponse.json({ error: "Invalid item" }, { status: 400 });
    }

    // Confirm the catalog item actually exists in this org before linking it.
    const exists = itemType === "lab_test"
      ? await db.select({ id: labTests.id }).from(labTests).where(and(eq(labTests.id, itemId), eq(labTests.organisationId, orgId))).limit(1)
      : await db.select({ id: products.id }).from(products).where(and(eq(products.id, itemId), eq(products.organisationId, orgId))).limit(1);
    if (exists.length === 0) return NextResponse.json({ error: "Catalog item not found" }, { status: 404 });

    const [item] = await db
      .insert(billingPlanItems)
      .values({ organisationId: orgId, billingPlanId, itemType, itemId })
      .onConflictDoNothing({ target: [billingPlanItems.billingPlanId, billingPlanItems.itemType, billingPlanItems.itemId] })
      .returning();

    void logAudit({
      organisationId: orgId,
      userId: actorId,
      userEmail: actorEmail,
      action: "create",
      entityType: "billing_plan_item",
      entityId: billingPlanId,
      details: { planName: plan.name, itemType, itemId },
    });

    return NextResponse.json(item ?? { billingPlanId, itemType, itemId }, { status: 201 });
  } catch (error) {
    console.error("Error adding billing plan item:", error);
    return NextResponse.json({ error: "Failed to add billing plan item" }, { status: 500 });
  }
}

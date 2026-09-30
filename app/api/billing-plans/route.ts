import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { billingPlans, billingPlanItems, labTests, products } from "@/lib/db/schema";
import { eq, and, isNull, asc, inArray } from "drizzle-orm";
import { getOrgId } from "@/lib/org";
import { requirePermission } from "@/lib/authz";
import { logAudit } from "@/lib/audit";

const BILLING_INTERVALS = ["weekly", "monthly", "yearly"];

/**
 * Active billing plans for this org — patients pick from this list to
 * subscribe. Each plan carries its covered catalog services (name only, no
 * ids needed by the picker) so the patient can see what a plan includes
 * before subscribing.
 */
export async function GET() {
  try {
    const orgId = await getOrgId();
    if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const plans = await db
      .select()
      .from(billingPlans)
      .where(and(eq(billingPlans.organisationId, orgId), isNull(billingPlans.deletedAt)))
      .orderBy(asc(billingPlans.name));

    if (plans.length === 0) return NextResponse.json([]);

    const items = await db
      .select()
      .from(billingPlanItems)
      .where(inArray(billingPlanItems.billingPlanId, plans.map((p) => p.id)));

    const testIds = items.filter((i) => i.itemType === "lab_test").map((i) => i.itemId);
    const productIds = items.filter((i) => i.itemType === "product").map((i) => i.itemId);
    const [testRows, productRows] = await Promise.all([
      testIds.length > 0 ? db.select({ id: labTests.id, name: labTests.name }).from(labTests).where(inArray(labTests.id, testIds)) : Promise.resolve([]),
      productIds.length > 0 ? db.select({ id: products.id, name: products.name }).from(products).where(inArray(products.id, productIds)) : Promise.resolve([]),
    ]);
    const testNameById = new Map(testRows.map((t) => [t.id, t.name]));
    const productNameById = new Map(productRows.map((p) => [p.id, p.name]));

    const itemsByPlan = new Map<number, string[]>();
    for (const item of items) {
      const name = item.itemType === "lab_test" ? testNameById.get(item.itemId) : productNameById.get(item.itemId);
      if (!name) continue;
      const list = itemsByPlan.get(item.billingPlanId) ?? [];
      list.push(name);
      itemsByPlan.set(item.billingPlanId, list);
    }

    return NextResponse.json(plans.map((p) => ({ ...p, includedServices: itemsByPlan.get(p.id) ?? [] })));
  } catch (error) {
    console.error("Error fetching billing plans:", error);
    return NextResponse.json({ error: "Failed to fetch billing plans" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authz = await requirePermission([["billing", "add"]]);
    if (authz.error) return authz.error;
    const { orgId, userId: actorId, userEmail: actorEmail } = authz.ctx;

    const body = await request.json();
    const { name, description, amount, billingInterval } = body;

    if (!name?.trim()) return NextResponse.json({ error: "Plan name is required" }, { status: 400 });
    const amountNum = Number(amount);
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      return NextResponse.json({ error: "Enter a valid amount" }, { status: 400 });
    }
    const interval = BILLING_INTERVALS.includes(billingInterval) ? billingInterval : "monthly";

    const [plan] = await db
      .insert(billingPlans)
      .values({ organisationId: orgId, name: name.trim(), description: description?.trim() || null, amount: amountNum, billingInterval: interval })
      .returning();

    void logAudit({
      organisationId: orgId,
      userId: actorId,
      userEmail: actorEmail,
      action: "create",
      entityType: "billing_plan",
      entityId: plan.id,
      details: { name: plan.name, amount: plan.amount, billingInterval: plan.billingInterval },
    });

    return NextResponse.json(plan, { status: 201 });
  } catch (error) {
    console.error("Error creating billing plan:", error);
    return NextResponse.json({ error: "Failed to create billing plan" }, { status: 500 });
  }
}

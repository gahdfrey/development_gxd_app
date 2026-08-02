import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { drugGenerics, products } from "@/lib/db/schema";
import { asc, ilike, eq, and, isNull, sql } from "drizzle-orm";
import { requireAuth, requirePermission } from "@/lib/authz";
import { logAudit } from "@/lib/audit";

export async function GET(request: NextRequest) {
  try {
    const authz = await requireAuth();
    if (authz.error) return authz.error;
    const orgId = authz.ctx.orgId;

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    // Only return generics that currently have at least one prescribable,
    // in-stock brand — used by the prescription picker so clinicians aren't
    // offered active constituents pharmacy can't actually dispense yet.
    const withStockOnly = searchParams.get("withStock") === "true";

    const conditions: any[] = [eq(drugGenerics.organisationId, orgId), isNull(drugGenerics.deletedAt)];
    if (search) conditions.push(ilike(drugGenerics.name, `%${search}%`));

    const rows = await db
      .select({
        id: drugGenerics.id,
        name: drugGenerics.name,
        strength: drugGenerics.strength,
        form: drugGenerics.form,
        brandCount: sql<number>`count(distinct ${products.id}) filter (where ${products.id} is not null and ${products.deletedAt} is null)::int`,
        inStockBrandCount: sql<number>`count(distinct ${products.id}) filter (where ${products.id} is not null and ${products.deletedAt} is null and (${products.casesInStock} * ${products.unitsPerCase} + ${products.looseUnitsInStock}) > 0)::int`,
      })
      .from(drugGenerics)
      .leftJoin(products, eq(products.genericId, drugGenerics.id))
      .where(and(...conditions))
      .groupBy(drugGenerics.id)
      .orderBy(asc(drugGenerics.name));

    const filtered = withStockOnly ? rows.filter((r) => Number(r.inStockBrandCount) > 0) : rows;

    return NextResponse.json(filtered, { status: 200 });
  } catch (error) {
    console.error("Error fetching drug generics:", error);
    return NextResponse.json({ error: "Failed to fetch drug generics" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authz = await requirePermission([["products", "add"]]);
    if (authz.error) return authz.error;
    const { orgId, userId: actorId, userEmail: actorEmail } = authz.ctx;

    const body = await request.json();
    const { name, strength, form } = body;

    if (!name?.trim()) return NextResponse.json({ error: "Active ingredient name is required" }, { status: 400 });
    if (!strength?.trim()) return NextResponse.json({ error: "Strength is required" }, { status: 400 });

    const [generic] = await db
      .insert(drugGenerics)
      .values({
        organisationId: orgId,
        name: name.trim(),
        strength: strength.trim(),
        form: form?.trim() || null,
      })
      .returning();

    void logAudit({
      organisationId: orgId,
      userId: actorId,
      userEmail: actorEmail,
      action: "create",
      entityType: "drug_generic",
      entityId: generic.id,
      details: { name: generic.name, strength: generic.strength, form: generic.form },
    });

    return NextResponse.json(generic, { status: 201 });
  } catch (error) {
    console.error("Error creating drug generic:", error);
    return NextResponse.json({ error: "Failed to create drug generic" }, { status: 500 });
  }
}

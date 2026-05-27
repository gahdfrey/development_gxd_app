import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { roles } from "@/lib/db/schema";
import { desc, eq, ilike, and } from "drizzle-orm";
import { getOrgId } from "@/lib/org";

export async function GET(request: Request) {
  try {
    const orgId = await getOrgId();
    if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");

    const conditions: any[] = [eq(roles.organisationId, orgId)];
    if (search?.trim()) conditions.push(ilike(roles.name, `%${search.trim()}%`));

    const allRoles = await db.select().from(roles).where(and(...conditions)).orderBy(desc(roles.createdAt));
    return NextResponse.json(allRoles);
  } catch (error) {
    console.error("Error fetching roles:", error);
    return NextResponse.json({ error: "Failed to fetch roles" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const orgId = await getOrgId();
    if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { name, description, permissions } = body;

    if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

    const [existing] = await db.select().from(roles)
      .where(and(eq(roles.name, name), eq(roles.organisationId, orgId)));
    if (existing) return NextResponse.json({ error: "Role with this name already exists" }, { status: 400 });

    const [newRole] = await db.insert(roles).values({
      organisationId: orgId,
      name,
      description,
      permissions: permissions || {},
    }).returning();

    return NextResponse.json(newRole, { status: 201 });
  } catch (error) {
    console.error("Error creating role:", error);
    return NextResponse.json({ error: "Failed to create role" }, { status: 500 });
  }
}

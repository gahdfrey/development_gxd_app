import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { roles } from "@/lib/db/schema";
import { desc, eq, ilike, and, isNull } from "drizzle-orm";
import { requirePermission, requireAuth } from "@/lib/authz";
import { logAudit } from "@/lib/audit";

export async function GET(request: Request) {
  try {
    // Any authenticated staff member may list roles (used to populate
    // dropdowns in the users screen); mutations are permission-gated.
    const authz = await requireAuth();
    if (authz.error) return authz.error;
    const orgId = authz.ctx.orgId;

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");

    const conditions: any[] = [eq(roles.organisationId, orgId), isNull(roles.deletedAt)];
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
    const authz = await requirePermission([["roles", "add"]]);
    if (authz.error) return authz.error;
    const { orgId, userId: actorId, userEmail: actorEmail } = authz.ctx;

    const body = await request.json();
    const { name, description, permissions } = body;

    if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

    const [existing] = await db.select().from(roles)
      .where(and(eq(roles.name, name), eq(roles.organisationId, orgId), isNull(roles.deletedAt)));
    if (existing) return NextResponse.json({ error: "Role with this name already exists" }, { status: 400 });

    const [newRole] = await db.insert(roles).values({
      organisationId: orgId,
      name,
      description,
      permissions: permissions || {},
    }).returning();

    void logAudit({
      organisationId: orgId,
      userId: actorId,
      userEmail: actorEmail,
      action: "create",
      entityType: "role",
      entityId: newRole.id,
      details: { name, permissions: permissions || {} },
    });

    return NextResponse.json(newRole, { status: 201 });
  } catch (error) {
    console.error("Error creating role:", error);
    return NextResponse.json({ error: "Failed to create role" }, { status: 500 });
  }
}

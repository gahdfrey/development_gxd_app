import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { departments } from "@/lib/db/schema";
import { asc, eq, and, isNull } from "drizzle-orm";
import { requireAuth, requirePermission } from "@/lib/authz";
import { logAudit } from "@/lib/audit";

export async function GET() {
  try {
    // Read allowed for all authenticated staff (used across request forms).
    const authz = await requireAuth();
    if (authz.error) return authz.error;
    const orgId = authz.ctx.orgId;

    const allDepartments = await db
      .select()
      .from(departments)
      .where(and(eq(departments.organisationId, orgId), isNull(departments.deletedAt)))
      .orderBy(asc(departments.name));

    return NextResponse.json(allDepartments, { status: 200 });
  } catch (error) {
    console.error("Error fetching departments:", error);
    return NextResponse.json({ error: "Failed to fetch departments" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authz = await requirePermission([["setup", "add"], ["setup", "edit"]]);
    if (authz.error) return authz.error;
    const { orgId, userId: actorId, userEmail: actorEmail } = authz.ctx;

    const body = await request.json();
    const { name } = body;

    if (!name?.trim()) return NextResponse.json({ error: "Department name is required" }, { status: 400 });

    const [newDepartment] = await db
      .insert(departments)
      .values({ organisationId: orgId, name: name.trim() })
      .returning();

    void logAudit({
      organisationId: orgId,
      userId: actorId,
      userEmail: actorEmail,
      action: "create",
      entityType: "department",
      entityId: newDepartment.id,
      details: { name: newDepartment.name },
    });

    return NextResponse.json(newDepartment, { status: 201 });
  } catch (error: any) {
    console.error("Error creating department:", error);
    if (error.code === "23505") return NextResponse.json({ error: "A department with this name already exists" }, { status: 409 });
    return NextResponse.json({ error: "Failed to create department" }, { status: 500 });
  }
}

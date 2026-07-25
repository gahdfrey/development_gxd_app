import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { wards, departments } from "@/lib/db/schema";
import { asc, eq, and, isNull } from "drizzle-orm";
import { requirePermission } from "@/lib/authz";
import { getOrgId } from "@/lib/org";
import { logAudit } from "@/lib/audit";

// Read allowed for all authenticated staff (used to populate ward dropdowns
// across the app); uses the lightweight session-only orgId lookup rather
// than requireAuth's role/permissions DB join, since nothing here needs it.
export async function GET() {
  try {
    const orgId = await getOrgId();
    if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const allWards = await db
      .select({
        id: wards.id,
        name: wards.name,
        departmentId: wards.departmentId,
        departmentName: departments.name,
        createdAt: wards.createdAt,
      })
      .from(wards)
      .leftJoin(departments, eq(wards.departmentId, departments.id))
      .where(and(eq(wards.organisationId, orgId), isNull(wards.deletedAt)))
      .orderBy(asc(wards.name));

    return NextResponse.json(allWards, { status: 200 });
  } catch (error) {
    console.error("Error fetching wards:", error);
    return NextResponse.json({ error: "Failed to fetch wards" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authz = await requirePermission([["admission", "add"]]);
    if (authz.error) return authz.error;
    const { orgId, userId: actorId, userEmail: actorEmail } = authz.ctx;

    const body = await request.json();
    const { name, departmentId } = body;

    if (!name?.trim()) return NextResponse.json({ error: "Ward name is required" }, { status: 400 });

    const [newWard] = await db
      .insert(wards)
      .values({
        organisationId: orgId,
        name: name.trim(),
        departmentId: departmentId ? parseInt(departmentId) : null,
      })
      .returning();

    void logAudit({
      organisationId: orgId,
      userId: actorId,
      userEmail: actorEmail,
      action: "create",
      entityType: "ward",
      entityId: newWard.id,
      details: { name: newWard.name },
    });

    return NextResponse.json(newWard, { status: 201 });
  } catch (error: any) {
    console.error("Error creating ward:", error);
    if (error.code === "23505") return NextResponse.json({ error: "A ward with this name already exists" }, { status: 409 });
    return NextResponse.json({ error: "Failed to create ward" }, { status: 500 });
  }
}

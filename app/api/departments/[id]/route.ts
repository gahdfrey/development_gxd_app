import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { departments, labTests } from "@/lib/db/schema";
import { eq, and, isNull, count } from "drizzle-orm";
import { requireAuth, requirePermission } from "@/lib/authz";
import { logAudit } from "@/lib/audit";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authz = await requireAuth();
    if (authz.error) return authz.error;
    const orgId = authz.ctx.orgId;

    const { id: idParam } = await params;
    const id = parseInt(idParam);

    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid department ID" }, { status: 400 });
    }

    const [department] = await db
      .select()
      .from(departments)
      .where(and(eq(departments.id, id), eq(departments.organisationId, orgId), isNull(departments.deletedAt)));

    if (!department) {
      return NextResponse.json({ error: "Department not found" }, { status: 404 });
    }

    return NextResponse.json(department, { status: 200 });
  } catch (error) {
    console.error("Error fetching department:", error);
    return NextResponse.json({ error: "Failed to fetch department" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authz = await requirePermission([["setup", "edit"]]);
    if (authz.error) return authz.error;
    const { orgId, userId: actorId, userEmail: actorEmail } = authz.ctx;

    const { id: idParam } = await params;
    const id = parseInt(idParam);

    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid department ID" }, { status: 400 });
    }

    const body = await request.json();
    const { name } = body;

    if (!name || name.trim() === "") {
      return NextResponse.json({ error: "Department name is required" }, { status: 400 });
    }

    const [updated] = await db
      .update(departments)
      .set({ name: name.trim(), updatedAt: new Date() })
      .where(and(eq(departments.id, id), eq(departments.organisationId, orgId), isNull(departments.deletedAt)))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Department not found" }, { status: 404 });
    }

    void logAudit({
      organisationId: orgId,
      userId: actorId,
      userEmail: actorEmail,
      action: "update",
      entityType: "department",
      entityId: id,
      details: { name: updated.name },
    });

    return NextResponse.json(updated, { status: 200 });
  } catch (error: any) {
    console.error("Error updating department:", error);

    if (error.code === "23505") {
      return NextResponse.json(
        { error: "A department with this name already exists" },
        { status: 409 },
      );
    }

    return NextResponse.json({ error: "Failed to update department" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authz = await requirePermission([["setup", "delete"], ["setup", "edit"]]);
    if (authz.error) return authz.error;
    const { orgId, userId: actorId, userEmail: actorEmail } = authz.ctx;

    const { id: idParam } = await params;
    const id = parseInt(idParam);

    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid department ID" }, { status: 400 });
    }

    // Block deletion while active tests are still linked to this department.
    const [{ value: linkedTests }] = await db
      .select({ value: count() })
      .from(labTests)
      .where(and(eq(labTests.departmentId, id), isNull(labTests.deletedAt)));

    if (linkedTests > 0) {
      return NextResponse.json(
        { error: "Cannot delete department — it has tests linked to it" },
        { status: 409 },
      );
    }

    const [target] = await db
      .select({ id: departments.id, name: departments.name })
      .from(departments)
      .where(and(eq(departments.id, id), eq(departments.organisationId, orgId), isNull(departments.deletedAt)));

    if (!target) {
      return NextResponse.json({ error: "Department not found" }, { status: 404 });
    }

    // Soft delete; rename to free the unique (name, org) index.
    await db
      .update(departments)
      .set({
        deletedAt: new Date(),
        name: `${target.name}__deleted_${Date.now()}`,
        updatedAt: new Date(),
      })
      .where(eq(departments.id, id));

    void logAudit({
      organisationId: orgId,
      userId: actorId,
      userEmail: actorEmail,
      action: "delete",
      entityType: "department",
      entityId: id,
      details: { name: target.name, softDelete: true },
    });

    return NextResponse.json({ message: "Department deleted successfully" }, { status: 200 });
  } catch (error: any) {
    console.error("Error deleting department:", error);
    return NextResponse.json({ error: "Failed to delete department" }, { status: 500 });
  }
}

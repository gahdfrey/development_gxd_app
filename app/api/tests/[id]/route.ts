import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { labTests } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";
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
      return NextResponse.json({ error: "Invalid test ID" }, { status: 400 });
    }

    const [test] = await db
      .select()
      .from(labTests)
      .where(and(eq(labTests.id, id), eq(labTests.organisationId, orgId), isNull(labTests.deletedAt)));

    if (!test) {
      return NextResponse.json({ error: "Test not found" }, { status: 404 });
    }

    return NextResponse.json(test, { status: 200 });
  } catch (error) {
    console.error("Error fetching test:", error);
    return NextResponse.json({ error: "Failed to fetch test" }, { status: 500 });
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
      return NextResponse.json({ error: "Invalid test ID" }, { status: 400 });
    }

    const body = await request.json();
    const { name, price, departmentId } = body;

    if (!name || name.trim() === "") {
      return NextResponse.json({ error: "Test name is required" }, { status: 400 });
    }

    if (!departmentId || isNaN(parseInt(departmentId))) {
      return NextResponse.json({ error: "A valid department is required" }, { status: 400 });
    }

    const parsedPrice = parseInt(price);
    if (isNaN(parsedPrice) || parsedPrice < 1) {
      return NextResponse.json({ error: "Price must be a positive number" }, { status: 400 });
    }

    const [updated] = await db
      .update(labTests)
      .set({
        name: name.trim(),
        price: parsedPrice,
        departmentId: parseInt(departmentId),
        updatedAt: new Date(),
      })
      .where(and(eq(labTests.id, id), eq(labTests.organisationId, orgId), isNull(labTests.deletedAt)))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Test not found" }, { status: 404 });
    }

    void logAudit({
      organisationId: orgId,
      userId: actorId,
      userEmail: actorEmail,
      action: "update",
      entityType: "lab_test",
      entityId: id,
      details: { name: updated.name, price: updated.price, departmentId: updated.departmentId },
    });

    return NextResponse.json(updated, { status: 200 });
  } catch (error: any) {
    console.error("Error updating test:", error);

    if (error.code === "23503") {
      return NextResponse.json({ error: "Selected department does not exist" }, { status: 400 });
    }

    return NextResponse.json({ error: "Failed to update test" }, { status: 500 });
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
      return NextResponse.json({ error: "Invalid test ID" }, { status: 400 });
    }

    // Soft delete: existing requests keep their reference to this test.
    const [deleted] = await db
      .update(labTests)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(labTests.id, id), eq(labTests.organisationId, orgId), isNull(labTests.deletedAt)))
      .returning();

    if (!deleted) {
      return NextResponse.json({ error: "Test not found" }, { status: 404 });
    }

    void logAudit({
      organisationId: orgId,
      userId: actorId,
      userEmail: actorEmail,
      action: "delete",
      entityType: "lab_test",
      entityId: id,
      details: { name: deleted.name, softDelete: true },
    });

    return NextResponse.json({ message: "Test deleted successfully" }, { status: 200 });
  } catch (error) {
    console.error("Error deleting test:", error);
    return NextResponse.json({ error: "Failed to delete test" }, { status: 500 });
  }
}

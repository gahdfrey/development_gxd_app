import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { departments } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getOrgId } from "@/lib/org";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const orgId = await getOrgId();
    if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: idParam } = await params;
    const id = parseInt(idParam);

    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid department ID" }, { status: 400 });
    }

    const [department] = await db
      .select()
      .from(departments)
      .where(and(eq(departments.id, id), eq(departments.organisationId, orgId)));

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
    const orgId = await getOrgId();
    if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
      .where(and(eq(departments.id, id), eq(departments.organisationId, orgId)))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Department not found" }, { status: 404 });
    }

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
    const orgId = await getOrgId();
    if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: idParam } = await params;
    const id = parseInt(idParam);

    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid department ID" }, { status: 400 });
    }

    const [deleted] = await db
      .delete(departments)
      .where(and(eq(departments.id, id), eq(departments.organisationId, orgId)))
      .returning();

    if (!deleted) {
      return NextResponse.json({ error: "Department not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Department deleted successfully" }, { status: 200 });
  } catch (error: any) {
    console.error("Error deleting department:", error);

    if (error.code === "23503") {
      return NextResponse.json(
        { error: "Cannot delete department — it has tests linked to it" },
        { status: 409 },
      );
    }

    return NextResponse.json({ error: "Failed to delete department" }, { status: 500 });
  }
}

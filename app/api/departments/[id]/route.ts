import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { departments } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// GET /api/departments/[id] - Get a single department
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: idParam } = await params;
    const id = parseInt(idParam);

    if (isNaN(id)) {
      return NextResponse.json(
        { error: "Invalid department ID" },
        { status: 400 },
      );
    }

    const [department] = await db
      .select()
      .from(departments)
      .where(eq(departments.id, id));

    if (!department) {
      return NextResponse.json(
        { error: "Department not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(department, { status: 200 });
  } catch (error) {
    console.error("Error fetching department:", error);
    return NextResponse.json(
      { error: "Failed to fetch department" },
      { status: 500 },
    );
  }
}

// PUT /api/departments/[id] - Update a department
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: idParam } = await params;
    const id = parseInt(idParam);

    if (isNaN(id)) {
      return NextResponse.json(
        { error: "Invalid department ID" },
        { status: 400 },
      );
    }

    const body = await request.json();
    const { name, module } = body;

    if (!name || name.trim() === "") {
      return NextResponse.json(
        { error: "Department name is required" },
        { status: 400 },
      );
    }

    const validModules = ["laboratory", "radiography"];
    const resolvedModule = validModules.includes(module) ? module : null;

    const [updated] = await db
      .update(departments)
      .set({ name: name.trim(), module: resolvedModule, updatedAt: new Date() })
      .where(eq(departments.id, id))
      .returning();

    if (!updated) {
      return NextResponse.json(
        { error: "Department not found" },
        { status: 404 },
      );
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

    return NextResponse.json(
      { error: "Failed to update department" },
      { status: 500 },
    );
  }
}

// DELETE /api/departments/[id] - Delete a department
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: idParam } = await params;
    const id = parseInt(idParam);

    if (isNaN(id)) {
      return NextResponse.json(
        { error: "Invalid department ID" },
        { status: 400 },
      );
    }

    const [deleted] = await db
      .delete(departments)
      .where(eq(departments.id, id))
      .returning();

    if (!deleted) {
      return NextResponse.json(
        { error: "Department not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(
      { message: "Department deleted successfully" },
      { status: 200 },
    );
  } catch (error: any) {
    console.error("Error deleting department:", error);

    // FK violation — tests still reference this department
    if (error.code === "23503") {
      return NextResponse.json(
        { error: "Cannot delete department — it has tests linked to it" },
        { status: 409 },
      );
    }

    return NextResponse.json(
      { error: "Failed to delete department" },
      { status: 500 },
    );
  }
}

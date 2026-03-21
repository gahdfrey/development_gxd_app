import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { labTests } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// GET /api/tests/[id] - Get a single lab test
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: idParam } = await params;
    const id = parseInt(idParam);

    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid test ID" }, { status: 400 });
    }

    const [test] = await db
      .select()
      .from(labTests)
      .where(eq(labTests.id, id));

    if (!test) {
      return NextResponse.json({ error: "Test not found" }, { status: 404 });
    }

    return NextResponse.json(test, { status: 200 });
  } catch (error) {
    console.error("Error fetching test:", error);
    return NextResponse.json(
      { error: "Failed to fetch test" },
      { status: 500 },
    );
  }
}

// PUT /api/tests/[id] - Update a lab test
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: idParam } = await params;
    const id = parseInt(idParam);

    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid test ID" }, { status: 400 });
    }

    const body = await request.json();
    const { name, price, departmentId } = body;

    if (!name || name.trim() === "") {
      return NextResponse.json(
        { error: "Test name is required" },
        { status: 400 },
      );
    }

    if (!departmentId || isNaN(parseInt(departmentId))) {
      return NextResponse.json(
        { error: "A valid department is required" },
        { status: 400 },
      );
    }

    const parsedPrice = parseInt(price);
    if (isNaN(parsedPrice) || parsedPrice < 1) {
      return NextResponse.json(
        { error: "Price must be a positive number" },
        { status: 400 },
      );
    }

    const [updated] = await db
      .update(labTests)
      .set({
        name: name.trim(),
        price: parsedPrice,
        departmentId: parseInt(departmentId),
        updatedAt: new Date(),
      })
      .where(eq(labTests.id, id))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Test not found" }, { status: 404 });
    }

    return NextResponse.json(updated, { status: 200 });
  } catch (error: any) {
    console.error("Error updating test:", error);

    if (error.code === "23503") {
      return NextResponse.json(
        { error: "Selected department does not exist" },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: "Failed to update test" },
      { status: 500 },
    );
  }
}

// DELETE /api/tests/[id] - Delete a lab test
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: idParam } = await params;
    const id = parseInt(idParam);

    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid test ID" }, { status: 400 });
    }

    const [deleted] = await db
      .delete(labTests)
      .where(eq(labTests.id, id))
      .returning();

    if (!deleted) {
      return NextResponse.json({ error: "Test not found" }, { status: 404 });
    }

    return NextResponse.json(
      { message: "Test deleted successfully" },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error deleting test:", error);
    return NextResponse.json(
      { error: "Failed to delete test" },
      { status: 500 },
    );
  }
}

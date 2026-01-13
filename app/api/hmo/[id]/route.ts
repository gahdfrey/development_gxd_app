import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hmos } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// GET /api/hmo/[id] - Get a single HMO by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idParam } = await params;
    const id = parseInt(idParam);

    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid HMO ID" }, { status: 400 });
    }

    const [hmo] = await db.select().from(hmos).where(eq(hmos.id, id));

    if (!hmo) {
      return NextResponse.json({ error: "HMO not found" }, { status: 404 });
    }

    return NextResponse.json(hmo, { status: 200 });
  } catch (error) {
    console.error("Error fetching HMO:", error);
    return NextResponse.json({ error: "Failed to fetch HMO" }, { status: 500 });
  }
}

// PUT /api/hmo/[id] - Update an HMO
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idParam } = await params;
    const id = parseInt(idParam);

    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid HMO ID" }, { status: 400 });
    }

    const body = await request.json();
    const { name, description } = body;

    // Validate required fields
    if (!name || name.trim() === "") {
      return NextResponse.json(
        { error: "HMO name is required" },
        { status: 400 }
      );
    }

    // Update HMO
    const [updatedHMO] = await db
      .update(hmos)
      .set({
        name: name.trim(),
        description: description?.trim() || null,
        updatedAt: new Date(),
      })
      .where(eq(hmos.id, id))
      .returning();

    if (!updatedHMO) {
      return NextResponse.json({ error: "HMO not found" }, { status: 404 });
    }

    return NextResponse.json(updatedHMO, { status: 200 });
  } catch (error: any) {
    console.error("Error updating HMO:", error);

    // Handle unique constraint violation
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "HMO with this name already exists" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "Failed to update HMO" },
      { status: 500 }
    );
  }
}

// DELETE /api/hmo/[id] - Delete an HMO
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idParam } = await params;
    const id = parseInt(idParam);

    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid HMO ID" }, { status: 400 });
    }

    const [deletedHMO] = await db
      .delete(hmos)
      .where(eq(hmos.id, id))
      .returning();

    if (!deletedHMO) {
      return NextResponse.json({ error: "HMO not found" }, { status: 404 });
    }

    return NextResponse.json(
      { message: "HMO deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting HMO:", error);
    return NextResponse.json(
      { error: "Failed to delete HMO" },
      { status: 500 }
    );
  }
}

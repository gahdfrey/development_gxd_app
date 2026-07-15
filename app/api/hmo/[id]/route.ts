import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hmos } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { requireAuth, requirePermission } from "@/lib/authz";
import { logAudit } from "@/lib/audit";

// GET /api/hmo/[id] - Get a single HMO by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authz = await requireAuth();
    if (authz.error) return authz.error;

    const { id: idParam } = await params;
    const id = parseInt(idParam);

    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid HMO ID" }, { status: 400 });
    }

    const [hmo] = await db
      .select()
      .from(hmos)
      .where(and(eq(hmos.id, id), isNull(hmos.deletedAt)));

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
    const authz = await requirePermission([["setup", "edit"]]);
    if (authz.error) return authz.error;
    const { orgId, userId: actorId, userEmail: actorEmail } = authz.ctx;

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
      .where(and(eq(hmos.id, id), isNull(hmos.deletedAt)))
      .returning();

    if (!updatedHMO) {
      return NextResponse.json({ error: "HMO not found" }, { status: 404 });
    }

    void logAudit({
      organisationId: orgId,
      userId: actorId,
      userEmail: actorEmail,
      action: "update",
      entityType: "hmo",
      entityId: id,
      details: { name: updatedHMO.name },
    });

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

// DELETE /api/hmo/[id] - Soft-delete an HMO
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authz = await requirePermission([["setup", "delete"], ["setup", "edit"]]);
    if (authz.error) return authz.error;
    const { orgId, userId: actorId, userEmail: actorEmail } = authz.ctx;

    const { id: idParam } = await params;
    const id = parseInt(idParam);

    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid HMO ID" }, { status: 400 });
    }

    const [target] = await db
      .select({ id: hmos.id, name: hmos.name })
      .from(hmos)
      .where(and(eq(hmos.id, id), isNull(hmos.deletedAt)));

    if (!target) {
      return NextResponse.json({ error: "HMO not found" }, { status: 404 });
    }

    // Soft delete; rename to free the unique name index. Patients keep their
    // hmoId reference so historical insurance data is preserved.
    await db
      .update(hmos)
      .set({
        deletedAt: new Date(),
        name: `${target.name}__deleted_${Date.now()}`,
        updatedAt: new Date(),
      })
      .where(eq(hmos.id, id));

    void logAudit({
      organisationId: orgId,
      userId: actorId,
      userEmail: actorEmail,
      action: "delete",
      entityType: "hmo",
      entityId: id,
      details: { name: target.name, softDelete: true },
    });

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

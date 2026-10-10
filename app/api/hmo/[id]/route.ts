import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hmos, patientCoverages } from "@/lib/db/schema";
import { eq, and, isNull, sql } from "drizzle-orm";
import { requireAuth, requirePermission } from "@/lib/authz";
import { logAudit } from "@/lib/audit";
import { getPgErrorCode } from "@/lib/db/pg-error";
import { validatePayer } from "@/lib/billing/payers";

type Params = { params: Promise<{ id: string }> };

// GET /api/hmo/[id] - One of this organisation's HMOs
export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const authz = await requireAuth();
    if (authz.error) return authz.error;
    const { orgId } = authz.ctx;

    const id = parseInt((await params).id);
    if (isNaN(id)) return NextResponse.json({ error: "Invalid HMO ID" }, { status: 400 });

    const [hmo] = await db
      .select()
      .from(hmos)
      .where(and(eq(hmos.id, id), eq(hmos.organisationId, orgId), isNull(hmos.deletedAt)));

    if (!hmo) return NextResponse.json({ error: "HMO not found" }, { status: 404 });
    return NextResponse.json(hmo, { status: 200 });
  } catch (error) {
    console.error("Error fetching HMO:", error);
    return NextResponse.json({ error: "Failed to fetch HMO" }, { status: 500 });
  }
}

// PUT /api/hmo/[id] - Update an HMO / payer
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const authz = await requirePermission([["setup", "edit"]]);
    if (authz.error) return authz.error;
    const { orgId, userId: actorId, userEmail: actorEmail } = authz.ctx;

    const id = parseInt((await params).id);
    if (isNaN(id)) return NextResponse.json({ error: "Invalid HMO ID" }, { status: 400 });

    const validated = validatePayer(await request.json());
    if ("error" in validated) return NextResponse.json({ error: validated.error }, { status: 400 });

    const [updatedHMO] = await db
      .update(hmos)
      .set({ ...validated.value, updatedAt: new Date() })
      .where(and(eq(hmos.id, id), eq(hmos.organisationId, orgId), isNull(hmos.deletedAt)))
      .returning();

    if (!updatedHMO) return NextResponse.json({ error: "HMO not found" }, { status: 404 });

    void logAudit({
      organisationId: orgId,
      userId: actorId,
      userEmail: actorEmail,
      action: "update",
      entityType: "hmo",
      entityId: id,
      details: validated.value,
    });

    return NextResponse.json(updatedHMO, { status: 200 });
  } catch (error) {
    console.error("Error updating HMO:", error);
    if (getPgErrorCode(error) === "23505") {
      return NextResponse.json({ error: "An HMO with this name already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to update HMO" }, { status: 500 });
  }
}

// DELETE /api/hmo/[id] - Soft-delete an HMO. Refused while patients still
// have an active coverage with it, so nobody is silently dropped to
// self-pay; historical coverages/charges keep their reference.
export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const authz = await requirePermission([["setup", "delete"], ["setup", "edit"]]);
    if (authz.error) return authz.error;
    const { orgId, userId: actorId, userEmail: actorEmail } = authz.ctx;

    const id = parseInt((await params).id);
    if (isNaN(id)) return NextResponse.json({ error: "Invalid HMO ID" }, { status: 400 });

    const [target] = await db
      .select({ id: hmos.id, name: hmos.name })
      .from(hmos)
      .where(and(eq(hmos.id, id), eq(hmos.organisationId, orgId), isNull(hmos.deletedAt)));
    if (!target) return NextResponse.json({ error: "HMO not found" }, { status: 404 });

    const [{ active }] = await db
      .select({ active: sql<number>`count(*)::int` })
      .from(patientCoverages)
      .where(and(
        eq(patientCoverages.hmoId, id),
        eq(patientCoverages.status, "active"),
        isNull(patientCoverages.deletedAt),
      ));
    if (active > 0) {
      return NextResponse.json(
        { error: `${active} patient${active === 1 ? " is" : "s are"} still enrolled with ${target.name}. End their coverage before deleting this HMO.` },
        { status: 409 },
      );
    }

    // Name uniqueness only applies to non-deleted rows, so no rename needed.
    await db
      .update(hmos)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(hmos.id, id), eq(hmos.organisationId, orgId)));

    void logAudit({
      organisationId: orgId,
      userId: actorId,
      userEmail: actorEmail,
      action: "delete",
      entityType: "hmo",
      entityId: id,
      details: { name: target.name, softDelete: true },
    });

    return NextResponse.json({ message: "HMO deleted successfully" }, { status: 200 });
  } catch (error) {
    console.error("Error deleting HMO:", error);
    return NextResponse.json({ error: "Failed to delete HMO" }, { status: 500 });
  }
}

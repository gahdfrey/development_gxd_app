import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { beds, wards } from "@/lib/db/schema";
import { asc, eq, and, isNull } from "drizzle-orm";
import { requirePermission } from "@/lib/authz";
import { getOrgId } from "@/lib/org";
import { logAudit } from "@/lib/audit";
import { getPgErrorCode } from "@/lib/db/pg-error";

// Read allowed for all authenticated staff (bed-availability dropdowns in
// the Admit/Transfer modals fire this on every ward selection); uses the
// lightweight session-only orgId lookup rather than requireAuth's DB join,
// since nothing here needs role/permissions data.
export async function GET(request: NextRequest) {
  try {
    const orgId = await getOrgId();
    if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const wardId = searchParams.get("wardId");
    const status = searchParams.get("status");

    const conditions = [eq(beds.organisationId, orgId), isNull(beds.deletedAt)];
    if (wardId) {
      const parsedWardId = parseInt(wardId);
      if (!isNaN(parsedWardId)) conditions.push(eq(beds.wardId, parsedWardId));
    }
    if (status) conditions.push(eq(beds.status, status));

    const allBeds = await db
      .select({
        id: beds.id,
        bedNumber: beds.bedNumber,
        status: beds.status,
        wardId: beds.wardId,
        wardName: wards.name,
        createdAt: beds.createdAt,
      })
      .from(beds)
      .leftJoin(wards, eq(beds.wardId, wards.id))
      .where(and(...conditions))
      .orderBy(asc(wards.name), asc(beds.bedNumber));

    return NextResponse.json(allBeds, { status: 200 });
  } catch (error) {
    console.error("Error fetching beds:", error);
    return NextResponse.json({ error: "Failed to fetch beds" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authz = await requirePermission([["admission", "add"]]);
    if (authz.error) return authz.error;
    const { orgId, userId: actorId, userEmail: actorEmail } = authz.ctx;

    const body = await request.json();
    const { wardId, bedNumber } = body;

    if (!wardId || !bedNumber?.trim()) {
      return NextResponse.json({ error: "Ward and bed number are required" }, { status: 400 });
    }

    const parsedWardId = parseInt(wardId);
    if (isNaN(parsedWardId)) return NextResponse.json({ error: "Invalid ward" }, { status: 400 });

    const [ward] = await db
      .select({ id: wards.id })
      .from(wards)
      .where(and(eq(wards.id, parsedWardId), eq(wards.organisationId, orgId), isNull(wards.deletedAt)));
    if (!ward) return NextResponse.json({ error: "Ward not found" }, { status: 404 });

    const [newBed] = await db
      .insert(beds)
      .values({ organisationId: orgId, wardId: parsedWardId, bedNumber: bedNumber.trim() })
      .returning();

    void logAudit({
      organisationId: orgId,
      userId: actorId,
      userEmail: actorEmail,
      action: "create",
      entityType: "bed",
      entityId: newBed.id,
      details: { bedNumber: newBed.bedNumber, wardId: parsedWardId },
    });

    return NextResponse.json(newBed, { status: 201 });
  } catch (error: any) {
    console.error("Error creating bed:", error);
    if (getPgErrorCode(error) === "23505") return NextResponse.json({ error: "A bed with this number already exists in this ward" }, { status: 409 });
    return NextResponse.json({ error: "Failed to create bed" }, { status: 500 });
  }
}

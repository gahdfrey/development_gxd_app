import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hmos } from "@/lib/db/schema";
import { and, asc, eq, isNull } from "drizzle-orm";
import { requireAuth, requirePermission } from "@/lib/authz";
import { logAudit } from "@/lib/audit";
import { getPgErrorCode } from "@/lib/db/pg-error";
import { validatePayer } from "@/lib/billing/payers";

// GET /api/hmo - This organisation's HMOs / payers (read for any staff, since
// patient registration and billing screens need the list).
export async function GET() {
  try {
    const authz = await requireAuth();
    if (authz.error) return authz.error;
    const { orgId } = authz.ctx;

    const orgHmos = await db
      .select()
      .from(hmos)
      .where(and(eq(hmos.organisationId, orgId), isNull(hmos.deletedAt)))
      .orderBy(asc(hmos.name));

    return NextResponse.json(orgHmos, { status: 200 });
  } catch (error) {
    console.error("Error fetching HMOs:", error);
    return NextResponse.json({ error: "Failed to fetch HMOs" }, { status: 500 });
  }
}

// POST /api/hmo - Add an HMO / payer to this organisation's list
export async function POST(request: NextRequest) {
  try {
    const authz = await requirePermission([["setup", "add"], ["setup", "edit"]]);
    if (authz.error) return authz.error;
    const { orgId, userId: actorId, userEmail: actorEmail } = authz.ctx;

    const validated = validatePayer(await request.json());
    if ("error" in validated) return NextResponse.json({ error: validated.error }, { status: 400 });

    const [newHMO] = await db
      .insert(hmos)
      .values({ ...validated.value, organisationId: orgId })
      .returning();

    void logAudit({
      organisationId: orgId,
      userId: actorId,
      userEmail: actorEmail,
      action: "create",
      entityType: "hmo",
      entityId: newHMO.id,
      details: { name: newHMO.name, payerType: newHMO.payerType },
    });

    return NextResponse.json(newHMO, { status: 201 });
  } catch (error) {
    console.error("Error creating HMO:", error);
    if (getPgErrorCode(error) === "23505") {
      return NextResponse.json({ error: "An HMO with this name already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to create HMO" }, { status: 500 });
  }
}

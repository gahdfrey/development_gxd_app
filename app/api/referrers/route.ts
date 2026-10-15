import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { referrers } from "@/lib/db/schema";
import { and, asc, eq, isNull } from "drizzle-orm";
import { requireAuth, requirePermission } from "@/lib/authz";
import { logAudit } from "@/lib/audit";
import { parseReferrerInput, referrerCode } from "@/lib/referrals";

export async function GET() {
  try {
    // Read allowed for all authenticated staff (used by the register-patient form).
    const authz = await requireAuth();
    if (authz.error) return authz.error;
    const orgId = authz.ctx.orgId;

    const rows = await db
      .select()
      .from(referrers)
      .where(and(eq(referrers.organisationId, orgId), isNull(referrers.deletedAt)))
      .orderBy(asc(referrers.name));

    return NextResponse.json(rows, { status: 200 });
  } catch (error) {
    console.error("Error fetching referrers:", error);
    return NextResponse.json({ error: "Failed to fetch referrers" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authz = await requirePermission([["setup", "add"], ["setup", "edit"]]);
    if (authz.error) return authz.error;
    const { orgId, userId: actorId, userEmail: actorEmail } = authz.ctx;

    const parsed = parseReferrerInput(await request.json());
    if (!parsed.data) return NextResponse.json({ error: parsed.error }, { status: 400 });

    const created = await db.transaction(async (tx) => {
      const [row] = await tx.insert(referrers).values({ organisationId: orgId, ...parsed.data }).returning();
      const [withCode] = await tx
        .update(referrers)
        .set({ code: referrerCode(row.id) })
        .where(eq(referrers.id, row.id))
        .returning();
      return withCode;
    });

    void logAudit({
      organisationId: orgId,
      userId: actorId,
      userEmail: actorEmail,
      action: "create",
      entityType: "referrer",
      entityId: created.id,
      details: { code: created.code, name: created.name },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("Error creating referrer:", error);
    return NextResponse.json({ error: "Failed to create referrer" }, { status: 500 });
  }
}

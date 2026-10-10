import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { vaccines } from "@/lib/db/schema";
import { and, asc, eq, isNull } from "drizzle-orm";
import { requireAuth, requirePermission } from "@/lib/authz";
import { logAudit } from "@/lib/audit";
import { validateVaccine } from "@/lib/vaccination";

// GET /api/vaccines?active=1 — the hospital's vaccine list and prices.
export async function GET(request: NextRequest) {
  try {
    const authz = await requireAuth();
    if (authz.error) return authz.error;
    const activeOnly = new URL(request.url).searchParams.get("active") === "1";
    const rows = await db
      .select()
      .from(vaccines)
      .where(and(eq(vaccines.organisationId, authz.ctx.orgId), isNull(vaccines.deletedAt), ...(activeOnly ? [eq(vaccines.isActive, true)] : [])))
      .orderBy(asc(vaccines.name));
    return NextResponse.json(rows);
  } catch (error) {
    console.error("Error fetching vaccines:", error);
    return NextResponse.json({ error: "Failed to fetch vaccines" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authz = await requirePermission([["setup", "add"], ["setup", "edit"]]);
    if (authz.error) return authz.error;
    const { orgId, userId, userEmail } = authz.ctx;
    const v = validateVaccine(await request.json());
    if ("error" in v) return NextResponse.json({ error: v.error }, { status: 400 });
    const [row] = await db.insert(vaccines).values({ ...v.value, organisationId: orgId }).returning();
    void logAudit({ organisationId: orgId, userId, userEmail, action: "create", entityType: "vaccine", entityId: row.id, details: v.value });
    return NextResponse.json(row, { status: 201 });
  } catch (error) {
    console.error("Error creating vaccine:", error);
    return NextResponse.json({ error: "Failed to create vaccine" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { drugClasses } from "@/lib/db/schema";
import { and, asc, eq, isNull, or } from "drizzle-orm";
import { requireAuth, requirePermission } from "@/lib/authz";
import { logAudit } from "@/lib/audit";
import { getPgErrorCode } from "@/lib/db/pg-error";
import { cleanMembers } from "@/lib/cds/drugClasses";

// GET /api/drug-classes — built-in classes plus this hospital's own.
export async function GET() {
  try {
    const authz = await requireAuth();
    if (authz.error) return authz.error;
    const { orgId } = authz.ctx;

    const rows = await db
      .select()
      .from(drugClasses)
      .where(and(isNull(drugClasses.deletedAt), or(isNull(drugClasses.organisationId), eq(drugClasses.organisationId, orgId))))
      .orderBy(asc(drugClasses.name));

    return NextResponse.json(rows.map((r) => ({ ...r, isBuiltIn: r.organisationId == null })), { status: 200 });
  } catch (error) {
    console.error("Error fetching drug classes:", error);
    return NextResponse.json({ error: "Failed to fetch drug classes" }, { status: 500 });
  }
}

// POST /api/drug-classes { name, description?, members } — a hospital-specific class.
export async function POST(request: NextRequest) {
  try {
    const authz = await requirePermission([["setup", "add"], ["setup", "edit"], ["pharmacy", "edit"]]);
    if (authz.error) return authz.error;
    const { orgId, userId, userEmail } = authz.ctx;

    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) return NextResponse.json({ error: "Name the drug family" }, { status: 400 });
    const members = cleanMembers(body.members);
    if (!members) return NextResponse.json({ error: "List at least one active ingredient" }, { status: 400 });
    const key = `org_${name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "")}`;

    const [created] = await db
      .insert(drugClasses)
      .values({
        organisationId: orgId,
        key,
        name,
        description: typeof body.description === "string" && body.description.trim() ? body.description.trim() : null,
        members,
      })
      .returning();

    void logAudit({ organisationId: orgId, userId, userEmail, action: "create", entityType: "drug_class", entityId: created.id, details: { name, members } });
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    if (getPgErrorCode(error) === "23505") {
      return NextResponse.json({ error: "A drug family with this name already exists" }, { status: 409 });
    }
    console.error("Error creating drug class:", error);
    return NextResponse.json({ error: "Failed to create drug family" }, { status: 500 });
  }
}

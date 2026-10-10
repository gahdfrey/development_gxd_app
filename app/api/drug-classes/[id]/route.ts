import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { drugClasses } from "@/lib/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { requirePermission } from "@/lib/authz";
import { logAudit } from "@/lib/audit";
import { cleanMembers } from "@/lib/cds/drugClasses";

type Params = { params: Promise<{ id: string }> };

// Built-in classes are shared reference data and read-only; only a
// hospital's own classes can be edited or removed.
async function findOwnClass(orgId: number, idParam: string) {
  const id = parseInt(idParam);
  if (isNaN(id)) return null;
  const [row] = await db
    .select()
    .from(drugClasses)
    .where(and(eq(drugClasses.id, id), eq(drugClasses.organisationId, orgId), isNull(drugClasses.deletedAt)))
    .limit(1);
  return row ?? null;
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const authz = await requirePermission([["setup", "edit"], ["pharmacy", "edit"]]);
    if (authz.error) return authz.error;
    const { orgId, userId, userEmail } = authz.ctx;

    const existing = await findOwnClass(orgId, (await params).id);
    if (!existing) return NextResponse.json({ error: "Drug family not found (built-in families can't be edited)" }, { status: 404 });

    const body = await request.json();
    const members = body.members !== undefined ? cleanMembers(body.members) : existing.members;
    if (!members) return NextResponse.json({ error: "List at least one active ingredient" }, { status: 400 });
    const name = typeof body.name === "string" && body.name.trim() ? body.name.trim() : existing.name;

    const [updated] = await db
      .update(drugClasses)
      .set({
        name,
        members,
        description: body.description !== undefined ? (typeof body.description === "string" && body.description.trim() ? body.description.trim() : null) : existing.description,
        updatedAt: new Date(),
      })
      .where(eq(drugClasses.id, existing.id))
      .returning();

    void logAudit({ organisationId: orgId, userId, userEmail, action: "update", entityType: "drug_class", entityId: existing.id, details: { name, members } });
    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    console.error("Error updating drug class:", error);
    return NextResponse.json({ error: "Failed to update drug family" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const authz = await requirePermission([["setup", "delete"], ["setup", "edit"], ["pharmacy", "edit"]]);
    if (authz.error) return authz.error;
    const { orgId, userId, userEmail } = authz.ctx;

    const existing = await findOwnClass(orgId, (await params).id);
    if (!existing) return NextResponse.json({ error: "Drug family not found (built-in families can't be removed)" }, { status: 404 });

    await db.update(drugClasses).set({ deletedAt: new Date(), updatedAt: new Date() }).where(eq(drugClasses.id, existing.id));
    void logAudit({ organisationId: orgId, userId, userEmail, action: "delete", entityType: "drug_class", entityId: existing.id, details: { name: existing.name } });
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error deleting drug class:", error);
    return NextResponse.json({ error: "Failed to remove drug family" }, { status: 500 });
  }
}

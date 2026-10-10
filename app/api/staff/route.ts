import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, roles } from "@/lib/db/schema";
import { and, asc, eq, isNull, ne } from "drizzle-orm";
import { requireAuth } from "@/lib/authz";

// GET /api/staff — names of this organisation's staff (not patients), for
// pickers such as the eMAR "witnessed by". Minimal fields only.
export async function GET() {
  try {
    const authz = await requireAuth();
    if (authz.error) return authz.error;
    const rows = await db
      .select({ id: users.id, firstname: users.firstname, lastname: users.lastname, roleName: roles.name })
      .from(users)
      .leftJoin(roles, eq(users.roleId, roles.id))
      .where(and(eq(users.organisationId, authz.ctx.orgId), isNull(users.deletedAt), isNull(users.patientId), ne(users.id, authz.ctx.userId)))
      .orderBy(asc(users.firstname));
    return NextResponse.json(rows, { status: 200 });
  } catch (error) {
    console.error("Error fetching staff:", error);
    return NextResponse.json({ error: "Failed to fetch staff" }, { status: 500 });
  }
}

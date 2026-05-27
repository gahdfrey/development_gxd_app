import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, roles } from "@/lib/db/schema";
import { desc, eq, ilike, and, or } from "drizzle-orm";
import { getOrgId } from "@/lib/org";

export async function GET(request: Request) {
  try {
    const orgId = await getOrgId();
    if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");

    const isPatient = ilike(roles.name, "patient");
    const inOrg = eq(users.organisationId, orgId);

    let query = db
      .select({
        id: users.id,
        username: users.username,
        email: users.email,
        firstname: users.firstname,
        lastname: users.lastname,
        patientId: users.patientId,
        roleId: users.roleId,
        roleName: roles.name,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .leftJoin(roles, eq(users.roleId, roles.id));

    if (search?.trim()) {
      const searchTerm = `%${search.trim()}%`;
      query = query.where(and(inOrg, isPatient, or(
        ilike(users.firstname, searchTerm),
        ilike(users.lastname, searchTerm),
        ilike(users.email, searchTerm),
      ))) as typeof query;
    } else {
      query = query.where(and(inOrg, isPatient)) as typeof query;
    }

    const patientUsers = await query.orderBy(desc(users.createdAt));
    return NextResponse.json(patientUsers);
  } catch (error) {
    console.error("Error fetching patient users:", error);
    return NextResponse.json({ error: "Failed to fetch patient users" }, { status: 500 });
  }
}

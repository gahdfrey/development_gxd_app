import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, roles } from "@/lib/db/schema";
import { eq, asc, desc, and, isNull } from "drizzle-orm";
import { getOrgId } from "@/lib/org";

export async function GET(request: Request) {
  try {
    const orgId = await getOrgId();
    if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const orderBy = searchParams.get("orderBy");

    const whereClause = and(eq(roles.name, "Doctor"), eq(users.organisationId, orgId), isNull(users.deletedAt));

    const baseQuery = db
      .select({
        id: users.id,
        firstname: users.firstname,
        lastname: users.lastname,
        email: users.email,
        username: users.username,
      })
      .from(users)
      .leftJoin(roles, eq(users.roleId, roles.id))
      .where(whereClause);

    const doctors =
      orderBy === "asc" ? await baseQuery.orderBy(asc(users.firstname))
      : orderBy === "desc" ? await baseQuery.orderBy(desc(users.firstname))
      : await baseQuery;

    return NextResponse.json(doctors);
  } catch (error) {
    console.error("Error fetching doctors:", error);
    return NextResponse.json({ error: "Failed to fetch doctors" }, { status: 500 });
  }
}

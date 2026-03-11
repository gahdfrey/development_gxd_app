import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, roles } from "@/lib/db/schema";
import { eq, asc, desc } from "drizzle-orm";

export async function GET(request: Request) {
  try {
    // Get orderBy query parameter (optional)
    const { searchParams } = new URL(request.url);
    const orderBy = searchParams.get("orderBy"); // 'asc' or 'desc'

    // Build query based on orderBy parameter
    const doctors =
      orderBy === "asc"
        ? await db
            .select({
              id: users.id,
              firstname: users.firstname,
              lastname: users.lastname,
              email: users.email,
              username: users.username,
            })
            .from(users)
            .leftJoin(roles, eq(users.roleId, roles.id))
            .where(eq(roles.name, "doctor"))
            .orderBy(asc(users.firstname))
        : orderBy === "desc"
        ? await db
            .select({
              id: users.id,
              firstname: users.firstname,
              lastname: users.lastname,
              email: users.email,
              username: users.username,
            })
            .from(users)
            .leftJoin(roles, eq(users.roleId, roles.id))
            .where(eq(roles.name, "doctor"))
            .orderBy(desc(users.firstname))
        : await db
            .select({
              id: users.id,
              firstname: users.firstname,
              lastname: users.lastname,
              email: users.email,
              username: users.username,
            })
            .from(users)
            .leftJoin(roles, eq(users.roleId, roles.id))
            .where(eq(roles.name, "doctor"));

    return NextResponse.json(doctors);
  } catch (error) {
    console.error("Error fetching doctors:", error);
    return NextResponse.json(
      { error: "Failed to fetch doctors" },
      { status: 500 }
    );
  }
}

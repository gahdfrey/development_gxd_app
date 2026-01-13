import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, roles } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    // Fetch all users with the 'doctor' role
    const doctors = await db
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

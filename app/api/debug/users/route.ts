import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { like, desc } from "drizzle-orm";

export async function GET() {
  try {
    // Check for testadmin email
    const testAdminUsers = await db
      .select({
        id: users.id,
        email: users.email,
        username: users.username,
        firstname: users.firstname,
        lastname: users.lastname,
      })
      .from(users)
      .where(like(users.email, "%testadmin%"));

    // Get all users
    const allUsers = await db
      .select({
        id: users.id,
        email: users.email,
        username: users.username,
        firstname: users.firstname,
        lastname: users.lastname,
      })
      .from(users)
      .orderBy(desc(users.createdAt));

    return NextResponse.json({
      testAdminUsers,
      allUsers,
      totalUsers: allUsers.length,
    });
  } catch (error) {
    console.error("Error querying users:", error);
    return NextResponse.json(
      { error: "Failed to query users" },
      { status: 500 },
    );
  }
}

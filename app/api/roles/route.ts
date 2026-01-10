import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { roles } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const allRoles = await db.select().from(roles);
    return NextResponse.json(allRoles);
  } catch (error) {
    console.error("Error fetching roles:", error);
    return NextResponse.json(
      { error: "Failed to fetch roles" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, description, permissions } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    // Check if role name already exists
    const existingRole = await db
      .select()
      .from(roles)
      .where(eq(roles.name, name));

    if (existingRole.length > 0) {
      return NextResponse.json(
        { error: "Role with this name already exists" },
        { status: 400 }
      );
    }

    const newRole = await db
      .insert(roles)
      .values({
        name,
        description,
        permissions: permissions || {}, // Use provided permissions or empty object (frontend can use defaults)
      })
      .returning();

    return NextResponse.json(newRole[0], { status: 201 });
  } catch (error) {
    console.error("Error creating role:", error);
    return NextResponse.json(
      { error: "Failed to create role" },
      { status: 500 }
    );
  }
}

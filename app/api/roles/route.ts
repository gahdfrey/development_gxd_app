import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { roles } from "@/lib/db/schema";
import { eq, ilike } from "drizzle-orm";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");

    let query = db.select().from(roles);

    // Add search filter if search parameter exists
    if (search && search.trim() !== "") {
      const searchTerm = `%${search.trim()}%`;
      query = query.where(ilike(roles.name, searchTerm)) as any;
    }

    const allRoles = await query;

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

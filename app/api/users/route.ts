import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, roles } from "@/lib/db/schema";
import bcrypt from "bcryptjs";
import { desc, eq, or, ilike } from "drizzle-orm";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");

    let query = db
      .select({
        id: users.id,
        username: users.username,
        email: users.email,
        firstname: users.firstname,
        lastname: users.lastname,
        roleId: users.roleId,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
        roleName: roles.name,
      })
      .from(users)
      .leftJoin(roles, eq(users.roleId, roles.id));

    // Add search filter if search parameter exists
    if (search && search.trim() !== "") {
      const searchTerm = `%${search.trim()}%`;
      query = query.where(
        or(
          ilike(users.firstname, searchTerm),
          ilike(users.lastname, searchTerm),
          ilike(users.email, searchTerm)
        )
      ) as any;
    }

    const allUsers = await query.orderBy(desc(users.createdAt));

    return NextResponse.json(allUsers);
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, email, firstname, lastname, password, roleId } = body;

    if (!username || !email || !firstname || !lastname || !password) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await db
      .insert(users)
      .values({
        username,
        email,
        firstname,
        lastname,
        password: hashedPassword,
        roleId: roleId || null,
      })
      .returning();

    const { password: _, ...safeUser } = newUser[0];

    return NextResponse.json(safeUser, { status: 201 });
  } catch (error) {
    console.error("Error creating user:", error);
    return NextResponse.json(
      { error: "Failed to create user" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, roles, departments } from "@/lib/db/schema";
import bcrypt from "bcryptjs";
import { desc, eq, or, ilike, and, not } from "drizzle-orm";
import { getOrgId } from "@/lib/org";

export async function GET(request: Request) {
  try {
    const orgId = await getOrgId();
    if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");

    const notPatient = not(ilike(roles.name, "patient"));
    const inOrg = eq(users.organisationId, orgId);

    let query = db
      .select({
        id: users.id,
        username: users.username,
        email: users.email,
        firstname: users.firstname,
        lastname: users.lastname,
        roleId: users.roleId,
        departmentId: users.departmentId,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
        roleName: roles.name,
        departmentName: departments.name,
      })
      .from(users)
      .leftJoin(roles, eq(users.roleId, roles.id))
      .leftJoin(departments, eq(users.departmentId, departments.id));

    if (search && search.trim() !== "") {
      const searchTerm = `%${search.trim()}%`;
      query = query.where(and(inOrg, notPatient, or(
        ilike(users.firstname, searchTerm),
        ilike(users.lastname, searchTerm),
        ilike(users.email, searchTerm),
      ))) as any;
    } else {
      query = query.where(and(inOrg, notPatient)) as any;
    }

    const allUsers = await query.orderBy(desc(users.createdAt));
    return NextResponse.json(allUsers);
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const orgId = await getOrgId();
    if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { username, email, firstname, lastname, password, roleId, departmentId } = body;

    if (!username || !email || !firstname || !lastname || !password) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await db
      .insert(users)
      .values({
        organisationId: orgId,
        username, email, firstname, lastname,
        password: hashedPassword,
        roleId: roleId || null,
        departmentId: departmentId || null,
      })
      .returning();

    const { password: _, ...safeUser } = newUser[0];
    return NextResponse.json(safeUser, { status: 201 });
  } catch (error) {
    console.error("Error creating user:", error);
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
  }
}

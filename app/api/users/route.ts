import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, roles, departments } from "@/lib/db/schema";
import bcrypt from "bcryptjs";
import { desc, eq, or, ilike, and, not, isNull } from "drizzle-orm";
import { requirePermission } from "@/lib/authz";
import { logAudit } from "@/lib/audit";

export async function GET(request: Request) {
  try {
    const authz = await requirePermission([["users", "view"]]);
    if (authz.error) return authz.error;
    const orgId = authz.ctx.orgId;

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");

    const notPatient = not(ilike(roles.name, "patient"));
    const inOrg = eq(users.organisationId, orgId);
    const notDeleted = isNull(users.deletedAt);

    let query = db
      .select({
        id: users.id,
        username: users.username,
        email: users.email,
        firstname: users.firstname,
        lastname: users.lastname,
        gender: users.gender,
        roleId: users.roleId,
        departmentId: users.departmentId,
        licenseNumber: users.licenseNumber,
        licenseCouncil: users.licenseCouncil,
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
      query = query.where(and(inOrg, notPatient, notDeleted, or(
        ilike(users.firstname, searchTerm),
        ilike(users.lastname, searchTerm),
        ilike(users.email, searchTerm),
      ))) as any;
    } else {
      query = query.where(and(inOrg, notPatient, notDeleted)) as any;
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
    const authz = await requirePermission([["users", "add"]]);
    if (authz.error) return authz.error;
    const { orgId, userId: actorId, userEmail: actorEmail } = authz.ctx;

    const body = await request.json();
    const { username, email, firstname, lastname, gender, password, roleId, departmentId, licenseNumber, licenseCouncil } = body;

    if (!username || !email || !firstname || !lastname || !password) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await db
      .insert(users)
      .values({
        organisationId: orgId,
        username, email, firstname, lastname,
        gender: gender?.trim() || null,
        password: hashedPassword,
        roleId: roleId || null,
        departmentId: departmentId || null,
        licenseNumber: licenseNumber?.trim() || null,
        licenseCouncil: licenseCouncil?.trim() || null,
      })
      .returning();

    void logAudit({
      organisationId: orgId,
      userId: actorId,
      userEmail: actorEmail,
      action: "create",
      entityType: "user",
      entityId: newUser[0].id,
      details: { email, username, roleId: roleId || null },
    });

    const { password: _, ...safeUser } = newUser[0];
    return NextResponse.json(safeUser, { status: 201 });
  } catch (error) {
    console.error("Error creating user:", error);
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
  }
}

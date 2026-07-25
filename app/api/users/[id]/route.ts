import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, roles, departments } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { requirePermission } from "@/lib/authz";
import { logAudit } from "@/lib/audit";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authz = await requirePermission([["users", "view"]]);
    if (authz.error) return authz.error;
    const orgId = authz.ctx.orgId;

    const { id } = await params;
    const userId = parseInt(id);
    const user = await db
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
      .leftJoin(departments, eq(users.departmentId, departments.id))
      .where(and(eq(users.id, userId), eq(users.organisationId, orgId), isNull(users.deletedAt)));

    if (!user.length) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(user[0]);
  } catch (error) {
    console.error("Error fetching user:", error);
    return NextResponse.json({ error: "Failed to fetch user" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authz = await requirePermission([["users", "edit"]]);
    if (authz.error) return authz.error;
    const { orgId, userId: actorId, userEmail: actorEmail } = authz.ctx;

    const { id } = await params;
    const userId = parseInt(id);
    const body = await request.json();
    const { username, email, firstname, lastname, gender, password, roleId, departmentId, permissions, licenseNumber, licenseCouncil } = body;

    const updateData: Record<string, unknown> = {
      username,
      email,
      firstname,
      lastname,
      roleId: roleId || null,
      departmentId: departmentId || null,
      updatedAt: new Date(),
    };

    if (gender !== undefined) updateData.gender = gender?.trim() || null;
    if (licenseNumber !== undefined) updateData.licenseNumber = licenseNumber?.trim() || null;
    if (licenseCouncil !== undefined) updateData.licenseCouncil = licenseCouncil?.trim() || null;

    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    const updatedUser = await db
      .update(users)
      .set(updateData)
      .where(and(eq(users.id, userId), eq(users.organisationId, orgId), isNull(users.deletedAt)))
      .returning();

    if (!updatedUser.length) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (permissions && roleId) {
      await db
        .update(roles)
        .set({ permissions, updatedAt: new Date() })
        .where(and(eq(roles.id, roleId), eq(roles.organisationId, orgId)));
    }

    void logAudit({
      organisationId: orgId,
      userId: actorId,
      userEmail: actorEmail,
      action: "update",
      entityType: "user",
      entityId: userId,
      details: {
        username, email, roleId: roleId || null, departmentId: departmentId || null,
        passwordChanged: Boolean(password),
        rolePermissionsChanged: Boolean(permissions && roleId),
      },
    });

    const { password: _, ...safeUser } = updatedUser[0];
    return NextResponse.json(safeUser);
  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authz = await requirePermission([["users", "delete"]]);
    if (authz.error) return authz.error;
    const { orgId, userId: actorId, userEmail: actorEmail } = authz.ctx;

    const { id } = await params;
    const userId = parseInt(id);

    if (userId === actorId) {
      return NextResponse.json(
        { error: "You cannot deactivate your own account" },
        { status: 400 },
      );
    }

    // Soft delete: mark as deleted and free up the unique email/username so
    // they can be reused. Original values are preserved in the audit log.
    const [target] = await db
      .select({ id: users.id, email: users.email, username: users.username })
      .from(users)
      .where(and(eq(users.id, userId), eq(users.organisationId, orgId), isNull(users.deletedAt)));

    if (!target) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const suffix = `__deleted_${Date.now()}`;
    await db
      .update(users)
      .set({
        deletedAt: new Date(),
        email: `${target.email}${suffix}`,
        username: `${target.username}${suffix}`,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    void logAudit({
      organisationId: orgId,
      userId: actorId,
      userEmail: actorEmail,
      action: "delete",
      entityType: "user",
      entityId: userId,
      details: { email: target.email, username: target.username, softDelete: true },
    });

    return NextResponse.json({ message: "User deactivated successfully" });
  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
  }
}

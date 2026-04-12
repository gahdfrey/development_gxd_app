import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, roles, departments } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = parseInt(id);
    const user = await db
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
      .leftJoin(departments, eq(users.departmentId, departments.id))
      .where(eq(users.id, userId));

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
    const { id } = await params;
    const userId = parseInt(id);
    const body = await request.json();
    const { username, email, firstname, lastname, password, roleId, departmentId, permissions } = body;

    const updateData: Record<string, unknown> = {
      username,
      email,
      firstname,
      lastname,
      roleId: roleId || null,
      departmentId: departmentId || null,
      updatedAt: new Date(),
    };

    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    const updatedUser = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, userId))
      .returning();

    if (!updatedUser.length) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Update role permissions if provided
    if (permissions && roleId) {
      await db
        .update(roles)
        .set({ permissions, updatedAt: new Date() })
        .where(eq(roles.id, roleId));
    }

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
    const { id } = await params;
    const userId = parseInt(id);
    const deletedUser = await db
      .delete(users)
      .where(eq(users.id, userId))
      .returning();

    if (!deletedUser.length) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
  }
}

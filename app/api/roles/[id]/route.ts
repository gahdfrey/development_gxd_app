import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { roles } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { APP_MODULES, APP_PERMISSIONS } from "@/lib/constants";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const role = await db
      .select()
      .from(roles)
      .where(eq(roles.id, parseInt(id)))
      .limit(1);

    if (role.length === 0) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 });
    }

    return NextResponse.json(role[0]);
  } catch (error) {
    console.error("Error fetching role:", error);
    return NextResponse.json(
      { error: "Failed to fetch role" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, description, permissions } = body;

    // Build update object
    const updateData: any = { updatedAt: new Date() };
    if (name) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (permissions) updateData.permissions = permissions;

    if (permissions) {
      // Validate the permissions structure
      for (const module of APP_MODULES) {
        if (!permissions[module.key]) {
          // If permissions are being updated, ensure all modules are present or at least handle it gracefully
          // For now, let's allow partial updates if we merge, but here we seem to be replacing the object.
          // Let's assume the frontend sends the full permission object.
          // If a module is missing, it might be an issue if we enforce it.
          // Given the previous code enforced it, let's verify if not null.
          if (permissions[module.key] === undefined) {
            // It's acceptable if we just want to update name/description, but if permissions is provided, it should likely be complete or we merge.
            // Simplest approach: Expect full permissions object if provided.
            return NextResponse.json(
              { error: `Missing permissions for module: ${module.key}` },
              { status: 400 }
            );
          }
        }

        if (permissions[module.key]) {
          for (const perm of APP_PERMISSIONS) {
            if (typeof permissions[module.key][perm.key] !== "boolean") {
              return NextResponse.json(
                {
                  error: `Invalid permission value for ${module.key}.${perm.key}`,
                },
                { status: 400 }
              );
            }
          }
        }
      }
    }

    // Update the role
    const updatedRole = await db
      .update(roles)
      .set(updateData)
      .where(eq(roles.id, parseInt(id)))
      .returning();

    if (updatedRole.length === 0) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 });
    }

    return NextResponse.json(updatedRole[0]);
  } catch (error) {
    console.error("Error updating role:", error);
    return NextResponse.json(
      { error: "Failed to update role" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check if any users are assigned to this role
    // This requires importing users table or checking constraints.
    // Assuming simple delete for now, or we should check for foreign key constraints.
    // The schema has users.roleId referencing roles.id. If we delete, it might fail if users exist.

    // Attempt delete
    const deletedRole = await db
      .delete(roles)
      .where(eq(roles.id, parseInt(id)))
      .returning();

    if (deletedRole.length === 0) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Role deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting role:", error);
    // Postgres foreign key violation code is 23503
    if (error.code === "23503") {
      return NextResponse.json(
        {
          error:
            "Cannot delete role because it is assigned to users. Reassign users first.",
        },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to delete role" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { roles } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { permissions } = body;

    if (!permissions) {
      return NextResponse.json(
        { error: "Permissions are required" },
        { status: 400 }
      );
    }

    // Validate the permissions structure
    const requiredModules = [
      "dashboard",
      "appointments",
      "my-appointments",
      "users",
    ];
    const requiredPermissions = ["view", "add", "edit", "delete", "print"];

    for (const module of requiredModules) {
      if (!permissions[module]) {
        return NextResponse.json(
          { error: `Missing permissions for module: ${module}` },
          { status: 400 }
        );
      }

      for (const perm of requiredPermissions) {
        if (typeof permissions[module][perm] !== "boolean") {
          return NextResponse.json(
            { error: `Invalid permission value for ${module}.${perm}` },
            { status: 400 }
          );
        }
      }
    }

    // Update the role permissions
    const updatedRole = await db
      .update(roles)
      .set({
        permissions,
        updatedAt: new Date(),
      })
      .where(eq(roles.id, parseInt(id)))
      .returning();

    if (updatedRole.length === 0) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 });
    }

    return NextResponse.json(updatedRole[0]);
  } catch (error) {
    console.error("Error updating role permissions:", error);
    return NextResponse.json(
      { error: "Failed to update role permissions" },
      { status: 500 }
    );
  }
}

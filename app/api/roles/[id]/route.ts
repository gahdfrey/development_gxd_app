import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { roles } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { APP_MODULES, APP_PERMISSIONS } from "@/lib/constants";
import { getOrgId } from "@/lib/org";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const orgId = await getOrgId();
    if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    const role = await db
      .select()
      .from(roles)
      .where(and(eq(roles.id, parseInt(id)), eq(roles.organisationId, orgId)))
      .limit(1);

    if (role.length === 0) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 });
    }

    return NextResponse.json(role[0]);
  } catch (error) {
    console.error("Error fetching role:", error);
    return NextResponse.json({ error: "Failed to fetch role" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const orgId = await getOrgId();
    if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await request.json();
    const { name, description, permissions } = body;

    const updateData: any = { updatedAt: new Date() };
    if (name) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (permissions) updateData.permissions = permissions;

    if (permissions) {
      for (const module of APP_MODULES) {
        if (!permissions[module.key]) {
          if (permissions[module.key] === undefined) {
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
                { error: `Invalid permission value for ${module.key}.${perm.key}` },
                { status: 400 }
              );
            }
          }
        }
      }
    }

    const updatedRole = await db
      .update(roles)
      .set(updateData)
      .where(and(eq(roles.id, parseInt(id)), eq(roles.organisationId, orgId)))
      .returning();

    if (updatedRole.length === 0) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 });
    }

    return NextResponse.json(updatedRole[0]);
  } catch (error) {
    console.error("Error updating role:", error);
    return NextResponse.json({ error: "Failed to update role" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const orgId = await getOrgId();
    if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    const deletedRole = await db
      .delete(roles)
      .where(and(eq(roles.id, parseInt(id)), eq(roles.organisationId, orgId)))
      .returning();

    if (deletedRole.length === 0) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Role deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting role:", error);
    if (error.code === "23503") {
      return NextResponse.json(
        { error: "Cannot delete role because it is assigned to users. Reassign users first." },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: "Failed to delete role" }, { status: 500 });
  }
}

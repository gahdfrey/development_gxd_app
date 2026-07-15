import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { roles, users } from "@/lib/db/schema";
import { eq, and, isNull, count } from "drizzle-orm";
import { APP_MODULES, APP_PERMISSIONS } from "@/lib/constants";
import { requirePermission, requireAuth } from "@/lib/authz";
import { logAudit } from "@/lib/audit";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authz = await requireAuth();
    if (authz.error) return authz.error;
    const orgId = authz.ctx.orgId;

    const { id } = await params;

    const role = await db
      .select()
      .from(roles)
      .where(and(eq(roles.id, parseInt(id)), eq(roles.organisationId, orgId), isNull(roles.deletedAt)))
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
    const authz = await requirePermission([["roles", "edit"]]);
    if (authz.error) return authz.error;
    const { orgId, userId: actorId, userEmail: actorEmail } = authz.ctx;

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
      .where(and(eq(roles.id, parseInt(id)), eq(roles.organisationId, orgId), isNull(roles.deletedAt)))
      .returning();

    if (updatedRole.length === 0) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 });
    }

    void logAudit({
      organisationId: orgId,
      userId: actorId,
      userEmail: actorEmail,
      action: "update",
      entityType: "role",
      entityId: updatedRole[0].id,
      details: { name: updatedRole[0].name, permissionsChanged: Boolean(permissions) },
    });

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
    const authz = await requirePermission([["roles", "delete"]]);
    if (authz.error) return authz.error;
    const { orgId, userId: actorId, userEmail: actorEmail } = authz.ctx;

    const { id } = await params;
    const roleId = parseInt(id);

    // Block deletion while active users still hold this role.
    const [{ value: assignedCount }] = await db
      .select({ value: count() })
      .from(users)
      .where(and(eq(users.roleId, roleId), eq(users.organisationId, orgId), isNull(users.deletedAt)));

    if (assignedCount > 0) {
      return NextResponse.json(
        { error: "Cannot delete role because it is assigned to users. Reassign users first." },
        { status: 400 }
      );
    }

    const [target] = await db
      .select({ id: roles.id, name: roles.name })
      .from(roles)
      .where(and(eq(roles.id, roleId), eq(roles.organisationId, orgId), isNull(roles.deletedAt)));

    if (!target) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 });
    }

    // Soft delete; rename to free the unique (name, org) index.
    await db
      .update(roles)
      .set({
        deletedAt: new Date(),
        name: `${target.name}__deleted_${Date.now()}`,
        updatedAt: new Date(),
      })
      .where(eq(roles.id, roleId));

    void logAudit({
      organisationId: orgId,
      userId: actorId,
      userEmail: actorEmail,
      action: "delete",
      entityType: "role",
      entityId: roleId,
      details: { name: target.name, softDelete: true },
    });

    return NextResponse.json({ message: "Role deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting role:", error);
    return NextResponse.json({ error: "Failed to delete role" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "./db";
import { roles, users } from "./db/schema";
import { APP_MODULES, APP_PERMISSIONS } from "./constants";

/** Human-readable label for a permission check, e.g. ["patients","add"] → "Add in Patients". */
function labelForCheck([module, action]: PermissionCheck): string {
  const titleCase = (s: string) =>
    s.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const moduleLabel = APP_MODULES.find((m) => m.key === module)?.label ?? titleCase(module);
  const actionLabel = APP_PERMISSIONS.find((p) => p.key === action)?.label ?? titleCase(action);
  return `${actionLabel} in ${moduleLabel}`;
}

/** [module, action] pair, e.g. ["patients", "add"] */
export type PermissionCheck = [module: string, action: string];

export interface AuthContext {
  userId: number;
  userEmail: string | null;
  orgId: number;
  isPlatformAdmin: boolean;
  patientId: number | null;
  roleName: string | null;
  permissions: Record<string, unknown> | null;
}

/**
 * Resolve the current session into an auth context with the user's role
 * permissions loaded from the database. Returns null when there is no valid
 * session or the user has been deactivated (soft-deleted) — so deactivation
 * takes effect immediately, even for live JWT sessions.
 */
export async function getAuthContext(): Promise<AuthContext | null> {
  const session = await auth();
  if (!session?.user) return null;

  const userId = Number(session.user.id);
  if (!Number.isFinite(userId) || userId <= 0) return null;

  const rows = await db
    .select({
      orgId: users.organisationId,
      email: users.email,
      isPlatformAdmin: users.isPlatformAdmin,
      patientId: users.patientId,
      deletedAt: users.deletedAt,
      roleName: roles.name,
      permissions: roles.permissions,
    })
    .from(users)
    .leftJoin(roles, eq(users.roleId, roles.id))
    .where(eq(users.id, userId))
    .limit(1);

  const row = rows[0];
  if (!row || row.deletedAt) return null;

  return {
    userId,
    userEmail: row.email,
    orgId: row.orgId,
    isPlatformAdmin: row.isPlatformAdmin ?? false,
    patientId: row.patientId ?? null,
    roleName: row.roleName,
    permissions: (row.permissions as Record<string, unknown> | null) ?? null,
  };
}

/**
 * Check one module/action pair against a permissions payload. Handles both
 * formats present in this codebase: array style from seeds
 * (`{ patients: ["add", "view"] }`) and object style from the roles UI
 * (`{ patients: { add: true, view: true } }`).
 */
export function permissionGranted(
  permissions: Record<string, unknown> | null,
  module: string,
  action: string,
): boolean {
  if (!permissions) return false;
  const entry = permissions[module];
  if (Array.isArray(entry)) return entry.includes(action);
  if (entry && typeof entry === "object") {
    return (entry as Record<string, unknown>)[action] === true;
  }
  return false;
}

/** True if the context passes ANY of the given checks. Platform admins always pass. */
export function hasAnyPermission(ctx: AuthContext, checks: PermissionCheck[]): boolean {
  if (ctx.isPlatformAdmin) return true;
  return checks.some(([module, action]) => permissionGranted(ctx.permissions, module, action));
}

export type AuthzResult = { ctx: AuthContext; error?: never } | { ctx?: never; error: NextResponse };

/**
 * Require a valid session AND at least one of the given permissions.
 * Usage in a route handler:
 *
 *   const authz = await requirePermission([["users", "delete"]]);
 *   if (authz.error) return authz.error;
 *   const { ctx } = authz; // ctx.orgId, ctx.userId available
 */
export async function requirePermission(checks: PermissionCheck[]): Promise<AuthzResult> {
  const ctx = await getAuthContext();
  if (!ctx) {
    return {
      error: NextResponse.json(
        { error: "Your session has expired or you are not signed in. Please log in again." },
        { status: 401 },
      ),
    };
  }
  if (!hasAnyPermission(ctx, checks)) {
    // Name the exact permission(s) required so the user (or an admin) knows
    // precisely what to grant. Any one of the listed permissions is enough.
    const required = checks.map(labelForCheck);
    const roleName = ctx.roleName ?? "your role";
    const requiredText =
      required.length === 1
        ? `the "${required[0]}" permission`
        : `one of these permissions: ${required.map((r) => `"${r}"`).join(", ")}`;
    return {
      error: NextResponse.json(
        {
          error: `Permission denied. The "${roleName}" role needs ${requiredText} to do this. Ask an administrator to enable it under Roles.`,
          requiredPermissions: checks.map(([module, action]) => ({ module, action })),
          role: ctx.roleName,
        },
        { status: 403 },
      ),
    };
  }
  return { ctx };
}

/** Require a valid session only (no specific permission). */
export async function requireAuth(): Promise<AuthzResult> {
  const ctx = await getAuthContext();
  if (!ctx) {
    return {
      error: NextResponse.json(
        { error: "Your session has expired or you are not signed in. Please log in again." },
        { status: 401 },
      ),
    };
  }
  return { ctx };
}

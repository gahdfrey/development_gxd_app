import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, roles } from "@/lib/db/schema";
import { eq, and, ilike } from "drizzle-orm";
import { auth } from "@/auth";
import bcrypt from "bcryptjs";
import { APP_MODULES, APP_PERMISSIONS } from "@/lib/constants";

function buildSuperAdminPermissions() {
  const permissions: Record<string, Record<string, boolean>> = {};
  for (const mod of APP_MODULES) {
    permissions[mod.key] = {};
    for (const perm of APP_PERMISSIONS) {
      permissions[mod.key][perm.key] = true;
    }
  }
  return permissions;
}

async function getOrCreateSuperAdminRole(organisationId: number): Promise<number> {
  const [existing] = await db
    .select({ id: roles.id })
    .from(roles)
    .where(and(ilike(roles.name, "Super Admin"), eq(roles.organisationId, organisationId)));

  if (existing) return existing.id;

  const [created] = await db
    .insert(roles)
    .values({
      organisationId,
      name: "Super Admin",
      description: "Full access to all modules",
      permissions: buildSuperAdminPermissions(),
    })
    .returning({ id: roles.id });

  return created.id;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!(session?.user as any)?.isPlatformAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id: idStr } = await params;
    const organisationId = parseInt(idStr);
    if (isNaN(organisationId)) {
      return NextResponse.json({ error: "Invalid organisation ID" }, { status: 400 });
    }

    const body = await request.json();
    const { firstname, lastname, username, email, password } = body;

    if (!firstname?.trim() || !lastname?.trim() || !username?.trim() || !email?.trim() || !password) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }

    // Run duplicate checks and password hash in parallel
    const [existingEmail, existingUsername, hashedPassword] = await Promise.all([
      db.select({ id: users.id }).from(users)
        .where(and(ilike(users.email, email.trim()), eq(users.organisationId, organisationId)))
        .limit(1),
      db.select({ id: users.id }).from(users)
        .where(and(ilike(users.username, username.trim()), eq(users.organisationId, organisationId)))
        .limit(1),
      bcrypt.hash(password, 10),
    ]);

    if (existingEmail.length > 0) {
      return NextResponse.json({ error: "A user with this email already exists in this organisation" }, { status: 409 });
    }
    if (existingUsername.length > 0) {
      return NextResponse.json({ error: "This username is already taken in this organisation" }, { status: 409 });
    }

    // Get or create the Super Admin role for this org, then create the user
    const superAdminRoleId = await getOrCreateSuperAdminRole(organisationId);

    const [user] = await db
      .insert(users)
      .values({
        firstname: firstname.trim(),
        lastname: lastname.trim(),
        username: username.trim(),
        email: email.trim(),
        password: hashedPassword,
        organisationId,
        roleId: superAdminRoleId,
      })
      .returning({
        id: users.id,
        email: users.email,
        firstname: users.firstname,
        lastname: users.lastname,
        username: users.username,
        organisationId: users.organisationId,
      });

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    console.error("Error creating org admin user:", error);
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
  }
}

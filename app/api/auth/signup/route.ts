import { NextRequest, NextResponse } from "next/server";
import {
  createUser,
  validateRegistrationData,
} from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq, and, ilike } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      firstname,
      lastname,
      username,
      email,
      password,
      confirmPassword,
      roleId,
      organisationId,
    } = body;

    if (!organisationId) {
      return NextResponse.json({ error: "organisationId is required" }, { status: 400 });
    }

    const orgId = parseInt(organisationId);
    if (isNaN(orgId)) {
      return NextResponse.json({ error: "Invalid organisationId" }, { status: 400 });
    }

    const validation = validateRegistrationData({ firstname, lastname, username, email, password, confirmPassword });
    if (!validation.isValid) {
      return NextResponse.json({ error: "Validation failed", errors: validation.errors }, { status: 400 });
    }

    // Uniqueness checks are scoped per org (composite unique index)
    const [existingByEmail] = await db
      .select({ id: users.id })
      .from(users)
      .where(and(ilike(users.email, email), eq(users.organisationId, orgId)))
      .limit(1);

    if (existingByEmail) {
      return NextResponse.json({ error: "User with this email already exists" }, { status: 409 });
    }

    const [existingByUsername] = await db
      .select({ id: users.id })
      .from(users)
      .where(and(ilike(users.username, username), eq(users.organisationId, orgId)))
      .limit(1);

    if (existingByUsername) {
      return NextResponse.json({ error: "Username is already taken" }, { status: 409 });
    }

    const user = await createUser({
      firstname,
      lastname,
      username,
      email,
      password,
      organisationId: orgId,
      roleId: roleId ? parseInt(roleId) : undefined,
    });

    return NextResponse.json(
      { message: "User created successfully", user: { id: user.id, username: user.username, email: user.email } },
      { status: 201 }
    );
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

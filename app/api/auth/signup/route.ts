import { NextRequest, NextResponse } from "next/server";
import {
  createOrganisationWithSuperadmin,
  validateRegistrationData,
} from "@/lib/auth";

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
      organisationName,
    } = body;

    if (!organisationName || !String(organisationName).trim()) {
      return NextResponse.json(
        { error: "Validation failed", errors: { organisationName: "Organisation name is required" } },
        { status: 400 }
      );
    }

    const validation = validateRegistrationData({ firstname, lastname, username, email, password, confirmPassword });
    if (!validation.isValid) {
      return NextResponse.json({ error: "Validation failed", errors: validation.errors }, { status: 400 });
    }

    // Signup always creates a brand-new organisation, so there is no
    // existing org whose users to collide with.
    const { user } = await createOrganisationWithSuperadmin({
      organisationName: String(organisationName).trim(),
      firstname,
      lastname,
      username,
      email,
      password,
    });

    return NextResponse.json(
      { message: "Organisation and user created successfully", user: { id: user.id, username: user.username, email: user.email } },
      { status: 201 }
    );
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

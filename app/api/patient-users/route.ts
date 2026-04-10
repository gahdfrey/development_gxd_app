import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, roles } from "@/lib/db/schema";
import { desc, eq, ilike, and, or } from "drizzle-orm";

// GET /api/patient-users — returns only users whose role is "Patient"
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");

    const isPatient = ilike(roles.name, "patient");

    let query = db
      .select({
        id: users.id,
        username: users.username,
        email: users.email,
        firstname: users.firstname,
        lastname: users.lastname,
        patientId: users.patientId,
        roleId: users.roleId,
        roleName: roles.name,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .leftJoin(roles, eq(users.roleId, roles.id));

    if (search && search.trim() !== "") {
      const searchTerm = `%${search.trim()}%`;
      query = query.where(
        and(
          isPatient,
          or(
            ilike(users.firstname, searchTerm),
            ilike(users.lastname, searchTerm),
            ilike(users.email, searchTerm),
          ),
        ),
      ) as typeof query;
    } else {
      query = query.where(isPatient) as typeof query;
    }

    const patientUsers = await query.orderBy(desc(users.createdAt));

    return NextResponse.json(patientUsers);
  } catch (error) {
    console.error("Error fetching patient users:", error);
    return NextResponse.json(
      { error: "Failed to fetch patient users" },
      { status: 500 },
    );
  }
}

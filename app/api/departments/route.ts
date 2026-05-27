import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { departments } from "@/lib/db/schema";
import { asc, eq, and } from "drizzle-orm";
import { getOrgId } from "@/lib/org";

export async function GET() {
  try {
    const orgId = await getOrgId();
    if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const allDepartments = await db
      .select()
      .from(departments)
      .where(eq(departments.organisationId, orgId))
      .orderBy(asc(departments.name));

    return NextResponse.json(allDepartments, { status: 200 });
  } catch (error) {
    console.error("Error fetching departments:", error);
    return NextResponse.json({ error: "Failed to fetch departments" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const orgId = await getOrgId();
    if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { name } = body;

    if (!name?.trim()) return NextResponse.json({ error: "Department name is required" }, { status: 400 });

    const [newDepartment] = await db
      .insert(departments)
      .values({ organisationId: orgId, name: name.trim() })
      .returning();

    return NextResponse.json(newDepartment, { status: 201 });
  } catch (error: any) {
    console.error("Error creating department:", error);
    if (error.code === "23505") return NextResponse.json({ error: "A department with this name already exists" }, { status: 409 });
    return NextResponse.json({ error: "Failed to create department" }, { status: 500 });
  }
}

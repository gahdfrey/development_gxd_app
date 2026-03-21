import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { departments } from "@/lib/db/schema";
import { asc } from "drizzle-orm";

// GET /api/departments - Get all departments
export async function GET() {
  try {
    const allDepartments = await db
      .select()
      .from(departments)
      .orderBy(asc(departments.name));

    return NextResponse.json(allDepartments, { status: 200 });
  } catch (error) {
    console.error("Error fetching departments:", error);
    return NextResponse.json(
      { error: "Failed to fetch departments" },
      { status: 500 },
    );
  }
}

// POST /api/departments - Create a new department
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name } = body;

    if (!name || name.trim() === "") {
      return NextResponse.json(
        { error: "Department name is required" },
        { status: 400 },
      );
    }

    const [newDepartment] = await db
      .insert(departments)
      .values({ name: name.trim() })
      .returning();

    return NextResponse.json(newDepartment, { status: 201 });
  } catch (error: any) {
    console.error("Error creating department:", error);

    if (error.code === "23505") {
      return NextResponse.json(
        { error: "A department with this name already exists" },
        { status: 409 },
      );
    }

    return NextResponse.json(
      { error: "Failed to create department" },
      { status: 500 },
    );
  }
}

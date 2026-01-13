import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hmos } from "@/lib/db/schema";
import { desc } from "drizzle-orm";

// GET /api/hmo - Get all HMOs
export async function GET() {
  try {
    const allHMOs = await db.select().from(hmos).orderBy(desc(hmos.createdAt));

    return NextResponse.json(allHMOs, { status: 200 });
  } catch (error) {
    console.error("Error fetching HMOs:", error);
    return NextResponse.json(
      { error: "Failed to fetch HMOs" },
      { status: 500 }
    );
  }
}

// POST /api/hmo - Create a new HMO
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description } = body;

    // Validate required fields
    if (!name || name.trim() === "") {
      return NextResponse.json(
        { error: "HMO name is required" },
        { status: 400 }
      );
    }

    // Insert new HMO
    const [newHMO] = await db
      .insert(hmos)
      .values({
        name: name.trim(),
        description: description?.trim() || null,
      })
      .returning();

    return NextResponse.json(newHMO, { status: 201 });
  } catch (error: any) {
    console.error("Error creating HMO:", error);

    // Handle unique constraint violation
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "HMO with this name already exists" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "Failed to create HMO" },
      { status: 500 }
    );
  }
}

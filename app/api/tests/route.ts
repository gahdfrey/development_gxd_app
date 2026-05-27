import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { labTests, departments } from "@/lib/db/schema";
import { eq, asc, and } from "drizzle-orm";
import { getOrgId } from "@/lib/org";

export async function GET() {
  try {
    const orgId = await getOrgId();
    if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const allTests = await db
      .select({
        id: labTests.id,
        name: labTests.name,
        price: labTests.price,
        departmentId: labTests.departmentId,
        departmentName: departments.name,
        createdAt: labTests.createdAt,
        updatedAt: labTests.updatedAt,
      })
      .from(labTests)
      .leftJoin(departments, eq(labTests.departmentId, departments.id))
      .where(eq(labTests.organisationId, orgId))
      .orderBy(asc(labTests.name));

    return NextResponse.json(allTests, { status: 200 });
  } catch (error) {
    console.error("Error fetching tests:", error);
    return NextResponse.json({ error: "Failed to fetch tests" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const orgId = await getOrgId();
    if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { name, price, departmentId } = body;

    if (!name?.trim()) return NextResponse.json({ error: "Test name is required" }, { status: 400 });
    if (!departmentId || isNaN(parseInt(departmentId))) return NextResponse.json({ error: "A valid department is required" }, { status: 400 });

    const parsedPrice = parseInt(price);
    if (isNaN(parsedPrice) || parsedPrice < 1) return NextResponse.json({ error: "Price must be a positive number" }, { status: 400 });

    const [newTest] = await db
      .insert(labTests)
      .values({ organisationId: orgId, name: name.trim(), price: parsedPrice, departmentId: parseInt(departmentId) })
      .returning();

    return NextResponse.json(newTest, { status: 201 });
  } catch (error: any) {
    console.error("Error creating test:", error);
    if (error.code === "23503") return NextResponse.json({ error: "Selected department does not exist" }, { status: 400 });
    return NextResponse.json({ error: "Failed to create test" }, { status: 500 });
  }
}

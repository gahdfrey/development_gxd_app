import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requests, patients, departments, labTests, users, requestResults } from "@/lib/db/schema";
import { eq, desc, ilike, and, sql } from "drizzle-orm";
import { auth } from "@/auth";
import { getOrgId } from "@/lib/org";
import { requirePermission } from "@/lib/authz";
import { logAudit } from "@/lib/audit";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const orgId = await getOrgId();
    if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const departmentFilter = searchParams.get("department");

    const conditions: any[] = [eq(requests.organisationId, orgId)];
    if (departmentFilter) conditions.push(ilike(departments.name, `%${departmentFilter}%`));

    const allRequests = await db
      .select({
        id: requests.id,
        status: requests.status,
        paymentStatus: requests.paymentStatus,
        createdAt: requests.createdAt,
        patientId: requests.patientId,
        patientFirstname: patients.firstname,
        patientLastname: patients.lastname,
        departmentId: requests.departmentId,
        departmentName: departments.name,
        testId: requests.testId,
        testName: labTests.name,
        testPrice: labTests.price,
        requestedById: requests.requestedBy,
        requestedByFirstname: users.firstname,
        requestedByLastname: users.lastname,
        hasResult: sql<boolean>`EXISTS (
          SELECT 1 FROM request_results
          WHERE request_results.request_id = ${requests.id}
        )`,
      })
      .from(requests)
      .leftJoin(patients, eq(requests.patientId, patients.id))
      .leftJoin(departments, eq(requests.departmentId, departments.id))
      .leftJoin(labTests, eq(requests.testId, labTests.id))
      .leftJoin(users, eq(requests.requestedBy, users.id))
      .where(and(...conditions))
      .orderBy(desc(requests.createdAt));

    return NextResponse.json(allRequests, { status: 200 });
  } catch (error) {
    console.error("Error fetching requests:", error);
    return NextResponse.json({ error: "Failed to fetch requests" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Test/imaging requests are raised by clinicians during consultations.
    const authz = await requirePermission([
      ["my-appointments", "add"],
      ["my-appointments", "edit"],
      ["appointments", "add"],
      ["appointments", "edit"],
      ["laboratory", "add"],
      ["radiography", "add"],
    ]);
    if (authz.error) return authz.error;
    const { orgId, userId: requestedBy, userEmail: actorEmail } = authz.ctx;
    const body = await request.json();
    const { patientId, departmentId, testId, appointmentId } = body;

    if (!patientId) return NextResponse.json({ error: "Patient is required" }, { status: 400 });
    if (!departmentId) return NextResponse.json({ error: "Department is required" }, { status: 400 });
    if (!testId) return NextResponse.json({ error: "Test is required" }, { status: 400 });

    const [newRequest] = await db
      .insert(requests)
      .values({
        organisationId: orgId,
        patientId: parseInt(patientId),
        departmentId: parseInt(departmentId),
        testId: parseInt(testId),
        requestedBy,
        appointmentId: appointmentId ? parseInt(appointmentId) : null,
        status: "pending",
        paymentStatus: "not_paid",
      })
      .returning();

    void logAudit({
      organisationId: orgId,
      userId: requestedBy,
      userEmail: actorEmail,
      action: "create",
      entityType: "request",
      entityId: newRequest.id,
      details: { patientId: newRequest.patientId, departmentId: newRequest.departmentId, testId: newRequest.testId },
    });

    return NextResponse.json(newRequest, { status: 201 });
  } catch (error: any) {
    console.error("Error creating request:", error);
    if (error.code === "23503") return NextResponse.json({ error: "Invalid patient, department, or test reference" }, { status: 400 });
    return NextResponse.json({ error: "Failed to create request" }, { status: 500 });
  }
}

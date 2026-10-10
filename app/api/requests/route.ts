import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requests, patients, departments, labTests, users, requestResults } from "@/lib/db/schema";
import { eq, desc, ilike, and, sql } from "drizzle-orm";
import { auth } from "@/auth";
import { getOrgId } from "@/lib/org";
import { requirePermission } from "@/lib/authz";
import { logAudit } from "@/lib/audit";
import { getPgErrorCode } from "@/lib/db/pg-error";
import { raiseAuthorizationsForOrders } from "@/lib/billing/authorizations";
import { priceBillItems, itemKey, billingSummary } from "@/lib/billing/pricing";
import { getItemAuthorizations, toAuthorizationSummary } from "@/lib/billing/authorizations";

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
        // Structured results: does the test have result fields, and have
        // values been entered (lib/lab).
        hasParameters: sql<boolean>`EXISTS (
          SELECT 1 FROM lab_test_parameters p
          WHERE p.test_id = ${requests.testId} AND p.deleted_at IS NULL
        )`,
        hasValues: sql<boolean>`EXISTS (
          SELECT 1 FROM lab_result_values v WHERE v.request_id = ${requests.id}
        )`,
        abnormalCount: sql<number>`(
          SELECT count(*)::int FROM lab_result_values v WHERE v.request_id = ${requests.id} AND v.flag <> 'normal'
        )`,
      })
      .from(requests)
      .leftJoin(patients, eq(requests.patientId, patients.id))
      .leftJoin(departments, eq(requests.departmentId, departments.id))
      .leftJoin(labTests, eq(requests.testId, labTests.id))
      .leftJoin(users, eq(requests.requestedBy, users.id))
      .where(and(...conditions))
      .orderBy(desc(requests.createdAt));

    // Finance desk view: attach who-pays-what (HMO tariff vs self-pay) to
    // each unpaid row. Opt-in, since lab/radiology worklists don't need it.
    if (searchParams.get("withBilling") === "1") {
      const unpaid = allRequests.filter((r) => r.paymentStatus !== "paid");
      const priced = await priceBillItems(orgId, unpaid.map((r) => ({ itemType: "request" as const, itemId: r.id })));
      const auths = await getItemAuthorizations(db, orgId, [...priced.values()].filter((p) => p.basis === "covered"));
      return NextResponse.json(
        allRequests.map((r) => {
          const billing = billingSummary(priced.get(itemKey("request", r.id)));
          return {
            ...r,
            billing: billing && { ...billing, authorization: toAuthorizationSummary(auths.get(itemKey("request", r.id))) },
          };
        }),
        { status: 200 },
      );
    }

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

    // If the patient's HMO needs pre-authorization for this test, open the
    // request on the finance desk's authorization worklist.
    await raiseAuthorizationsForOrders(orgId, [{ itemType: "request", itemId: newRequest.id }], requestedBy);

    return NextResponse.json(newRequest, { status: 201 });
  } catch (error: any) {
    console.error("Error creating request:", error);
    if (getPgErrorCode(error) === "23503") return NextResponse.json({ error: "Invalid patient, department, or test reference" }, { status: 400 });
    return NextResponse.json({ error: "Failed to create request" }, { status: 500 });
  }
}

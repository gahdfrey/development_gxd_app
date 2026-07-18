import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { dataRequests, patients } from "@/lib/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { getAuthContext, hasAnyPermission } from "@/lib/authz";
import { logAudit } from "@/lib/audit";

const VALID_TYPES = ["rectification", "erasure"];

/**
 * GET /api/data-requests
 *  - staff (users/setup view) → all requests in their org
 *  - a patient portal account  → only their own requests
 */
export async function GET() {
  try {
    const ctx = await getAuthContext();
    if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const isStaff = hasAnyPermission(ctx, [
      ["data-requests", "view"],
    ]);

    const rows = await db
      .select({
        id: dataRequests.id,
        patientId: dataRequests.patientId,
        patientFirstname: patients.firstname,
        patientLastname: patients.lastname,
        patientMrn: patients.mrn,
        type: dataRequests.type,
        status: dataRequests.status,
        details: dataRequests.details,
        resolutionNote: dataRequests.resolutionNote,
        resolvedBy: dataRequests.resolvedBy,
        resolvedAt: dataRequests.resolvedAt,
        createdAt: dataRequests.createdAt,
      })
      .from(dataRequests)
      .leftJoin(patients, eq(dataRequests.patientId, patients.id))
      .where(
        isStaff
          ? eq(dataRequests.organisationId, ctx.orgId)
          : and(
              eq(dataRequests.organisationId, ctx.orgId),
              eq(dataRequests.patientId, ctx.patientId ?? -1),
            ),
      )
      .orderBy(desc(dataRequests.createdAt));

    return NextResponse.json(rows);
  } catch (error) {
    console.error("Error fetching data requests:", error);
    return NextResponse.json({ error: "Failed to fetch data requests" }, { status: 500 });
  }
}

/**
 * POST /api/data-requests — a patient submits a rectification/erasure request.
 * Body: { type, details }
 */
export async function POST(request: NextRequest) {
  try {
    const ctx = await getAuthContext();
    if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (!ctx.patientId) {
      return NextResponse.json(
        { error: "Only patient accounts can submit a data request." },
        { status: 403 },
      );
    }

    const body = await request.json();
    const { type, details } = body;

    if (!type || !VALID_TYPES.includes(type)) {
      return NextResponse.json(
        { error: `type is required and must be one of: ${VALID_TYPES.join(", ")}` },
        { status: 400 },
      );
    }
    if (!details?.trim()) {
      return NextResponse.json(
        { error: "Please describe your request." },
        { status: 400 },
      );
    }

    // Confirm the patient belongs to this org.
    const [patient] = await db
      .select({ id: patients.id })
      .from(patients)
      .where(and(eq(patients.id, ctx.patientId), eq(patients.organisationId, ctx.orgId)));
    if (!patient) {
      return NextResponse.json({ error: "Patient record not found." }, { status: 404 });
    }

    const [created] = await db
      .insert(dataRequests)
      .values({
        organisationId: ctx.orgId,
        patientId: ctx.patientId,
        requestedByUserId: ctx.userId,
        type,
        details: details.trim(),
      })
      .returning();

    void logAudit({
      organisationId: ctx.orgId,
      userId: ctx.userId,
      userEmail: ctx.userEmail,
      action: "data_request.created",
      entityType: "data_request",
      entityId: created.id,
      details: { type, patientId: ctx.patientId },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("Error creating data request:", error);
    return NextResponse.json({ error: "Failed to create data request" }, { status: 500 });
  }
}

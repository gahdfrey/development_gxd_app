import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { patientConsents, patients } from "@/lib/db/schema";
import { and, desc, eq, isNull } from "drizzle-orm";
import { getAuthContext, hasAnyPermission } from "@/lib/authz";
import { logAudit } from "@/lib/audit";

const VALID_PURPOSES = [
  "care_delivery",
  "data_sharing",
  "research",
  "insurance_claims",
];

/**
 * GET /api/patients/[id]/consents — list a patient's consent records.
 * Staff with patient access can view; a patient portal account can view
 * its own consents.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await getAuthContext();
    if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: idParam } = await params;
    const patientId = parseInt(idParam);
    if (isNaN(patientId)) {
      return NextResponse.json({ error: "Invalid patient ID" }, { status: 400 });
    }

    const isOwnRecord = ctx.patientId === patientId;
    const isStaff = hasAnyPermission(ctx, [
      ["patients", "view"],
      ["dashboard", "view"],
    ]);
    if (!isOwnRecord && !isStaff) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const consents = await db
      .select()
      .from(patientConsents)
      .where(and(
        eq(patientConsents.patientId, patientId),
        eq(patientConsents.organisationId, ctx.orgId),
      ))
      .orderBy(desc(patientConsents.grantedAt));

    return NextResponse.json(consents);
  } catch (error) {
    console.error("Error fetching consents:", error);
    return NextResponse.json({ error: "Failed to fetch consents" }, { status: 500 });
  }
}

/**
 * POST /api/patients/[id]/consents — record a new consent grant.
 * Body: { purpose, informationTypes?, expiresAt?, notes? }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await getAuthContext();
    if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: idParam } = await params;
    const patientId = parseInt(idParam);
    if (isNaN(patientId)) {
      return NextResponse.json({ error: "Invalid patient ID" }, { status: 400 });
    }

    const isOwnRecord = ctx.patientId === patientId;
    const isStaff = hasAnyPermission(ctx, [
      ["patients", "add"],
      ["patients", "edit"],
      ["dashboard", "add"],
      ["dashboard", "edit"],
    ]);
    if (!isOwnRecord && !isStaff) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const [patient] = await db
      .select({ id: patients.id })
      .from(patients)
      .where(and(
        eq(patients.id, patientId),
        eq(patients.organisationId, ctx.orgId),
        isNull(patients.deletedAt),
      ));
    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    const body = await request.json();
    const { purpose, informationTypes, expiresAt, notes } = body;

    if (!purpose || !VALID_PURPOSES.includes(purpose)) {
      return NextResponse.json(
        { error: `Purpose is required and must be one of: ${VALID_PURPOSES.join(", ")}` },
        { status: 400 },
      );
    }

    const [consent] = await db
      .insert(patientConsents)
      .values({
        organisationId: ctx.orgId,
        patientId,
        purpose,
        informationTypes: Array.isArray(informationTypes) ? informationTypes : null,
        status: "granted",
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        recordedBy: ctx.userId,
        notes: notes?.trim() || null,
      })
      .returning();

    void logAudit({
      organisationId: ctx.orgId,
      userId: ctx.userId,
      userEmail: ctx.userEmail,
      action: "consent.granted",
      entityType: "patient_consent",
      entityId: consent.id,
      details: { patientId, purpose, selfService: isOwnRecord },
    });

    return NextResponse.json(consent, { status: 201 });
  } catch (error) {
    console.error("Error recording consent:", error);
    return NextResponse.json({ error: "Failed to record consent" }, { status: 500 });
  }
}

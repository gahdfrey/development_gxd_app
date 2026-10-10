import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { patients, patientCoverages, hmos, eligibilityChecks, users } from "@/lib/db/schema";
import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import { requirePermission } from "@/lib/authz";
import { logAudit } from "@/lib/audit";
import {
  validateCoverage,
  hmoBelongsToOrg,
  endOtherActiveCoverages,
  syncPatientMirror,
  getActiveCoverages,
} from "@/lib/billing/coverage";
import { COVERAGE_EDIT, COVERAGE_VIEW } from "@/lib/billing/coverageAccess";

type Params = { params: Promise<{ id: string }> };

async function findPatient(orgId: number, idParam: string) {
  const id = parseInt(idParam);
  if (isNaN(id)) return null;
  const [p] = await db
    .select({ id: patients.id })
    .from(patients)
    .where(and(eq(patients.id, id), eq(patients.organisationId, orgId), isNull(patients.deletedAt)))
    .limit(1);
  return p ?? null;
}

// GET /api/patients/[id]/coverages — the patient's enrollee records (newest
// first) with each one's eligibility-check history, plus which coverage is
// in effect today.
export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const authz = await requirePermission(COVERAGE_VIEW);
    if (authz.error) return authz.error;
    const { orgId } = authz.ctx;

    const patient = await findPatient(orgId, (await params).id);
    if (!patient) return NextResponse.json({ error: "Patient not found" }, { status: 404 });

    const coverages = await db
      .select({
        id: patientCoverages.id,
        hmoId: patientCoverages.hmoId,
        hmoName: hmos.name,
        planName: patientCoverages.planName,
        membershipNumber: patientCoverages.membershipNumber,
        relationship: patientCoverages.relationship,
        principalName: patientCoverages.principalName,
        principalMembershipNumber: patientCoverages.principalMembershipNumber,
        primaryProvider: patientCoverages.primaryProvider,
        validFrom: patientCoverages.validFrom,
        validTo: patientCoverages.validTo,
        status: patientCoverages.status,
        notes: patientCoverages.notes,
        createdAt: patientCoverages.createdAt,
        updatedAt: patientCoverages.updatedAt,
      })
      .from(patientCoverages)
      .leftJoin(hmos, eq(patientCoverages.hmoId, hmos.id))
      .where(and(eq(patientCoverages.patientId, patient.id), eq(patientCoverages.organisationId, orgId), isNull(patientCoverages.deletedAt)))
      .orderBy(desc(patientCoverages.createdAt));

    const checks = coverages.length > 0
      ? await db
          .select({
            id: eligibilityChecks.id,
            coverageId: eligibilityChecks.coverageId,
            channel: eligibilityChecks.channel,
            result: eligibilityChecks.result,
            reference: eligibilityChecks.reference,
            notes: eligibilityChecks.notes,
            checkedAt: eligibilityChecks.checkedAt,
            checkedByFirstname: users.firstname,
            checkedByLastname: users.lastname,
          })
          .from(eligibilityChecks)
          .leftJoin(users, eq(eligibilityChecks.checkedBy, users.id))
          .where(inArray(eligibilityChecks.coverageId, coverages.map((c) => c.id)))
          .orderBy(desc(eligibilityChecks.checkedAt))
      : [];

    const inEffect = (await getActiveCoverages(db, orgId, [patient.id])).get(patient.id) ?? null;

    return NextResponse.json(
      {
        inEffect,
        coverages: coverages.map((c) => ({ ...c, checks: checks.filter((k) => k.coverageId === c.id) })),
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error fetching coverages:", error);
    return NextResponse.json({ error: "Failed to fetch coverages" }, { status: 500 });
  }
}

// POST /api/patients/[id]/coverages — enrol the patient with a payer. A new
// active coverage ends any other active one (one active coverage at a time).
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const authz = await requirePermission(COVERAGE_EDIT);
    if (authz.error) return authz.error;
    const { orgId, userId, userEmail } = authz.ctx;

    const patient = await findPatient(orgId, (await params).id);
    if (!patient) return NextResponse.json({ error: "Patient not found" }, { status: 404 });

    const validated = validateCoverage(await request.json());
    if ("error" in validated) return NextResponse.json({ error: validated.error }, { status: 400 });
    const fields = validated.value;

    if (!(await hmoBelongsToOrg(db, orgId, fields.hmoId))) {
      return NextResponse.json({ error: "HMO not found" }, { status: 404 });
    }

    const created = await db.transaction(async (tx) => {
      if (fields.status === "active") await endOtherActiveCoverages(tx, patient.id, null);
      const [row] = await tx
        .insert(patientCoverages)
        .values({ ...fields, organisationId: orgId, patientId: patient.id, createdBy: userId })
        .returning();
      await syncPatientMirror(tx, patient.id);
      return row;
    });

    void logAudit({
      organisationId: orgId,
      userId,
      userEmail,
      action: "create",
      entityType: "patient_coverage",
      entityId: created.id,
      details: { patientId: patient.id, hmoId: created.hmoId, membershipNumber: created.membershipNumber, status: created.status },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("Error creating coverage:", error);
    return NextResponse.json({ error: "Failed to create coverage" }, { status: 500 });
  }
}

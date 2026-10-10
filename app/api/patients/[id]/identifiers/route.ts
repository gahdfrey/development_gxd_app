import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { patientIdentifiers, patients } from "@/lib/db/schema";
import { and, asc, eq, isNull } from "drizzle-orm";
import { requirePermission } from "@/lib/authz";
import { logAudit } from "@/lib/audit";
import { MPI_EDIT, MPI_VIEW, IDENTIFIER_SYSTEMS } from "@/lib/mpi/access";


async function patientInOrg(orgId: number, idParam: string) {
  const id = parseInt(idParam);
  if (isNaN(id)) return null;
  const [p] = await db.select({ id: patients.id }).from(patients).where(and(eq(patients.id, id), eq(patients.organisationId, orgId), isNull(patients.deletedAt))).limit(1);
  return p ?? null;
}

// GET — the patient's additional identifiers.
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authz = await requirePermission(MPI_VIEW);
    if (authz.error) return authz.error;
    const p = await patientInOrg(authz.ctx.orgId, (await params).id);
    if (!p) return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    const rows = await db
      .select()
      .from(patientIdentifiers)
      .where(and(eq(patientIdentifiers.patientId, p.id), isNull(patientIdentifiers.deletedAt)))
      .orderBy(asc(patientIdentifiers.createdAt));
    return NextResponse.json(rows, { status: 200 });
  } catch (error) {
    console.error("Error fetching identifiers:", error);
    return NextResponse.json({ error: "Failed to fetch identifiers" }, { status: 500 });
  }
}

// POST { system, value, assigner?, notes? }
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authz = await requirePermission(MPI_EDIT);
    if (authz.error) return authz.error;
    const { orgId, userId, userEmail } = authz.ctx;
    const p = await patientInOrg(orgId, (await params).id);
    if (!p) return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    const body = await request.json();
    const system = String(body.system ?? "");
    const value = typeof body.value === "string" ? body.value.trim() : "";
    if (!IDENTIFIER_SYSTEMS.includes(system)) return NextResponse.json({ error: "Choose the type of number" }, { status: 400 });
    if (!value) return NextResponse.json({ error: "Enter the number" }, { status: 400 });

    // The same number on another active patient is a duplicate warning sign.
    const [clash] = await db
      .select({ patientId: patientIdentifiers.patientId })
      .from(patientIdentifiers)
      .innerJoin(patients, eq(patientIdentifiers.patientId, patients.id))
      .where(and(
        eq(patientIdentifiers.organisationId, orgId),
        eq(patientIdentifiers.system, system),
        eq(patientIdentifiers.value, value),
        isNull(patientIdentifiers.deletedAt),
        isNull(patients.deletedAt),
      ))
      .limit(1);
    if (clash && clash.patientId !== p.id) {
      return NextResponse.json({ error: `This number is already recorded on another patient (#${clash.patientId}) — possible duplicate record.` }, { status: 409 });
    }

    const [row] = await db
      .insert(patientIdentifiers)
      .values({
        organisationId: orgId,
        patientId: p.id,
        system,
        value,
        assigner: typeof body.assigner === "string" && body.assigner.trim() ? body.assigner.trim() : null,
        notes: typeof body.notes === "string" && body.notes.trim() ? body.notes.trim() : null,
        createdBy: userId,
      })
      .returning();
    void logAudit({ organisationId: orgId, userId, userEmail, action: "create", entityType: "patient_identifier", entityId: row.id, details: { patientId: p.id, system } });
    return NextResponse.json(row, { status: 201 });
  } catch (error) {
    console.error("Error adding identifier:", error);
    return NextResponse.json({ error: "Failed to add identifier" }, { status: 500 });
  }
}

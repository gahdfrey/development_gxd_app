import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { patientIdentifiers } from "@/lib/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { requirePermission } from "@/lib/authz";
import { logAudit } from "@/lib/audit";
import { MPI_EDIT } from "@/lib/mpi/access";

// DELETE — remove an identifier entered in error (soft delete).
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string; identifierId: string }> }) {
  try {
    const authz = await requirePermission(MPI_EDIT);
    if (authz.error) return authz.error;
    const { orgId, userId, userEmail } = authz.ctx;
    const p = await params;
    const [row] = await db
      .update(patientIdentifiers)
      .set({ deletedAt: new Date() })
      .where(and(
        eq(patientIdentifiers.id, parseInt(p.identifierId)),
        eq(patientIdentifiers.patientId, parseInt(p.id)),
        eq(patientIdentifiers.organisationId, orgId),
        isNull(patientIdentifiers.deletedAt),
      ))
      .returning({ id: patientIdentifiers.id, system: patientIdentifiers.system });
    if (!row) return NextResponse.json({ error: "Identifier not found" }, { status: 404 });
    void logAudit({ organisationId: orgId, userId, userEmail, action: "delete", entityType: "patient_identifier", entityId: row.id, details: { system: row.system } });
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error removing identifier:", error);
    return NextResponse.json({ error: "Failed to remove" }, { status: 500 });
  }
}

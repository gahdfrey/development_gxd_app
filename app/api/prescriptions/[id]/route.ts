import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { prescriptions } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { requirePermission } from "@/lib/authz";
import { logAudit } from "@/lib/audit";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idStr } = await params;
    const id = parseInt(idStr);
    if (isNaN(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

    const body = await req.json();
    const { paymentStatus, status, cancellationReason } = body;

    // ── Finance: mark paid (one-way) ────────────────────────────────────────
    if (paymentStatus === "paid") {
      const authz = await requirePermission([["finance", "edit"], ["finance", "add"]]);
      if (authz.error) return authz.error;
      const { orgId, userId: actorId, userEmail: actorEmail } = authz.ctx;
      const orgFilter = eq(prescriptions.organisationId, orgId);

      const [updated] = await db
        .update(prescriptions)
        .set({ paymentStatus: "paid", updatedAt: new Date() })
        .where(and(eq(prescriptions.id, id), eq(prescriptions.paymentStatus, "not_paid"), orgFilter))
        .returning({ id: prescriptions.id });

      if (!updated) {
        const [exists] = await db.select({ id: prescriptions.id }).from(prescriptions).where(and(eq(prescriptions.id, id), orgFilter));
        if (!exists) return NextResponse.json({ error: "Prescription not found" }, { status: 404 });
        return NextResponse.json({ error: "Already paid" }, { status: 400 });
      }

      void logAudit({
        organisationId: orgId,
        userId: actorId,
        userEmail: actorEmail,
        action: "update",
        entityType: "prescription",
        entityId: id,
        details: { paymentStatus: "paid" },
      });

      return NextResponse.json({ success: true }, { status: 200 });
    }

    // ── Pharmacy: dispatch ──────────────────────────────────────────────────
    if (status === "dispatched") {
      const authz = await requirePermission([["pharmacy", "edit"], ["pharmacy", "add"]]);
      if (authz.error) return authz.error;
      const { orgId, userId: actorId, userEmail: actorEmail } = authz.ctx;
      const orgFilter = eq(prescriptions.organisationId, orgId);

      const [current] = await db
        .select({ paymentStatus: prescriptions.paymentStatus, status: prescriptions.status })
        .from(prescriptions)
        .where(and(eq(prescriptions.id, id), orgFilter));

      if (!current) return NextResponse.json({ error: "Prescription not found" }, { status: 404 });
      if (current.paymentStatus !== "paid") return NextResponse.json({ error: "Cannot dispatch before payment is confirmed." }, { status: 400 });
      if (current.status !== "pending") return NextResponse.json({ error: "Prescription is already finalised." }, { status: 400 });

      await db.update(prescriptions)
        .set({ status: "dispatched", updatedAt: new Date() })
        .where(and(eq(prescriptions.id, id), orgFilter));

      void logAudit({
        organisationId: orgId,
        userId: actorId,
        userEmail: actorEmail,
        action: "update",
        entityType: "prescription",
        entityId: id,
        details: { status: "dispatched" },
      });

      return NextResponse.json({ success: true }, { status: 200 });
    }

    // ── Pharmacy: cancel ────────────────────────────────────────────────────
    if (status === "cancelled") {
      const authz = await requirePermission([
        ["pharmacy", "edit"],
        ["pharmacy", "add"],
        ["my-appointments", "edit"],
        ["appointments", "edit"],
      ]);
      if (authz.error) return authz.error;
      const { orgId, userId: actorId, userEmail: actorEmail } = authz.ctx;
      const orgFilter = eq(prescriptions.organisationId, orgId);

      if (!cancellationReason?.trim()) {
        return NextResponse.json({ error: "Cancellation reason is required." }, { status: 400 });
      }

      const [updated] = await db
        .update(prescriptions)
        .set({ status: "cancelled", cancellationReason: cancellationReason.trim(), updatedAt: new Date() })
        .where(and(eq(prescriptions.id, id), eq(prescriptions.status, "pending"), orgFilter))
        .returning({ id: prescriptions.id });

      if (!updated) {
        const [exists] = await db.select({ id: prescriptions.id }).from(prescriptions).where(and(eq(prescriptions.id, id), orgFilter));
        if (!exists) return NextResponse.json({ error: "Prescription not found" }, { status: 404 });
        return NextResponse.json({ error: "Prescription is already finalised." }, { status: 400 });
      }

      void logAudit({
        organisationId: orgId,
        userId: actorId,
        userEmail: actorEmail,
        action: "update",
        entityType: "prescription",
        entityId: id,
        details: { status: "cancelled", cancellationReason: cancellationReason.trim() },
      });

      return NextResponse.json({ success: true }, { status: 200 });
    }

    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  } catch (error) {
    console.error("Error updating prescription:", error);
    return NextResponse.json({ error: "Failed to update prescription" }, { status: 500 });
  }
}

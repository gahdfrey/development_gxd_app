import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { prescriptions, products } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { requirePermission } from "@/lib/authz";
import { logAudit } from "@/lib/audit";
import { priceBillItems, itemKey } from "@/lib/billing/pricing";
import { settleHmoItems } from "@/lib/billing/settle";
import { getOpenShift, prepareDeskPayment, recordDeskPayment } from "@/lib/billing/shifts";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idStr } = await params;
    const id = parseInt(idStr);
    if (isNaN(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

    const body = await req.json();
    const { paymentStatus, status, cancellationReason, dispensedProductId, batchNumber, authorizationCode } = body;

    // ── Clinician: stop an inpatient drug (eMAR) ────────────────────────────
    if (body.action === "stop") {
      const authz = await requirePermission([
        ["my-appointments", "add"],
        ["my-appointments", "edit"],
        ["appointments", "edit"],
        ["admission", "edit"],
      ]);
      if (authz.error) return authz.error;
      const { orgId, userId: actorId, userEmail: actorEmail } = authz.ctx;
      const stopReason = typeof body.stopReason === "string" ? body.stopReason.trim() : "";
      if (!stopReason) return NextResponse.json({ error: "Give a reason for stopping" }, { status: 400 });

      const [updated] = await db
        .update(prescriptions)
        .set({ stoppedAt: new Date(), stoppedBy: actorId, stopReason, updatedAt: new Date() })
        .where(and(eq(prescriptions.id, id), eq(prescriptions.organisationId, orgId), isNull(prescriptions.stoppedAt)))
        .returning({ id: prescriptions.id });
      if (!updated) return NextResponse.json({ error: "Prescription not found or already stopped" }, { status: 404 });

      void logAudit({
        organisationId: orgId,
        userId: actorId,
        userEmail: actorEmail,
        action: "update",
        entityType: "prescription",
        entityId: id,
        details: { stopped: true, stopReason },
      });
      return NextResponse.json({ success: true }, { status: 200 });
    }

    // ── Finance: mark paid (one-way) ────────────────────────────────────────
    if (paymentStatus === "paid") {
      const authz = await requirePermission([["finance", "edit"], ["finance", "add"]]);
      if (authz.error) return authz.error;
      const { orgId, userId: actorId, userEmail: actorEmail } = authz.ctx;
      const orgFilter = eq(prescriptions.organisationId, orgId);

      // HMO patients: the desk collects only the co-pay and the HMO's share
      // is recorded as a receivable, atomically with the status flip.
      const [priced, shift] = await Promise.all([
        priceBillItems(orgId, [{ itemType: "prescription", itemId: id }]),
        getOpenShift(db, orgId, actorId),
      ]);
      const prep = await prepareDeskPayment(orgId, actorId, body, priced.get(itemKey("prescription", id))?.patientAmount ?? 0, shift);
      if ("error" in prep) return NextResponse.json({ error: prep.error, code: prep.code }, { status: prep.status });
      const updated = await db.transaction(async (tx) => {
        const [row] = await tx
          .update(prescriptions)
          .set({ paymentStatus: "paid", updatedAt: new Date() })
          .where(and(eq(prescriptions.id, id), eq(prescriptions.paymentStatus, "not_paid"), orgFilter))
          .returning({ id: prescriptions.id });
        if (row) {
          const final = await settleHmoItems(tx, orgId, [...priced.values()], { authorizationCode, actorId });
          if (prep.desk) await recordDeskPayment(tx, { orgId, userId: actorId, desk: prep.desk, items: final });
        }
        return row;
      });

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
        details: {
          paymentStatus: "paid",
          ...(priced.get(itemKey("prescription", id))?.basis === "covered" && {
            hmoAmount: priced.get(itemKey("prescription", id))!.hmoAmount,
            patientAmount: priced.get(itemKey("prescription", id))!.patientAmount,
            authorizationCode: authorizationCode || null,
          }),
        },
      });

      return NextResponse.json({ success: true }, { status: 200 });
    }

    // ── Pharmacy: dispatch ──────────────────────────────────────────────────
    if (status === "dispatched") {
      const authz = await requirePermission([["pharmacy", "edit"], ["pharmacy", "add"]]);
      if (authz.error) return authz.error;
      const { orgId, userId: actorId, userEmail: actorEmail } = authz.ctx;
      const orgFilter = eq(prescriptions.organisationId, orgId);

      if (!dispensedProductId) {
        return NextResponse.json({ error: "Select the brand actually being dispensed." }, { status: 400 });
      }

      const [current] = await db
        .select({
          paymentStatus: prescriptions.paymentStatus,
          status: prescriptions.status,
          genericId: prescriptions.genericId,
          productId: prescriptions.productId,
        })
        .from(prescriptions)
        .where(and(eq(prescriptions.id, id), orgFilter));

      if (!current) return NextResponse.json({ error: "Prescription not found" }, { status: 404 });
      if (current.paymentStatus !== "paid") return NextResponse.json({ error: "Cannot dispatch before payment is confirmed." }, { status: 400 });
      if (current.status !== "pending") return NextResponse.json({ error: "Prescription is already finalised." }, { status: 400 });

      // The dispensed brand must be a real, in-stock, in-org SKU of the same
      // active ingredient the clinician prescribed — this is the one hard
      // guard against a wrong-drug dispensing error.
      const [dispensedBrand] = await db
        .select({
          id: products.id,
          name: products.name,
          genericId: products.genericId,
          casesInStock: products.casesInStock,
          unitsPerCase: products.unitsPerCase,
          looseUnitsInStock: products.looseUnitsInStock,
        })
        .from(products)
        .where(and(eq(products.id, dispensedProductId), eq(products.organisationId, orgId)));

      if (!dispensedBrand) return NextResponse.json({ error: "Selected brand not found." }, { status: 404 });
      if (current.genericId && dispensedBrand.genericId !== current.genericId) {
        return NextResponse.json({ error: "That brand does not match the prescribed active ingredient." }, { status: 400 });
      }
      const dispensedStock =
        dispensedBrand.casesInStock * dispensedBrand.unitsPerCase + dispensedBrand.looseUnitsInStock;
      if (dispensedStock <= 0) {
        return NextResponse.json({ error: `${dispensedBrand.name} is out of stock.` }, { status: 400 });
      }

      await db.update(prescriptions)
        .set({
          status: "dispatched",
          dispensedProductId,
          batchNumber: batchNumber?.trim() || null,
          updatedAt: new Date(),
        })
        .where(and(eq(prescriptions.id, id), orgFilter));

      void logAudit({
        organisationId: orgId,
        userId: actorId,
        userEmail: actorEmail,
        action: "update",
        entityType: "prescription",
        entityId: id,
        details: {
          status: "dispatched",
          dispensedProductId,
          dispensedBrand: dispensedBrand.name,
          batchNumber: batchNumber?.trim() || null,
          // Flags a pharmacy-side brand substitution — the one case
          // pharmacovigilance and inventory reporting most need to see.
          substitutedBrand: current.productId != null && current.productId !== dispensedProductId,
        },
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

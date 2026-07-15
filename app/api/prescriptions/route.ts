import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { prescriptions, patients, users, products } from "@/lib/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { getOrgId } from "@/lib/org";
import { requirePermission } from "@/lib/authz";
import { logAudit } from "@/lib/audit";

export async function GET(_req: NextRequest) {
  try {
    const orgId = await getOrgId();
    if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const rows = await db
      .select({
        id: prescriptions.id,
        appointmentId: prescriptions.appointmentId,
        patientId: prescriptions.patientId,
        patientFirstname: patients.firstname,
        patientLastname: patients.lastname,
        patientDob: patients.dob,
        requestedBy: prescriptions.requestedBy,
        requestedByFirstname: users.firstname,
        requestedByLastname: users.lastname,
        productId: prescriptions.productId,
        productName: products.name,
        productPrice: products.price,
        dosage: prescriptions.dosage,
        paymentStatus: prescriptions.paymentStatus,
        status: prescriptions.status,
        cancellationReason: prescriptions.cancellationReason,
        createdAt: prescriptions.createdAt,
        updatedAt: prescriptions.updatedAt,
      })
      .from(prescriptions)
      .leftJoin(patients, eq(prescriptions.patientId, patients.id))
      .leftJoin(users, eq(prescriptions.requestedBy, users.id))
      .leftJoin(products, eq(prescriptions.productId, products.id))
      .where(eq(prescriptions.organisationId, orgId))
      .orderBy(desc(prescriptions.createdAt));

    return NextResponse.json(rows, { status: 200 });
  } catch (error) {
    console.error("Error fetching prescriptions:", error);
    return NextResponse.json({ error: "Failed to fetch prescriptions" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    // Prescriptions are written by clinicians during consultations.
    const authz = await requirePermission([
      ["my-appointments", "add"],
      ["my-appointments", "edit"],
      ["appointments", "add"],
      ["appointments", "edit"],
      ["pharmacy", "add"],
    ]);
    if (authz.error) return authz.error;
    const { orgId, userId: doctorId, userEmail: actorEmail } = authz.ctx;
    const body = await req.json();
    const { appointmentId, patientId, items } = body;

    if (!patientId || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "patientId and at least one item are required" }, { status: 400 });
    }

    for (const item of items) {
      if (!item.productId || !item.dosage?.trim()) {
        return NextResponse.json({ error: "Each item must have productId and dosage" }, { status: 400 });
      }
    }

    const created = await db
      .insert(prescriptions)
      .values(
        items.map((item: { productId: number; dosage: string }) => ({
          organisationId: orgId,
          appointmentId: appointmentId ?? null,
          patientId,
          requestedBy: doctorId,
          productId: item.productId,
          dosage: item.dosage.trim(),
        }))
      )
      .returning();

    void logAudit({
      organisationId: orgId,
      userId: doctorId,
      userEmail: actorEmail,
      action: "create",
      entityType: "prescription",
      entityId: created.map((p) => p.id).join(","),
      details: { patientId, appointmentId: appointmentId ?? null, itemCount: created.length },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("Error creating prescriptions:", error);
    return NextResponse.json({ error: "Failed to create prescriptions" }, { status: 500 });
  }
}

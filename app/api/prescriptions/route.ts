import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { prescriptions, patients, users, products, drugGenerics } from "@/lib/db/schema";
import { eq, desc, and, inArray } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { getOrgId } from "@/lib/org";
import { requirePermission } from "@/lib/authz";
import { logAudit } from "@/lib/audit";
import { raiseAuthorizationsForOrders } from "@/lib/billing/authorizations";
import { checkPrescriptionAllergies, unacknowledgedAlerts, type AlertOverride } from "@/lib/cds/allergy";
import { cdsAlertEvents, admissions } from "@/lib/db/schema";
import { FREQUENCIES, ROUTES } from "@/lib/emar/schedule";
import { priceBillItems, itemKey, billingSummary } from "@/lib/billing/pricing";
import { getItemAuthorizations, toAuthorizationSummary } from "@/lib/billing/authorizations";

const dispensedProduct = alias(products, "dispensed_product");

export async function GET(req: NextRequest) {
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
        genericId: prescriptions.genericId,
        genericName: drugGenerics.name,
        genericStrength: drugGenerics.strength,
        genericForm: drugGenerics.form,
        productId: prescriptions.productId,
        productName: products.name,
        productPrice: products.price,
        productManufacturer: products.manufacturer,
        dispensedProductId: prescriptions.dispensedProductId,
        dispensedProductName: dispensedProduct.name,
        dispensedProductManufacturer: dispensedProduct.manufacturer,
        batchNumber: prescriptions.batchNumber,
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
      .leftJoin(drugGenerics, eq(prescriptions.genericId, drugGenerics.id))
      .leftJoin(dispensedProduct, eq(prescriptions.dispensedProductId, dispensedProduct.id))
      .where(eq(prescriptions.organisationId, orgId))
      .orderBy(desc(prescriptions.createdAt));

    // Finance desk view: attach who-pays-what (HMO tariff vs self-pay).
    if (new URL(req.url).searchParams.get("withBilling") === "1") {
      const unpaid = rows.filter((r) => r.paymentStatus !== "paid" && r.status !== "cancelled");
      const priced = await priceBillItems(orgId, unpaid.map((r) => ({ itemType: "prescription" as const, itemId: r.id })));
      const auths = await getItemAuthorizations(db, orgId, [...priced.values()].filter((p) => p.basis === "covered"));
      return NextResponse.json(
        rows.map((r) => {
          const billing = billingSummary(priced.get(itemKey("prescription", r.id)));
          return {
            ...r,
            billing: billing && { ...billing, authorization: toAuthorizationSummary(auths.get(itemKey("prescription", r.id))) },
          };
        }),
        { status: 200 },
      );
    }

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
    const overrides: AlertOverride[] = Array.isArray(body.overrides) ? body.overrides : [];

    if (!patientId || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "patientId and at least one item are required" }, { status: 400 });
    }

    // Inpatient prescribing: tied to the patient's current admission, with
    // structured dose / route / frequency so it appears on the ward
    // medication chart (eMAR).
    let admissionId: number | null = null;
    if (body.admissionId != null && body.admissionId !== "") {
      const [adm] = await db
        .select({ id: admissions.id })
        .from(admissions)
        .where(and(
          eq(admissions.id, Number(body.admissionId)),
          eq(admissions.patientId, Number(patientId)),
          eq(admissions.organisationId, orgId),
          eq(admissions.status, "admitted"),
        ))
        .limit(1);
      if (!adm) return NextResponse.json({ error: "The patient is not currently admitted on that admission" }, { status: 400 });
      admissionId = adm.id;
    }

    for (const item of items) {
      if (!item.genericId || !item.dosage?.trim()) {
        return NextResponse.json({ error: "Each item must have an active ingredient (genericId) and dosage" }, { status: 400 });
      }
      if (item.frequency != null && item.frequency !== "" && !(item.frequency in FREQUENCIES)) {
        return NextResponse.json({ error: "Invalid frequency" }, { status: 400 });
      }
      if (item.route != null && item.route !== "" && !(item.route in ROUTES)) {
        return NextResponse.json({ error: "Invalid route" }, { status: 400 });
      }
      if (admissionId != null) {
        if (!item.doseAmount?.trim()) return NextResponse.json({ error: "Inpatient prescriptions need a dose (e.g. 500 mg)" }, { status: 400 });
        if (!item.route) return NextResponse.json({ error: "Inpatient prescriptions need a route" }, { status: 400 });
        if (!item.frequency) return NextResponse.json({ error: "Inpatient prescriptions need a frequency" }, { status: 400 });
        if (item.frequency === "PRN" && !item.prnIndication?.trim()) {
          return NextResponse.json({ error: "As-needed (PRN) prescriptions need an indication, e.g. “for pain”" }, { status: 400 });
        }
      }
      for (const [k, max] of [["durationDays", 365], ["prnMaxPer24h", 48], ["prnMinIntervalHours", 72]] as const) {
        const v = item[k];
        if (v != null && v !== "" && (!Number.isFinite(Number(v)) || Number(v) <= 0 || Number(v) > max)) {
          return NextResponse.json({ error: `Invalid ${k}` }, { status: 400 });
        }
      }
    }

    // A preferred brand, if given, must actually be a brand of the chosen
    // active ingredient — otherwise the clinician's brand pick and the
    // clinical intent (genericId) could silently disagree.
    const preferredIds = items
      .map((i: { productId?: number }) => i.productId)
      .filter((id: number | undefined): id is number => !!id);
    if (preferredIds.length > 0) {
      const brandRows = await db
        .select({ id: products.id, genericId: products.genericId })
        .from(products)
        .where(and(eq(products.organisationId, orgId), inArray(products.id, preferredIds)));
      const brandGenericById = new Map(brandRows.map((b) => [b.id, b.genericId]));
      for (const item of items as { productId?: number; genericId: number }[]) {
        if (item.productId && brandGenericById.get(item.productId) !== item.genericId) {
          return NextResponse.json(
            { error: "The selected brand does not match the chosen active ingredient." },
            { status: 400 },
          );
        }
      }
    }

    // Allergy safety check (lib/cds/allergy.ts). Every alert must carry an
    // override reason from the prescriber, otherwise nothing is saved and the
    // alerts are returned for the form to show.
    const alerts = await checkPrescriptionAllergies(
      db,
      orgId,
      Number(patientId),
      items.map((i: { genericId: number }) => Number(i.genericId)),
    );
    const pending = unacknowledgedAlerts(alerts, overrides);
    if (pending.length > 0) {
      return NextResponse.json(
        { error: "Safety alerts need your review before this prescription can be saved", alerts, requiresOverride: true },
        { status: 409 },
      );
    }

    const created = await db
      .insert(prescriptions)
      .values(
        items.map((item: {
          genericId: number;
          productId?: number;
          dosage: string;
          doseAmount?: string;
          route?: string;
          frequency?: string;
          durationDays?: number | string;
          prnIndication?: string;
          prnMaxPer24h?: number | string;
          prnMinIntervalHours?: number | string;
        }) => {
          const num = (v: unknown) => (v == null || v === "" ? null : Number(v));
          const isPrn = item.frequency === "PRN";
          return {
            organisationId: orgId,
            appointmentId: appointmentId ?? null,
            patientId,
            requestedBy: doctorId,
            genericId: item.genericId,
            productId: item.productId ?? null,
            dosage: item.dosage.trim(),
            doseAmount: item.doseAmount?.trim() || null,
            route: item.route || null,
            frequency: item.frequency || null,
            durationDays: num(item.durationDays),
            startAt: admissionId != null ? new Date() : null,
            isPrn,
            prnIndication: isPrn ? item.prnIndication?.trim() || null : null,
            prnMaxPer24h: isPrn ? num(item.prnMaxPer24h) : null,
            prnMinIntervalHours: isPrn ? num(item.prnMinIntervalHours) : null,
            admissionId,
          };
        })
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

    if (alerts.length > 0) {
      const byKey = new Map(overrides.map((o) => [o.key, o]));
      // "Asked the patient — no known allergies": record it on the file so
      // the next prescriber isn't asked again.
      if (byKey.get("allergy_not_assessed")?.reason === "allergies_checked_none") {
        await db
          .update(patients)
          .set({ allergyStatus: "nkda", allergyStatusUpdatedAt: new Date(), allergyStatusUpdatedBy: doctorId })
          .where(and(eq(patients.id, Number(patientId)), eq(patients.organisationId, orgId), eq(patients.allergyStatus, "not_assessed")));
      }
      await db.insert(cdsAlertEvents).values(
        alerts.map((a) => ({
          organisationId: orgId,
          patientId: Number(patientId),
          prescriptionId: a.genericId != null ? created.find((p) => p.genericId === a.genericId)?.id ?? null : null,
          genericId: a.genericId,
          rule: a.rule,
          severity: a.severity,
          message: a.message,
          allergyId: a.allergyId,
          action: "overridden",
          overrideReason: byKey.get(a.key)?.reason ?? null,
          overrideNote: byKey.get(a.key)?.note?.trim() || null,
          userId: doctorId,
        })),
      );
      void logAudit({
        organisationId: orgId,
        userId: doctorId,
        userEmail: actorEmail,
        action: "cds.override",
        entityType: "prescription",
        entityId: created.map((p) => p.id).join(","),
        details: { patientId, alerts: alerts.map((a) => ({ rule: a.rule, severity: a.severity, reason: byKey.get(a.key)?.reason })) },
      });
    }

    // Drugs the patient's HMO only covers with pre-authorization go on the
    // finance desk's authorization worklist.
    await raiseAuthorizationsForOrders(
      orgId,
      created.map((p) => ({ itemType: "prescription" as const, itemId: p.id })),
      doctorId,
    );

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("Error creating prescriptions:", error);
    return NextResponse.json({ error: "Failed to create prescriptions" }, { status: 500 });
  }
}

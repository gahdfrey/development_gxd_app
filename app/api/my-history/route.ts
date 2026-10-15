import { NextRequest, NextResponse } from "next/server";
import { getValuesForRequests } from "@/lib/lab/results";
import { db } from "@/lib/db";
import {
  patients,
  hmos,
  appointments,
  visits,
  requests,
  requestResults,
  users,
  departments,
  labTests,
  prescriptions,
  products,
  drugGenerics,
  visitDiagnoses,
  patientCharges,
} from "@/lib/db/schema";
import { eq, desc, and, isNull, inArray } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { auth } from "@/auth";
import { getOrgId } from "@/lib/org";
import { priceBillItems, itemKey } from "@/lib/billing/pricing";
import { getClinicalSummary } from "@/lib/clinical/summary";
import { getPatientPlanCoverage } from "@/lib/subscriptions";
import { getPatientVaccinations } from "@/lib/vaccination";

/**
 * GET /api/my-history
 * Returns the authenticated patient's own history.
 * Only accessible when session.user.patientId is set (patient portal accounts).
 */
export async function GET(_req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const patientId = session.user.patientId;
    if (!patientId || typeof patientId !== "number") {
      return NextResponse.json(
        { error: "No patient profile linked to this account" },
        { status: 403 },
      );
    }

    // 1. Patient + HMO name
    const patientRows = await db
      .select({
        id: patients.id,
        mrn: patients.mrn,
        firstname: patients.firstname,
        lastname: patients.lastname,
        gender: patients.gender,
        dob: patients.dob,
        phone: patients.phone,
        countryCode: patients.countryCode,
        insuranceType: patients.insuranceType,
        hmoId: patients.hmoId,
        hmoName: hmos.name,
        policyNumber: patients.policyNumber,
        maidenName: patients.maidenName,
        nextOfKinFirstname: patients.nextOfKinFirstname,
        nextOfKinLastname: patients.nextOfKinLastname,
        nextOfKinRelationship: patients.nextOfKinRelationship,
        nextOfKinAddress: patients.nextOfKinAddress,
        nextOfKinPhone: patients.nextOfKinPhone,
        nextOfKinEmail: patients.nextOfKinEmail,
        createdAt: patients.createdAt,
      })
      .from(patients)
      .leftJoin(hmos, eq(patients.hmoId, hmos.id))
      .where(and(eq(patients.id, patientId), isNull(patients.deletedAt)))
      .limit(1);

    if (patientRows.length === 0) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    const patient = patientRows[0];

    // 2. All appointments for this patient (with doctor info and visit info)
    const apptRows = await db
      .select({
        id: appointments.id,
        appointmentDate: appointments.appointmentDate,
        appointmentTime: appointments.appointmentTime,
        status: appointments.status,
        visitType: appointments.visitType,
        notes: appointments.notes,
        createdAt: appointments.createdAt,
        doctorFirstname: users.firstname,
        doctorLastname: users.lastname,
        visitId: visits.id,
        visitDurationMinutes: visits.durationMinutes,
        visitDoctorNotes: visits.doctorNotes,
        visitStartTime: visits.startTime,
        visitEndTime: visits.endTime,
      })
      .from(appointments)
      .leftJoin(users, eq(appointments.doctorId, users.id))
      .leftJoin(visits, eq(visits.appointmentId, appointments.id))
      .where(eq(appointments.patientId, patientId))
      .orderBy(desc(appointments.createdAt));

    // 3. All requests for this patient (with test, dept, results)
    const requestRows = await db
      .select({
        id: requests.id,
        appointmentId: requests.appointmentId,
        status: requests.status,
        paymentStatus: requests.paymentStatus,
        createdAt: requests.createdAt,
        testId: requests.testId,
        testName: labTests.name,
        testPrice: labTests.price,
        departmentName: departments.name,
        requestedByFirstname: users.firstname,
        requestedByLastname: users.lastname,
      })
      .from(requests)
      .leftJoin(labTests, eq(requests.testId, labTests.id))
      .leftJoin(departments, eq(requests.departmentId, departments.id))
      .leftJoin(users, eq(requests.requestedBy, users.id))
      .where(eq(requests.patientId, patientId))
      .orderBy(desc(requests.createdAt));

    // 4. All results for those requests
    const requestIds = requestRows.map((r) => r.id);
    const resultRows = requestIds.length === 0 ? [] : await db
        .select({
          id: requestResults.id,
          requestId: requestResults.requestId,
          fileName: requestResults.fileName,
          filePath: requestResults.filePath,
          fileType: requestResults.fileType,
          message: requestResults.message,
          createdAt: requestResults.createdAt,
          viewedAt: requestResults.viewedAt,
          uploadedByFirstname: users.firstname,
          uploadedByLastname: users.lastname,
        })
        .from(requestResults)
        .leftJoin(users, eq(requestResults.uploadedBy, users.id))
        .where(inArray(requestResults.requestId, requestIds));

    // 5. All prescriptions for this patient (all statuses shown in patient portal)
    const dispensedProduct = alias(products, "dispensed_product");
    const prescriptionRows = await db
      .select({
        id: prescriptions.id,
        appointmentId: prescriptions.appointmentId,
        genericName: drugGenerics.name,
        genericStrength: drugGenerics.strength,
        productId: prescriptions.productId,
        productName: products.name,
        productPrice: products.price,
        dispensedProductName: dispensedProduct.name,
        batchNumber: prescriptions.batchNumber,
        dosage: prescriptions.dosage,
        paymentStatus: prescriptions.paymentStatus,
        status: prescriptions.status,
        createdAt: prescriptions.createdAt,
      })
      .from(prescriptions)
      .leftJoin(products, eq(prescriptions.productId, products.id))
      .leftJoin(drugGenerics, eq(prescriptions.genericId, drugGenerics.id))
      .leftJoin(dispensedProduct, eq(prescriptions.dispensedProductId, dispensedProduct.id))
      .where(eq(prescriptions.patientId, patientId))
      .orderBy(desc(prescriptions.createdAt));

    // ICD-11 diagnoses — coded conditions ARE part of the patient's own
    // record (WHO IPS), unlike raw doctor notes which stay hidden.
    const visitIds = apptRows.map((a) => a.visitId).filter((v): v is number => v != null);
    const diagnosisRows = visitIds.length > 0
      ? await db
          .select({
            visitId: visitDiagnoses.visitId,
            icdCode: visitDiagnoses.icdCode,
            icdTitle: visitDiagnoses.icdTitle,
            clinicalText: visitDiagnoses.clinicalText,
            diagnosisType: visitDiagnoses.diagnosisType,
          })
          .from(visitDiagnoses)
          .where(inArray(visitDiagnoses.visitId, visitIds))
      : [];
    const diagnosesByVisit: Record<number, typeof diagnosisRows> = {};
    for (const d of diagnosisRows) {
      if (!diagnosesByVisit[d.visitId]) diagnosesByVisit[d.visitId] = [];
      diagnosesByVisit[d.visitId].push(d);
    }

    // Build maps
    // Structured (numeric/coded) lab results alongside any uploaded files.
    const orgIdForValues = await getOrgId();
    const allValues = orgIdForValues
      ? await getValuesForRequests(db, orgIdForValues, requestRows.map((r) => r.id))
      : null;
    // A critical result reaches the patient only after their doctor has
    // acknowledged it (so they hear it from a clinician first, not a screen).
    const underReview = new Set<number>();
    const valuesByRequest = new Map<number, unknown[]>();
    for (const [requestId, vals] of allValues ?? []) {
      if (vals.some((v) => v.critical && !v.critical.acknowledgedAt)) {
        underReview.add(requestId);
        continue;
      }
      valuesByRequest.set(
        requestId,
        vals.map((v) => ({
          id: v.id,
          name: v.name,
          valueNumeric: v.valueNumeric,
          valueText: v.valueText,
          unit: v.unit,
          refLow: v.refLow,
          refHigh: v.refHigh,
          flag: v.flag,
          comment: v.comment,
          amendedAt: v.amendedAt,
        })),
      );
    }
    const resultsByRequest: Record<number, typeof resultRows> = {};
    for (const r of resultRows) {
      if (!resultsByRequest[r.requestId]) resultsByRequest[r.requestId] = [];
      resultsByRequest[r.requestId].push(r);
    }

    const requestsByAppointment: Record<number, typeof requestRows> = {};
    const unlinkedRequests: typeof requestRows = [];
    for (const r of requestRows) {
      if (r.appointmentId) {
        if (!requestsByAppointment[r.appointmentId])
          requestsByAppointment[r.appointmentId] = [];
        requestsByAppointment[r.appointmentId].push(r);
      } else {
        unlinkedRequests.push(r);
      }
    }

    // Build a map: appointmentId -> prescriptions[]
    const prescriptionsByAppointment: Record<number, typeof prescriptionRows> = {};
    for (const p of prescriptionRows) {
      if (p.appointmentId) {
        if (!prescriptionsByAppointment[p.appointmentId])
          prescriptionsByAppointment[p.appointmentId] = [];
        prescriptionsByAppointment[p.appointmentId].push(p);
      }
    }

    // Build timeline — doctor notes are EXCLUDED (patient portal hides them)
    const timeline = apptRows.map((appt) => ({
      appointment: {
        id: appt.id,
        appointmentDate: appt.appointmentDate,
        appointmentTime: appt.appointmentTime,
        status: appt.status,
        visitType: appt.visitType,
        notes: appt.notes,
        createdAt: appt.createdAt,
        doctorFirstname: appt.doctorFirstname,
        doctorLastname: appt.doctorLastname,
      },
      visit:
        appt.visitDurationMinutes != null
          ? {
              durationMinutes: appt.visitDurationMinutes,
              // doctorNotes deliberately omitted — patient should not see raw notes
              hasDoctorNotes: appt.visitDoctorNotes != null && appt.visitDoctorNotes.trim() !== "",
              startTime: appt.visitStartTime,
              endTime: appt.visitEndTime,
              diagnoses: appt.visitId != null ? (diagnosesByVisit[appt.visitId] ?? []) : [],
            }
          : null,
      requests: (requestsByAppointment[appt.id] ?? []).map((req) => ({
        ...req,
        results: resultsByRequest[req.id] ?? [],
        values: valuesByRequest.get(req.id) ?? [],
        valuesUnderReview: underReview.has(req.id),
      })),
      prescriptions: (prescriptionsByAppointment[appt.id] ?? []),
    }));

    // Stats
    const completedVisits = apptRows.filter((a) => a.status === "completed").length;
    const totalRequests = requestRows.length;
    const paidRequests = requestRows.filter((r) => r.paymentStatus === "paid").length;
    const resultsReceived = Object.values(resultsByRequest).reduce(
      (sum, arr) => sum + arr.length,
      0,
    );

    // Pending Payment tab: every unpaid request/prescription (and vaccination
    // dose, below), flattened
    // across both the timeline and the unlinked-requests bucket (same shape
    // the Test Results tab already flattens client-side). Each item is
    // flagged with whether an active subscription's plan already covers it
    // for free, so the UI can offer "Use plan coverage" instead of payment.
    // Prices shown here are the patient's own share: for HMO-covered items
    // that's the co-pay (hmoCovers carries the HMO's part, for display).
    const coverage = await getPatientPlanCoverage(patientId);
    const orgId = await getOrgId();
    const unpaidRequestRows = requestRows.filter((r) => r.paymentStatus !== "paid");
    const unpaidPrescriptionRows = prescriptionRows.filter((p) => p.paymentStatus !== "paid");
    // Vaccination doses are billed when booked, so the patient can pay ahead.
    const unpaidChargeRows = orgId
      ? await db
          .select({ id: patientCharges.id, description: patientCharges.description, chargeDate: patientCharges.chargeDate, createdAt: patientCharges.createdAt })
          .from(patientCharges)
          .where(and(
            eq(patientCharges.organisationId, orgId),
            eq(patientCharges.patientId, patientId),
            eq(patientCharges.sourceType, "vaccine"),
            eq(patientCharges.paymentStatus, "not_paid"),
            isNull(patientCharges.deletedAt),
          ))
      : [];
    const priced = orgId
      ? await priceBillItems(orgId, [
          ...unpaidRequestRows.map((r) => ({ itemType: "request" as const, itemId: r.id })),
          ...unpaidPrescriptionRows.map((p) => ({ itemType: "prescription" as const, itemId: p.id })),
          ...unpaidChargeRows.map((c) => ({ itemType: "charge" as const, itemId: c.id })),
        ])
      : new Map();
    const hmoShare = (k: string) => {
      const p = priced.get(k);
      return p?.basis === "covered"
        ? { patientAmount: p.patientAmount as number, hmoCovers: p.hmoAmount as number, hmoName: p.hmoName as string | null }
        : null;
    };
    const unpaidRequests = unpaidRequestRows.map((req) => {
      const covered = req.testId != null ? coverage.get(`lab_test:${req.testId}`) : undefined;
      const hmo = hmoShare(itemKey("request", req.id));
      return {
        ...req,
        testPrice: hmo ? hmo.patientAmount : req.testPrice,
        hmoCovers: hmo?.hmoCovers ?? 0,
        hmoName: hmo?.hmoName ?? null,
        results: resultsByRequest[req.id] ?? [],
        values: valuesByRequest.get(req.id) ?? [],
        valuesUnderReview: underReview.has(req.id),
        coveredByPlan: covered?.planName ?? null,
      };
    });
    const unpaidPrescriptions = unpaidPrescriptionRows.map((p) => {
      const covered = p.productId != null ? coverage.get(`product:${p.productId}`) : undefined;
      const hmo = hmoShare(itemKey("prescription", p.id));
      return {
        ...p,
        productPrice: hmo ? hmo.patientAmount : p.productPrice,
        hmoCovers: hmo?.hmoCovers ?? 0,
        hmoName: hmo?.hmoName ?? null,
        coveredByPlan: covered?.planName ?? null,
      };
    });

    const unpaidCharges = unpaidChargeRows.map((c) => {
      const p = priced.get(itemKey("charge", c.id));
      return {
        ...c,
        amount: p ? (p.patientAmount as number) : null,
        hmoCovers: p?.basis === "covered" ? (p.hmoAmount as number) : 0,
        hmoName: p?.basis === "covered" ? (p.hmoName as string | null) : null,
      };
    });

    // The patient's own allergies / ongoing conditions / weight (read-only
    // in the portal — recorded by staff). Ruled-out allergies and resolved
    // conditions are left out to keep it simple for the patient.
    const summary = orgId ? await getClinicalSummary(db, orgId, patientId) : null;
    const clinical = summary && {
      allergyStatus: summary.allergyStatus,
      allergies: summary.allergies
        .filter((a) => a.verification !== "refuted")
        .map((a) => ({ id: a.id, substance: a.substance, type: a.type, reaction: a.reaction, severity: a.severity })),
      problems: summary.problems
        .filter((p) => p.status !== "resolved")
        .map((p) => ({ id: p.id, icdCode: p.icdCode, title: p.icdTitle || p.clinicalText, onsetDate: p.onsetDate })),
      latest: summary.latest,
    };

    return NextResponse.json({
      patient,
      clinical,
      stats: { completedVisits, totalRequests, paidRequests, resultsReceived },
      timeline,
      unlinkedRequests: unlinkedRequests.map((req) => ({
        ...req,
        results: resultsByRequest[req.id] ?? [],
        values: valuesByRequest.get(req.id) ?? [],
        valuesUnderReview: underReview.has(req.id),
      })),
      unpaidRequests,
      unpaidPrescriptions,
      unpaidCharges,
      vaccinations: orgId ? await getPatientVaccinations(orgId, patientId) : [],
    });
  } catch (error) {
    console.error("Error fetching patient history:", error);
    return NextResponse.json(
      { error: "Failed to fetch history" },
      { status: 500 },
    );
  }
}

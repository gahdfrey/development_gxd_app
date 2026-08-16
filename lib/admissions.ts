import { db } from "@/lib/db";
import { admissions, patients, wards, beds, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

/**
 * Shared shape for every admission read (list, detail, and the row returned
 * after create/admit) so the client always gets the same record back.
 */

// The doctor who raised the request, as opposed to `users` which is joined on
// the admitting doctor. Usually the same person, but not necessarily.
export const requesters = alias(users, "requesters");

export const admissionSelection = {
  id: admissions.id,
  admissionType: admissions.admissionType,
  admissionReason: admissions.admissionReason,
  severity: admissions.severity,
  status: admissions.status,
  requestedAt: admissions.requestedAt,
  admittedAt: admissions.admittedAt,
  dischargedAt: admissions.dischargedAt,
  dischargeSummary: admissions.dischargeSummary,
  declineReason: admissions.declineReason,
  declinedAt: admissions.declinedAt,
  appointmentId: admissions.appointmentId,
  createdAt: admissions.createdAt,
  patient: {
    id: patients.id,
    firstname: patients.firstname,
    lastname: patients.lastname,
    mrn: patients.mrn,
  },
  ward: { id: wards.id, name: wards.name },
  bed: { id: beds.id, bedNumber: beds.bedNumber },
  doctor: { id: users.id, firstname: users.firstname, lastname: users.lastname },
  requestedBy: { id: requesters.id, firstname: requesters.firstname, lastname: requesters.lastname },
};

/** Select over `admissions` with every table `admissionSelection` reads joined in. */
export function admissionQuery() {
  return db
    .select(admissionSelection)
    .from(admissions)
    .leftJoin(patients, eq(admissions.patientId, patients.id))
    .leftJoin(wards, eq(admissions.wardId, wards.id))
    .leftJoin(beds, eq(admissions.bedId, beds.id))
    .leftJoin(users, eq(admissions.admittingDoctorId, users.id))
    .leftJoin(requesters, eq(admissions.requestedBy, requesters.id));
}

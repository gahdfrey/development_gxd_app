import {
  pgTable,
  text,
  timestamp,
  json,
  serial,
  integer,
  boolean,
  uniqueIndex,
  index,
  real,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// ─── Organisations ────────────────────────────────────────────────────────────
// Facility attributes follow the NHFR (Nigeria Health Facility Registry)
// minimum "signature domain" dataset: name, type, ownership, address,
// contacts, operational status, administrative area, geo-coordinates.
// facilityRegistryId is reserved for the national NHFR facility ID once the
// registry is live.
export const organisations = pgTable("organisations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  facilityRegistryId: text("facility_registry_id"),
  facilityType: text("facility_type"),
  ownership: text("ownership"),
  state: text("state"),
  lga: text("lga"),
  latitude: text("latitude"),
  longitude: text("longitude"),
  operationalStatus: text("operational_status").notNull().default("operational"),
  // How many days an HMO eligibility check stays "fresh" before the finance
  // desk is prompted to re-verify the enrollee with the HMO.
  eligibilityRecheckDays: integer("eligibility_recheck_days").notNull().default(30),
  // Patient SMS (lib/messaging). Off until the hospital switches it on, so
  // connecting a live SMS provider never starts texting patients by surprise.
  smsEnabled: boolean("sms_enabled").notNull().default(false),
  // Approved alphanumeric sender ID shown on the patient's phone (≤ 11 chars).
  smsSenderId: text("sms_sender_id"),
  // Which automatic messages are on: { appointment_booked, reminder_24h,
  // reminder_2h, results_ready, payment_receipt } → boolean (missing = on).
  smsSettings: json("sms_settings").$type<Record<string, boolean>>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Organisation = typeof organisations.$inferSelect;
export type NewOrganisation = typeof organisations.$inferInsert;

// ─── Roles ────────────────────────────────────────────────────────────────────
export const roles = pgTable("roles", {
  id: serial("id").primaryKey(),
  organisationId: integer("organisation_id").notNull().references(() => organisations.id),
  name: text("name").notNull(),
  description: text("description"),
  permissions: json("permissions"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
}, (t) => ({
  nameOrgUnique: uniqueIndex("roles_name_org_idx").on(t.name, t.organisationId),
}));

export type Role = typeof roles.$inferSelect;
export type NewRole = typeof roles.$inferInsert;

// ─── HMOs / payers (per organisation) ────────────────────────────────────────
// Each hospital keeps its own payer list: the HMOs, NHIA/state schemes and
// corporate payers it actually has contracts with. Names are unique per org
// among non-deleted rows (case-insensitive), so a deleted HMO can be re-added.
export const hmos = pgTable("hmos", {
  id: serial("id").primaryKey(),
  organisationId: integer("organisation_id").notNull().references(() => organisations.id),
  name: text("name").notNull(),
  description: text("description"),
  payerType: text("payer_type").notNull().default("hmo"), // "hmo" | "nhia" | "state_scheme" | "corporate"
  // The hospital's own short code for the payer (e.g. "LWH"), printed on claims.
  code: text("code"),
  contactPerson: text("contact_person"),
  phone: text("phone"),
  email: text("email"),
  // Days after the service date within which the HMO accepts a claim; null =
  // unknown. Drives the claim scrubber's "late submission" check.
  claimSubmissionDays: integer("claim_submission_days"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
}, (t) => ({
  orgNameUnique: uniqueIndex("hmos_org_name_idx")
    .on(t.organisationId, sql`lower(${t.name})`)
    .where(sql`deleted_at IS NULL`),
}));

export type HMO = typeof hmos.$inferSelect;
export type NewHMO = typeof hmos.$inferInsert;

// ─── Departments ──────────────────────────────────────────────────────────────
export const departments = pgTable("departments", {
  id: serial("id").primaryKey(),
  organisationId: integer("organisation_id").notNull().references(() => organisations.id),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
}, (t) => ({
  nameOrgUnique: uniqueIndex("departments_name_org_idx").on(t.name, t.organisationId),
}));

export type Department = typeof departments.$inferSelect;
export type NewDepartment = typeof departments.$inferInsert;

// ─── Users ────────────────────────────────────────────────────────────────────
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  organisationId: integer("organisation_id").notNull().references(() => organisations.id),
  username: text("username").notNull(),
  email: text("email").notNull(),
  firstname: text("firstname").notNull(),
  lastname: text("lastname").notNull(),
  gender: text("gender"),
  password: text("password").notNull(),
  roleId: integer("role_id").references(() => roles.id),
  departmentId: integer("department_id").references(() => departments.id),
  patientId: integer("patient_id"),
  isPlatformAdmin: boolean("is_platform_admin").notNull().default(false),
  // NHWR (Nigeria Health Worker Registry) readiness: professional-council
  // registration (e.g. MDCN for doctors, NMCN for nurses, PCN for
  // pharmacists) and a reserved column for the national worker registry ID.
  licenseNumber: text("license_number"),
  licenseCouncil: text("license_council"),
  workerRegistryId: text("worker_registry_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
}, (t) => ({
  emailOrgUnique: uniqueIndex("users_email_org_idx").on(t.email, t.organisationId),
  usernameOrgUnique: uniqueIndex("users_username_org_idx").on(t.username, t.organisationId),
}));

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type UserWithRole = User & { roleName: string | null };

// ─── Patients ─────────────────────────────────────────────────────────────────
export const patients = pgTable("patients", {
  id: serial("id").primaryKey(),
  organisationId: integer("organisation_id").notNull().references(() => organisations.id),
  // NHCR (Nigeria Health Client Registry) readiness: NIN is the national
  // identity anchor ("one patient, one health record"); mrn is the local
  // Medical Record Number; clientRegistryId is reserved for the national
  // CR ID once the registry is live.
  nin: text("nin"),
  mrn: text("mrn"),
  clientRegistryId: text("client_registry_id"),
  firstname: text("firstname").notNull(),
  lastname: text("lastname").notNull(),
  gender: text("gender").notNull(),
  dob: text("dob").notNull(),
  maidenName: text("maiden_name"),
  email: text("email"),
  countryCode: text("country_code").notNull(),
  phone: text("phone").notNull(),
  insuranceType: text("insurance_type").notNull(),
  hmoId: integer("hmo_id").references(() => hmos.id),
  policyNumber: text("policy_number"),
  nextOfKinFirstname: text("next_of_kin_firstname"),
  nextOfKinLastname: text("next_of_kin_lastname"),
  nextOfKinRelationship: text("next_of_kin_relationship"),
  nextOfKinAddress: text("next_of_kin_address"),
  nextOfKinPhone: text("next_of_kin_phone"),
  nextOfKinEmail: text("next_of_kin_email"),
  // Whether anyone has asked about allergies: "not_assessed" (never asked —
  // NOT the same as no allergies), "nkda" (asked: no known allergies), or
  // "has_allergies" (set automatically while active allergies exist).
  allergyStatus: text("allergy_status").notNull().default("not_assessed"),
  allergyStatusUpdatedAt: timestamp("allergy_status_updated_at", { withTimezone: true }),
  allergyStatusUpdatedBy: integer("allergy_status_updated_by"),
  // Set when this record was merged into another (the survivor); the row is
  // also soft-deleted. Kept so old links / MRNs can redirect to the survivor.
  // The patient asked not to receive SMS from the hospital.
  messagingOptOut: boolean("messaging_opt_out").notNull().default(false),
  messagingOptOutAt: timestamp("messaging_opt_out_at", { withTimezone: true }),
  mergedIntoId: integer("merged_into_id"),
  mergedAt: timestamp("merged_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export type Patient = typeof patients.$inferSelect;
export type NewPatient = typeof patients.$inferInsert;

// ─── Appointments ─────────────────────────────────────────────────────────────
export const appointments = pgTable("appointments", {
  id: serial("id").primaryKey(),
  organisationId: integer("organisation_id").notNull().references(() => organisations.id),
  patientId: integer("patient_id").notNull().references(() => patients.id),
  doctorId: integer("doctor_id").notNull().references(() => users.id),
  appointmentDate: text("appointment_date").notNull(),
  appointmentTime: text("appointment_time").notNull(),
  status: text("status").notNull().default("scheduled"),
  visitType: text("visit_type").notNull().default("new visit"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  // Supports "this patient's appointments" lookups (e.g. the Admission
  // module's completed-appointment picker) without scanning the whole table.
  patientIdx: index("appointments_patient_idx").on(t.patientId),
}));

export type Appointment = typeof appointments.$inferSelect;
export type NewAppointment = typeof appointments.$inferInsert;

// ─── Visits ───────────────────────────────────────────────────────────────────
export const visits = pgTable("visits", {
  id: serial("id").primaryKey(),
  organisationId: integer("organisation_id").notNull().references(() => organisations.id),
  appointmentId: integer("appointment_id").notNull().references(() => appointments.id),
  patientId: integer("patient_id").notNull().references(() => patients.id),
  doctorId: integer("doctor_id").notNull().references(() => users.id),
  doctorNotes: text("doctor_notes"),
  durationMinutes: integer("duration_minutes").notNull(),
  startTime: timestamp("start_time", { withTimezone: true }).notNull(),
  endTime: timestamp("end_time", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Visit = typeof visits.$inferSelect;
export type NewVisit = typeof visits.$inferInsert;

// ─── Lab Tests ────────────────────────────────────────────────────────────────
export const labTests = pgTable("lab_tests", {
  id: serial("id").primaryKey(),
  organisationId: integer("organisation_id").notNull().references(() => organisations.id),
  name: text("name").notNull(),
  price: integer("price").notNull(),
  // VAT treatment (lib/billing/tax.ts): "zero_rated" | "standard" | "exempt".
  taxCode: text("tax_code").notNull().default("zero_rated"),
  departmentId: integer("department_id").notNull().references(() => departments.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export type LabTest = typeof labTests.$inferSelect;
export type NewLabTest = typeof labTests.$inferInsert;
export type LabTestWithDepartment = LabTest & { departmentName: string };

// ─── Requests ─────────────────────────────────────────────────────────────────
export const requests = pgTable("requests", {
  id: serial("id").primaryKey(),
  organisationId: integer("organisation_id").notNull().references(() => organisations.id),
  patientId: integer("patient_id").notNull().references(() => patients.id),
  departmentId: integer("department_id").notNull().references(() => departments.id),
  testId: integer("test_id").notNull().references(() => labTests.id),
  requestedBy: integer("requested_by").notNull().references(() => users.id),
  appointmentId: integer("appointment_id").references(() => appointments.id),
  status: text("status").notNull().default("pending"),
  paymentStatus: text("payment_status").notNull().default("not_paid"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Request = typeof requests.$inferSelect;
export type NewRequest = typeof requests.$inferInsert;

// ─── Request Results ──────────────────────────────────────────────────────────
export const requestResults = pgTable("request_results", {
  id: serial("id").primaryKey(),
  requestId: integer("request_id").notNull().references(() => requests.id),
  fileName: text("file_name").notNull(),
  filePath: text("file_path").notNull(),
  fileType: text("file_type").notNull(),
  message: text("message"),
  uploadedBy: integer("uploaded_by").notNull().references(() => users.id),
  // When the patient first opened this result in their portal. NULL = the
  // patient hasn't seen it yet (drives the "new result" login banner and the
  // New/Viewed badges). Only set by the patient viewing it, never by staff.
  viewedAt: timestamp("viewed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type RequestResult = typeof requestResults.$inferSelect;
export type NewRequestResult = typeof requestResults.$inferInsert;

// ─── Notifications ────────────────────────────────────────────────────────────
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  requestId: integer("request_id").notNull().references(() => requests.id),
  patientFirstname: text("patient_firstname"),
  patientLastname: text("patient_lastname"),
  departmentName: text("department_name"),
  message: text("message"),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;

// ─── Inventory Items ──────────────────────────────────────────────────────────
export const inventoryItems = pgTable("inventory_items", {
  id: serial("id").primaryKey(),
  organisationId: integer("organisation_id").notNull().references(() => organisations.id),
  name: text("name").notNull(),
  description: text("description"),
  unit: text("unit").notNull(),
  quantity: integer("quantity").notNull().default(0),
  reorderLevel: integer("reorder_level").notNull().default(10),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export type InventoryItem = typeof inventoryItems.$inferSelect;
export type NewInventoryItem = typeof inventoryItems.$inferInsert;

// ─── Drug Generics ────────────────────────────────────────────────────────────
// The active-constituent level of the medication catalog (RxNorm's "Semantic
// Clinical Drug": ingredient + strength + dose form, e.g. "Amlodipine 5mg
// Tablet"), kept separate from the brand-specific SKUs in `products`. This is
// what a clinician's prescribing intent should be recorded against — brand
// availability and pricing vary and shouldn't be baked into the clinical
// decision. See `products.genericId` for the brand/SKU link.
export const drugGenerics = pgTable("drug_generics", {
  id: serial("id").primaryKey(),
  organisationId: integer("organisation_id").notNull().references(() => organisations.id),
  name: text("name").notNull(),
  strength: text("strength").notNull(),
  form: text("form"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
}, (t) => ({
  orgNameIdx: index("drug_generics_org_name_idx").on(t.organisationId, t.name),
}));

export type DrugGeneric = typeof drugGenerics.$inferSelect;
export type NewDrugGeneric = typeof drugGenerics.$inferInsert;

// ─── Products ─────────────────────────────────────────────────────────────────
// One row per brand-specific SKU. For pharmacy items this is the RxNorm
// "Semantic Branded Drug" level: `name` is the brand name (e.g. "Norvasc
// 5mg"), `genericId` links back to the shared active constituent, and stock
// + price are tracked per brand because different brands of the same
// molecule are not interchangeable in cost, availability, or (per NAFDAC
// post-market surveillance findings) always in bioequivalence.
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  organisationId: integer("organisation_id").notNull().references(() => organisations.id),
  name: text("name").notNull(),
  description: text("description"),
  genericId: integer("generic_id").references(() => drugGenerics.id),
  manufacturer: text("manufacturer"),
  // NAFDAC product-registration number (e.g. "04-1234" / "A4-100137"),
  // printed on packaging — lets pharmacy verify brand provenance.
  nafdacRegNumber: text("nafdac_reg_number"),
  casesInStock: integer("cases_in_stock").notNull().default(0),
  unitsPerCase: integer("units_per_case").notNull().default(1),
  looseUnitsInStock: integer("loose_units_in_stock").notNull().default(0),
  reorderLevel: integer("reorder_level").notNull().default(20),
  price: integer("price").notNull().default(0),
  // VAT treatment (lib/billing/tax.ts): "zero_rated" | "standard" | "exempt".
  taxCode: text("tax_code").notNull().default("zero_rated"),
  category: text("category").notNull().default("general"),
  isPrescribable: boolean("is_prescribable").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
}, (t) => ({
  genericIdx: index("products_generic_idx").on(t.genericId),
}));

export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;

// ─── Supply Orders ────────────────────────────────────────────────────────────
export const supplyOrders = pgTable("supply_orders", {
  id: serial("id").primaryKey(),
  organisationId: integer("organisation_id").notNull().references(() => organisations.id),
  departmentOrderId: integer("department_order_id"),
  departmentId: integer("department_id").notNull().references(() => departments.id),
  requestedBy: integer("requested_by").notNull().references(() => users.id),
  status: text("status").notNull().default("pending"),
  departmentStatus: text("department_status").notNull().default("pending"),
  supplyStatus: text("supply_status").notNull().default("pending"),
  notes: text("notes"),
  cancellationReason: text("cancellation_reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type SupplyOrder = typeof supplyOrders.$inferSelect;
export type NewSupplyOrder = typeof supplyOrders.$inferInsert;

// ─── Supply Order Items ───────────────────────────────────────────────────────
export const supplyOrderItems = pgTable("supply_order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull().references(() => supplyOrders.id),
  inventoryItemId: integer("inventory_item_id").references(() => inventoryItems.id),
  productId: integer("product_id").references(() => products.id),
  quantityRequested: integer("quantity_requested").notNull(),
  status: text("status").notNull().default("pending"),
  deliveredAt: timestamp("delivered_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type SupplyOrderItem = typeof supplyOrderItems.$inferSelect;
export type NewSupplyOrderItem = typeof supplyOrderItems.$inferInsert;

// ─── Prescriptions ────────────────────────────────────────────────────────────
// genericId is the clinician's actual prescribing intent (active constituent
// + strength) and drives allergy/interaction/formulary logic. productId is
// now the *preferred* brand the clinician optionally names — some brands are
// not bioequivalent and experienced clinicians legitimately want a say in
// which one is dispensed. dispensedProductId + batchNumber are filled in by
// pharmacy at dispatch time and record what was *actually* handed to the
// patient (which may differ from productId if that brand was out of stock) —
// required for accurate inventory depletion and for tracing adverse events
// back to a specific brand/batch (NAFDAC pharmacovigilance).
export const prescriptions = pgTable("prescriptions", {
  id: serial("id").primaryKey(),
  organisationId: integer("organisation_id").notNull().references(() => organisations.id),
  appointmentId: integer("appointment_id").references(() => appointments.id),
  patientId: integer("patient_id").notNull().references(() => patients.id),
  requestedBy: integer("requested_by").notNull().references(() => users.id),
  genericId: integer("generic_id").references(() => drugGenerics.id),
  productId: integer("product_id").references(() => products.id),
  dispensedProductId: integer("dispensed_product_id").references(() => products.id),
  batchNumber: text("batch_number"),
  dosage: text("dosage").notNull(),
  paymentStatus: text("payment_status").notNull().default("not_paid"),
  status: text("status").notNull().default("pending"),
  cancellationReason: text("cancellation_reason"),
  // ── Structured dosing (drives the inpatient medication chart / eMAR) ──
  // `dosage` above stays the free-text instruction for outpatients.
  doseAmount: text("dose_amount"), // e.g. "500 mg", "10 units", "1 tab"
  route: text("route"), // "oral" | "iv" | "im" | "sc" | "pr" | "sl" | "inhaled" | "topical" | "other"
  frequency: text("frequency"), // lib/emar/schedule.ts FREQUENCIES key, e.g. "TDS", "Q6H", "PRN"
  durationDays: integer("duration_days"),
  startAt: timestamp("start_at", { withTimezone: true }),
  isPrn: boolean("is_prn").notNull().default(false),
  prnIndication: text("prn_indication"),
  prnMaxPer24h: integer("prn_max_per_24h"),
  prnMinIntervalHours: real("prn_min_interval_hours"),
  // Set for inpatient prescriptions: the stay whose medication chart shows it.
  admissionId: integer("admission_id").references(() => admissions.id),
  stoppedAt: timestamp("stopped_at", { withTimezone: true }),
  stoppedBy: integer("stopped_by").references(() => users.id),
  stopReason: text("stop_reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  genericIdx: index("prescriptions_generic_idx").on(t.genericId),
  admissionIdx: index("prescriptions_admission_idx").on(t.admissionId),
}));

export type Prescription = typeof prescriptions.$inferSelect;
export type NewPrescription = typeof prescriptions.$inferInsert;

// ─── Audit Logs ───────────────────────────────────────────────────────────────
// Append-only trail of every data mutation and auth event (NDPA 2023 / NDHA
// privacy-by-design). Rows are never updated or deleted. No FK constraints so
// log entries survive the soft-deletion of the entities they reference.
export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  organisationId: integer("organisation_id"),
  userId: integer("user_id"),
  userEmail: text("user_email"),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id"),
  details: json("details"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;

// ─── Patient Consents ─────────────────────────────────────────────────────────
// NDHA-style consent records: purpose, information types, expiry, and
// withdrawal. Withdrawal sets status/withdrawnAt; rows are never deleted.
export const patientConsents = pgTable("patient_consents", {
  id: serial("id").primaryKey(),
  organisationId: integer("organisation_id").notNull().references(() => organisations.id),
  patientId: integer("patient_id").notNull().references(() => patients.id),
  purpose: text("purpose").notNull(),
  informationTypes: json("information_types"),
  status: text("status").notNull().default("granted"),
  grantedAt: timestamp("granted_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  withdrawnAt: timestamp("withdrawn_at", { withTimezone: true }),
  recordedBy: integer("recorded_by").references(() => users.id),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type PatientConsent = typeof patientConsents.$inferSelect;
export type NewPatientConsent = typeof patientConsents.$inferInsert;

// ─── ICD-11 Codes (terminology reference) ─────────────────────────────────────
// WHO ICD-11 MMS tabulation — the diagnosis coding standard the NDHA mandates
// (Terminology Services / semantic interoperability). Shared across all orgs;
// populated from the official WHO release via seed-icd11.ts.
export const icd11Codes = pgTable("icd11_codes", {
  code: text("code").primaryKey(),
  title: text("title").notNull(),
  chapter: text("chapter"),
  isLeaf: boolean("is_leaf").notNull().default(true),
});

export type Icd11Code = typeof icd11Codes.$inferSelect;

// ─── Visit Diagnoses ──────────────────────────────────────────────────────────
// Structured, ICD-11-coded diagnoses attached to a consultation. This is the
// FHIR Condition artifact the NDHA requires — replacing free-text-only notes.
// icdCode is nullable so a working/undetermined diagnosis can still be recorded
// as text; icdTitle snapshots the label at time of coding.
export const visitDiagnoses = pgTable("visit_diagnoses", {
  id: serial("id").primaryKey(),
  organisationId: integer("organisation_id").notNull().references(() => organisations.id),
  visitId: integer("visit_id").notNull().references(() => visits.id),
  patientId: integer("patient_id").notNull().references(() => patients.id),
  icdCode: text("icd_code").references(() => icd11Codes.code),
  icdTitle: text("icd_title"),
  clinicalText: text("clinical_text"),
  diagnosisType: text("diagnosis_type").notNull().default("primary"),
  recordedBy: integer("recorded_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type VisitDiagnosis = typeof visitDiagnoses.$inferSelect;
export type NewVisitDiagnosis = typeof visitDiagnoses.$inferInsert;

// ─── Data Subject Requests (GDPR Art. 16/17) ──────────────────────────────────
// Patient-initiated requests to correct (rectification) or delete (erasure /
// "right to be forgotten") their personal data. Staff review and resolve;
// rows are never deleted, preserving the handling trail.
export const dataRequests = pgTable("data_requests", {
  id: serial("id").primaryKey(),
  organisationId: integer("organisation_id").notNull().references(() => organisations.id),
  patientId: integer("patient_id").notNull().references(() => patients.id),
  requestedByUserId: integer("requested_by_user_id").references(() => users.id),
  type: text("type").notNull(), // "rectification" | "erasure"
  status: text("status").notNull().default("pending"), // "pending" | "resolved" | "rejected"
  details: text("details").notNull(),
  resolutionNote: text("resolution_note"),
  resolvedBy: integer("resolved_by").references(() => users.id),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type DataRequest = typeof dataRequests.$inferSelect;
export type NewDataRequest = typeof dataRequests.$inferInsert;

// ─── Wards ────────────────────────────────────────────────────────────────────
export const wards = pgTable("wards", {
  id: serial("id").primaryKey(),
  organisationId: integer("organisation_id").notNull().references(() => organisations.id),
  name: text("name").notNull(),
  departmentId: integer("department_id").references(() => departments.id),
  // Self-pay bed charge per day (whole Naira); null = beds on this ward
  // aren't billed per day. HMO rates: price list item type "ward_bed".
  dailyRate: integer("daily_rate"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
}, (t) => ({
  // organisationId leads so "list this org's wards" (every GET /api/wards
  // call) hits the index directly instead of a full-table scan.
  orgNameUnique: uniqueIndex("wards_org_name_idx").on(t.organisationId, t.name),
}));

export type Ward = typeof wards.$inferSelect;
export type NewWard = typeof wards.$inferInsert;

// ─── Beds ─────────────────────────────────────────────────────────────────────
export const beds = pgTable("beds", {
  id: serial("id").primaryKey(),
  organisationId: integer("organisation_id").notNull().references(() => organisations.id),
  wardId: integer("ward_id").notNull().references(() => wards.id),
  bedNumber: text("bed_number").notNull(),
  status: text("status").notNull().default("available"), // "available" | "occupied" | "maintenance"
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
}, (t) => ({
  bedNumberWardUnique: uniqueIndex("beds_number_ward_idx").on(t.bedNumber, t.wardId),
  // Speeds up "available beds in this ward" — hit on every open of the
  // Admit/Transfer modals' bed dropdown.
  wardStatusIdx: index("beds_ward_status_idx").on(t.wardId, t.status),
}));

export type Bed = typeof beds.$inferSelect;
export type NewBed = typeof beds.$inferInsert;

// ─── Admissions (ADT — Admission, Discharge, Transfer) ────────────────────────
// A row starts life either as a doctor's admission request (status
// "requested", no ward/bed yet — the admission desk assigns those) or as a
// direct desk admission (status "admitted" straight away). That's why
// wardId/bedId/admittedAt are nullable: they're only filled once a bed is
// actually allocated.
export const admissions = pgTable("admissions", {
  id: serial("id").primaryKey(),
  organisationId: integer("organisation_id").notNull().references(() => organisations.id),
  patientId: integer("patient_id").notNull().references(() => patients.id),
  appointmentId: integer("appointment_id").references(() => appointments.id),
  wardId: integer("ward_id").references(() => wards.id),
  bedId: integer("bed_id").references(() => beds.id),
  admittingDoctorId: integer("admitting_doctor_id").notNull().references(() => users.id),
  admissionType: text("admission_type").notNull().default("elective"), // "elective" | "emergency" | "transfer-in"
  admissionReason: text("admission_reason").notNull(),
  severity: text("severity").notNull().default("routine"), // "routine" | "high" | "urgent" | "critical"
  status: text("status").notNull().default("admitted"), // "requested" | "admitted" | "discharged" | "declined"
  // Set when a doctor raises the request from a consultation; null for
  // admissions the desk created directly.
  requestedBy: integer("requested_by").references(() => users.id),
  requestedAt: timestamp("requested_at", { withTimezone: true }),
  admittedAt: timestamp("admitted_at", { withTimezone: true }),
  dischargedAt: timestamp("discharged_at", { withTimezone: true }),
  dischargeSummary: text("discharge_summary"),
  dischargedBy: integer("discharged_by").references(() => users.id),
  // Set when a patient was discharged with an unpaid balance: who allowed it
  // and why (e.g. "HMO patient — balance to be claimed", "Family to pay Monday").
  dischargeBalance: integer("discharge_balance"),
  dischargeBalanceNote: text("discharge_balance_note"),
  declineReason: text("decline_reason"),
  declinedBy: integer("declined_by").references(() => users.id),
  declinedAt: timestamp("declined_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Admission = typeof admissions.$inferSelect;
export type NewAdmission = typeof admissions.$inferInsert;

// ─── Admission Transfers ───────────────────────────────────────────────────────
// One row per ward/bed move within an admission — gives a full movement
// history (the ADT "transfer" event) rather than just the current location.
export const admissionTransfers = pgTable("admission_transfers", {
  id: serial("id").primaryKey(),
  organisationId: integer("organisation_id").notNull().references(() => organisations.id),
  admissionId: integer("admission_id").notNull().references(() => admissions.id),
  fromWardId: integer("from_ward_id").references(() => wards.id),
  fromBedId: integer("from_bed_id").references(() => beds.id),
  toWardId: integer("to_ward_id").notNull().references(() => wards.id),
  toBedId: integer("to_bed_id").notNull().references(() => beds.id),
  reason: text("reason"),
  transferredBy: integer("transferred_by").notNull().references(() => users.id),
  transferredAt: timestamp("transferred_at", { withTimezone: true }).notNull().defaultNow(),
});

export type AdmissionTransfer = typeof admissionTransfers.$inferSelect;
export type NewAdmissionTransfer = typeof admissionTransfers.$inferInsert;

// ─── Payments ───────────────────────────────────────────────────────────────
// A patient-initiated payment (e.g. from the patient portal), which may
// cover several requests/prescriptions at once — see paymentItems. Desk
// payments recorded by Finance staff stay as a direct paymentStatus flip on
// `requests`/`prescriptions` and do NOT go through this table. This is the
// single ledger Finance/dashboard views read for "successful payments",
// covering bill payments, wallet top-ups, and subscription charges alike.
export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  organisationId: integer("organisation_id").notNull().references(() => organisations.id),
  patientId: integer("patient_id").notNull().references(() => patients.id),
  amount: integer("amount").notNull(),
  currency: text("currency").notNull().default("NGN"),
  status: text("status").notNull().default("pending"), // "pending" | "success" | "failed"
  // How the payment was settled. "gateway" goes through gatewayProvider below
  // and is confirmed via webhook/verify; "wallet" is settled instantly from
  // the patient's wallet balance (see walletTransactions); "bank_transfer"
  // stays "pending" until a finance officer confirms receipt; "plan" means
  // no money moved at all — the item was covered by an active subscription's
  // billingPlanItems entitlement (amount is still recorded for audit value,
  // but analytics excludes "plan" payments from revenue to avoid double-
  // counting the subscription charge that already funded the coverage).
  // "desk" = collected in person by a cashier during a shift (see cashierShifts);
  // `channel` says how the money came in.
  method: text("method").notNull().default("gateway"), // "gateway" | "wallet" | "bank_transfer" | "plan" | "desk"
  purpose: text("purpose").notNull().default("bill"), // "bill" | "wallet_topup" | "subscription_charge"
  gatewayProvider: text("gateway_provider"), // "paystack" | "flutterwave" | "mock" — null for wallet/bank_transfer
  gatewayReference: text("gateway_reference").unique(),
  initiatedBy: text("initiated_by").notNull().default("patient"),
  // Finance officer who confirmed a bank_transfer payment as received.
  confirmedBy: integer("confirmed_by").references(() => users.id),
  // Desk payments only: the cashier shift it was taken in, the channel
  // ("cash" | "pos" | "transfer") and the POS terminal slip reference (RRN).
  shiftId: integer("shift_id").references(() => cashierShifts.id),
  channel: text("channel"),
  posReference: text("pos_reference"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Payment = typeof payments.$inferSelect;

// ─── Cashier Shifts ───────────────────────────────────────────────────────────
// A cashier's till session. Desk payments are only accepted inside an open
// shift; on close the cashier enters what they counted per channel, the
// expected amounts are snapshotted from the shift's payments, and any
// difference needs a note and a supervisor's sign-off (status
// "pending_review" → "reviewed"). A balanced close goes straight to "closed".
export const cashierShifts = pgTable("cashier_shifts", {
  id: serial("id").primaryKey(),
  organisationId: integer("organisation_id").notNull().references(() => organisations.id),
  userId: integer("user_id").notNull().references(() => users.id),
  status: text("status").notNull().default("open"), // "open" | "closed" | "pending_review" | "reviewed"
  openedAt: timestamp("opened_at", { withTimezone: true }).notNull().defaultNow(),
  openingFloat: integer("opening_float").notNull().default(0),
  closedAt: timestamp("closed_at", { withTimezone: true }),
  expectedCash: integer("expected_cash"),
  expectedPos: integer("expected_pos"),
  expectedTransfer: integer("expected_transfer"),
  countedCash: integer("counted_cash"),
  countedPos: integer("counted_pos"),
  countedTransfer: integer("counted_transfer"),
  variance: integer("variance"), // counted − expected, all channels (negative = short)
  closeNote: text("close_note"),
  reviewedBy: integer("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  reviewNote: text("review_note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  // One open till per cashier.
  oneOpenPerUser: uniqueIndex("cashier_shifts_one_open_idx").on(t.organisationId, t.userId).where(sql`status = 'open'`),
}));

export type CashierShift = typeof cashierShifts.$inferSelect;
export type NewPayment = typeof payments.$inferInsert;

// ─── Payment Items ────────────────────────────────────────────────────────────
// Which requests/prescriptions a payment covers, with the amount snapshotted
// at payment time (prices on requests/prescriptions are otherwise derived
// live from labTests/products, which can drift after the fact). No FK on
// itemId since it points to one of two different tables depending on
// itemType — validated in application code instead (same reasoning as
// auditLogs having no FK constraints).
export const paymentItems = pgTable("payment_items", {
  id: serial("id").primaryKey(),
  paymentId: integer("payment_id").notNull().references(() => payments.id),
  itemType: text("item_type").notNull(), // "request" | "prescription" | "charge"
  itemId: integer("item_id").notNull(),
  amount: integer("amount").notNull(),
});

export type PaymentItem = typeof paymentItems.$inferSelect;
export type NewPaymentItem = typeof paymentItems.$inferInsert;

// ─── Wallets ──────────────────────────────────────────────────────────────────
// One wallet per patient, created together with the patient record. Balance
// is denormalized here for fast reads but must only ever change inside a
// db.transaction alongside a matching walletTransactions row — never written
// to directly.
export const wallets = pgTable("wallets", {
  id: serial("id").primaryKey(),
  organisationId: integer("organisation_id").notNull().references(() => organisations.id),
  patientId: integer("patient_id").notNull().references(() => patients.id),
  balance: integer("balance").notNull().default(0),
  currency: text("currency").notNull().default("NGN"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  patientUnique: uniqueIndex("wallets_patient_idx").on(t.patientId),
}));

export type Wallet = typeof wallets.$inferSelect;
export type NewWallet = typeof wallets.$inferInsert;

// ─── Wallet Transactions ──────────────────────────────────────────────────────
// Append-only ledger of every wallet balance movement. balanceAfter snapshots
// the running balance so history renders without re-summing. referenceType/
// referenceId point at whatever caused the movement (a payments row for a
// top-up or a wallet-paid bill, a subscriptionCharges row for a subscription
// debit) — no FK since the source table varies by referenceType.
export const walletTransactions = pgTable("wallet_transactions", {
  id: serial("id").primaryKey(),
  organisationId: integer("organisation_id").notNull().references(() => organisations.id),
  walletId: integer("wallet_id").notNull().references(() => wallets.id),
  patientId: integer("patient_id").notNull().references(() => patients.id),
  type: text("type").notNull(), // "credit" | "debit"
  amount: integer("amount").notNull(),
  balanceAfter: integer("balance_after").notNull(),
  source: text("source").notNull(), // "topup" | "bill_payment" | "subscription_charge" | "refund" | "adjustment"
  referenceType: text("reference_type"), // "payment" | "subscription_charge"
  referenceId: integer("reference_id"),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  walletIdx: index("wallet_transactions_wallet_idx").on(t.walletId),
}));

export type WalletTransaction = typeof walletTransactions.$inferSelect;
export type NewWalletTransaction = typeof walletTransactions.$inferInsert;

// ─── Billing Plans ────────────────────────────────────────────────────────────
// Org-defined recurring subscription plans a patient can subscribe to.
// Deactivating a plan (isActive=false) stops new subscriptions without
// touching existing patientSubscriptions rows.
export const billingPlans = pgTable("billing_plans", {
  id: serial("id").primaryKey(),
  organisationId: integer("organisation_id").notNull().references(() => organisations.id),
  name: text("name").notNull(),
  description: text("description"),
  amount: integer("amount").notNull(),
  billingInterval: text("billing_interval").notNull().default("monthly"), // "weekly" | "monthly" | "yearly"
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export type BillingPlan = typeof billingPlans.$inferSelect;
export type NewBillingPlan = typeof billingPlans.$inferInsert;

// ─── Patient Subscriptions ────────────────────────────────────────────────────
// A patient's enrollment in a billing plan. nextChargeDate drives the daily
// cron sweep (see /api/cron/subscriptions/process) and is advanced by one
// billing interval after every charge attempt — success or failure — so a
// subscription can never be charged twice in the same cycle.
export const patientSubscriptions = pgTable("patient_subscriptions", {
  id: serial("id").primaryKey(),
  organisationId: integer("organisation_id").notNull().references(() => organisations.id),
  patientId: integer("patient_id").notNull().references(() => patients.id),
  billingPlanId: integer("billing_plan_id").notNull().references(() => billingPlans.id),
  status: text("status").notNull().default("active"), // "active" | "paused" | "cancelled" | "past_due"
  startDate: timestamp("start_date", { withTimezone: true }).notNull().defaultNow(),
  nextChargeDate: timestamp("next_charge_date", { withTimezone: true }).notNull(),
  lastChargedAt: timestamp("last_charged_at", { withTimezone: true }),
  cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  // Drives the cron sweep's "find subscriptions due today" query.
  statusChargeIdx: index("patient_subscriptions_status_charge_idx").on(t.status, t.nextChargeDate),
}));

export type PatientSubscription = typeof patientSubscriptions.$inferSelect;
export type NewPatientSubscription = typeof patientSubscriptions.$inferInsert;

// ─── Subscription Charges ─────────────────────────────────────────────────────
// One row per charge attempt (success or failure) against a subscription —
// the billing history shown to a patient/finance officer, distinct from
// patientSubscriptions which only tracks current state.
export const subscriptionCharges = pgTable("subscription_charges", {
  id: serial("id").primaryKey(),
  organisationId: integer("organisation_id").notNull().references(() => organisations.id),
  patientSubscriptionId: integer("patient_subscription_id").notNull().references(() => patientSubscriptions.id),
  patientId: integer("patient_id").notNull().references(() => patients.id),
  amount: integer("amount").notNull(),
  status: text("status").notNull(), // "success" | "failed"
  failureReason: text("failure_reason"),
  walletTransactionId: integer("wallet_transaction_id").references(() => walletTransactions.id),
  chargedAt: timestamp("charged_at", { withTimezone: true }).notNull().defaultNow(),
});

export type SubscriptionCharge = typeof subscriptionCharges.$inferSelect;
export type NewSubscriptionCharge = typeof subscriptionCharges.$inferInsert;

// ─── Billing Plan Items ───────────────────────────────────────────────────────
// Which catalog services a billing plan entitles a subscriber to for free
// (e.g. a specific lab test or drug product), on top of — or instead of —
// being a flat recurring charge. itemId points at labTests.id or products.id
// depending on itemType; no FK since it's polymorphic (same reasoning as
// paymentItems). A patient with an active subscription to this plan gets
// their matching requests/prescriptions marked paid via plan coverage
// instead of paying per-item — see lib/subscriptions.ts#getPatientPlanCoverage.
export const billingPlanItems = pgTable("billing_plan_items", {
  id: serial("id").primaryKey(),
  organisationId: integer("organisation_id").notNull().references(() => organisations.id),
  billingPlanId: integer("billing_plan_id").notNull().references(() => billingPlans.id),
  itemType: text("item_type").notNull(), // "lab_test" | "product"
  itemId: integer("item_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  planItemUnique: uniqueIndex("billing_plan_items_unique_idx").on(t.billingPlanId, t.itemType, t.itemId),
}));

export type BillingPlanItem = typeof billingPlanItems.$inferSelect;
export type NewBillingPlanItem = typeof billingPlanItems.$inferInsert;

// ─── Price Lists (payer tariffs) ──────────────────────────────────────────────
// A payer-specific tariff schedule. In Nigeria each HMO (and NHIA / state
// schemes) negotiates its own price per service with the hospital, so the
// same lab test can cost ₦8,000 self-pay, ₦6,500 to one HMO and ₦7,000 to
// another. labTests.price / products.price remain the self-pay ("base")
// price; a price list overrides it for patients covered by that payer. At
// most one *active* list per (org, HMO) is in effect on a given date —
// enforced in application code (see lib/billing/pricing.ts) rather than a
// unique index, so a hospital can stage next year's tariff in advance with
// a future effectiveFrom.
export const priceLists = pgTable("price_lists", {
  id: serial("id").primaryKey(),
  organisationId: integer("organisation_id").notNull().references(() => organisations.id),
  name: text("name").notNull(),
  payerType: text("payer_type").notNull().default("hmo"), // "hmo" | "nhia" | "state_scheme" | "corporate"
  hmoId: integer("hmo_id").notNull().references(() => hmos.id),
  effectiveFrom: text("effective_from").notNull(), // YYYY-MM-DD
  effectiveTo: text("effective_to"), // YYYY-MM-DD, inclusive; null = open-ended
  isActive: boolean("is_active").notNull().default(true),
  notes: text("notes"),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
}, (t) => ({
  orgHmoIdx: index("price_lists_org_hmo_idx").on(t.organisationId, t.hmoId),
}));

export type PriceList = typeof priceLists.$inferSelect;
export type NewPriceList = typeof priceLists.$inferInsert;

// ─── Price List Items ─────────────────────────────────────────────────────────
// One tariff line per service on a price list. itemId points at labTests.id
// or products.id depending on itemType — no FK since it's polymorphic (same
// reasoning as billingPlanItems). A service that has no line on the payer's
// list is NOT covered: the patient pays the self-pay price for it.
//   coverage "covered"  → the HMO pays `price` minus the patient's co-pay
//   coverage "excluded" → listed explicitly as not covered (patient pays the
//                         self-pay price); kept as a row so the exclusion is
//                         visible on the tariff rather than implied
// copayPercent is the patient's share of `price` (0–100). requiresAuthorization
// flags services the HMO only pays for with a pre-authorization code.
export const priceListItems = pgTable("price_list_items", {
  id: serial("id").primaryKey(),
  organisationId: integer("organisation_id").notNull().references(() => organisations.id),
  priceListId: integer("price_list_id").notNull().references(() => priceLists.id),
  itemType: text("item_type").notNull(), // "lab_test" | "product" | "service" | "ward_bed"
  itemId: integer("item_id").notNull(),
  price: integer("price").notNull(),
  coverage: text("coverage").notNull().default("covered"), // "covered" | "excluded"
  copayPercent: integer("copay_percent").notNull().default(0),
  requiresAuthorization: boolean("requires_authorization").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  listItemUnique: uniqueIndex("price_list_items_unique_idx").on(t.priceListId, t.itemType, t.itemId),
}));

export type PriceListItem = typeof priceListItems.$inferSelect;
export type NewPriceListItem = typeof priceListItems.$inferInsert;

// ─── HMO Charges (receivables) ────────────────────────────────────────────────
// The HMO's share of a settled bill item — what the hospital will claim from
// the HMO. Written once, at the moment a request/prescription becomes "paid"
// (patient share collected, or zero), with the tariff amounts snapshotted so
// later price-list edits don't change what's owed. This is the ledger the
// monthly HMO claim batches will be built from. itemId points at requests.id
// or prescriptions.id depending on itemType (polymorphic, no FK). The unique
// index makes recording idempotent: settling the same item twice can't
// double-bill the HMO.
export const hmoCharges = pgTable("hmo_charges", {
  id: serial("id").primaryKey(),
  organisationId: integer("organisation_id").notNull().references(() => organisations.id),
  patientId: integer("patient_id").notNull().references(() => patients.id),
  hmoId: integer("hmo_id").notNull().references(() => hmos.id),
  priceListId: integer("price_list_id").notNull().references(() => priceLists.id),
  coverageId: integer("coverage_id").references(() => patientCoverages.id),
  itemType: text("item_type").notNull(), // "request" | "prescription"
  itemId: integer("item_id").notNull(),
  description: text("description"),
  policyNumber: text("policy_number"),
  tariffPrice: integer("tariff_price").notNull(),
  hmoAmount: integer("hmo_amount").notNull(),
  patientAmount: integer("patient_amount").notNull(),
  requiresAuthorization: boolean("requires_authorization").notNull().default(false),
  // The approved hmo_authorizations row this charge was settled under (null
  // for codes typed in later from the HMO Billing tab, kept in
  // authorizationCode only).
  authorizationId: integer("authorization_id").references(() => hmoAuthorizations.id),
  authorizationCode: text("authorization_code"),
  // Lifecycle: unclaimed → (in a draft claim batch, still unclaimed) →
  // claimed (batch submitted) → paid | rejected | queried; a queried line
  // goes back to claimed once the query is answered.
  status: text("status").notNull().default("unclaimed"), // "unclaimed" | "claimed" | "queried" | "paid" | "rejected"
  statusNote: text("status_note"),
  claimBatchId: integer("claim_batch_id").references(() => claimBatches.id),
  // Remittance: what the HMO actually paid for this line (may be less than
  // hmoAmount — a partial payment / tariff dispute).
  paidAmount: integer("paid_amount"),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  serviceDate: timestamp("service_date", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  itemUnique: uniqueIndex("hmo_charges_item_idx").on(t.itemType, t.itemId),
  orgHmoStatusIdx: index("hmo_charges_org_hmo_status_idx").on(t.organisationId, t.hmoId, t.status),
  claimBatchIdx: index("hmo_charges_claim_batch_idx").on(t.claimBatchId),
}));

export type HmoCharge = typeof hmoCharges.$inferSelect;
export type NewHmoCharge = typeof hmoCharges.$inferInsert;

// ─── Patient Coverages (payer enrollee records) ───────────────────────────────
// A patient's enrolment with a payer: membership number, plan, whether they
// are the principal member or a dependant, and the validity window. A patient
// can have many over time (switching HMOs, renewals) but at most one with
// status "active" — enforced in lib/billing/coverage.ts. Billing uses the
// active coverage that is valid on the service date; an expired or suspended
// coverage bills the patient self-pay.
//
// patients.hmoId / patients.policyNumber are kept as a denormalised mirror of
// the active coverage (many screens join through them); only
// lib/billing/coverage.ts#syncPatientMirror writes them.
export const patientCoverages = pgTable("patient_coverages", {
  id: serial("id").primaryKey(),
  organisationId: integer("organisation_id").notNull().references(() => organisations.id),
  patientId: integer("patient_id").notNull().references(() => patients.id),
  hmoId: integer("hmo_id").notNull().references(() => hmos.id),
  planName: text("plan_name"),
  // Required by the API for new coverages; nullable only so legacy patients
  // without a recorded policy number could be backfilled.
  membershipNumber: text("membership_number"),
  relationship: text("relationship").notNull().default("principal"), // "principal" | "spouse" | "child" | "other"
  principalName: text("principal_name"),
  principalMembershipNumber: text("principal_membership_number"),
  // Capitation: the facility the enrollee is registered with for primary care.
  primaryProvider: text("primary_provider"),
  validFrom: text("valid_from"), // YYYY-MM-DD; null = no start limit
  validTo: text("valid_to"), // YYYY-MM-DD, inclusive; null = open-ended
  status: text("status").notNull().default("active"), // "active" | "suspended" | "ended"
  notes: text("notes"),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
}, (t) => ({
  patientIdx: index("patient_coverages_patient_idx").on(t.patientId),
}));

export type PatientCoverage = typeof patientCoverages.$inferSelect;
export type NewPatientCoverage = typeof patientCoverages.$inferInsert;

// ─── Eligibility Checks ───────────────────────────────────────────────────────
// Append-only log of every time staff verified an enrollee with their HMO
// (phone, WhatsApp, HMO portal…). "Eligibility not verified" is a leading
// cause of claim rejection, and the log is the hospital's evidence that it
// checked before treating.
export const eligibilityChecks = pgTable("eligibility_checks", {
  id: serial("id").primaryKey(),
  organisationId: integer("organisation_id").notNull().references(() => organisations.id),
  coverageId: integer("coverage_id").notNull().references(() => patientCoverages.id),
  patientId: integer("patient_id").notNull().references(() => patients.id),
  channel: text("channel").notNull(), // "phone" | "whatsapp" | "email" | "hmo_portal" | "card" | "other"
  result: text("result").notNull(), // "eligible" | "not_eligible" | "pending"
  reference: text("reference"),
  notes: text("notes"),
  checkedBy: integer("checked_by").references(() => users.id),
  checkedAt: timestamp("checked_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  coverageIdx: index("eligibility_checks_coverage_idx").on(t.coverageId, t.checkedAt),
}));

export type EligibilityCheck = typeof eligibilityChecks.$inferSelect;
export type NewEligibilityCheck = typeof eligibilityChecks.$inferInsert;

// ─── HMO Authorizations (pre-authorization log) ───────────────────────────────
// One row per pre-authorization request sent to an HMO for an enrollee's
// services. Raised automatically when a clinician orders a service the HMO's
// tariff marks requiresAuthorization, or by finance staff manually. NHIA
// requires HMOs to answer within one hour (from April 2025), so requestedAt /
// respondedAt are the hospital's evidence if it has to escalate a slow HMO to
// the NHIA state office. Status lifecycle:
//   pending (unsent → sent) → approved (code, validUntil) | denied (reason) | cancelled
// isEmergency marks "treat now, get the code after" cases.
export const hmoAuthorizations = pgTable("hmo_authorizations", {
  id: serial("id").primaryKey(),
  organisationId: integer("organisation_id").notNull().references(() => organisations.id),
  patientId: integer("patient_id").notNull().references(() => patients.id),
  coverageId: integer("coverage_id").notNull().references(() => patientCoverages.id),
  hmoId: integer("hmo_id").notNull().references(() => hmos.id),
  status: text("status").notNull().default("pending"), // "pending" | "approved" | "denied" | "cancelled"
  source: text("source").notNull().default("manual"), // "auto" (raised on order) | "manual"
  channel: text("channel"), // how it was requested: "phone" | "whatsapp" | "email" | "hmo_portal" | "other"
  isEmergency: boolean("is_emergency").notNull().default(false),
  // requestedAt = when the hospital raised it; sentAt = when it was actually
  // sent to the HMO (the one-hour SLA clock starts here). An auto-raised
  // request stays unsent — and keeps collecting the patient's further
  // orders — until finance sends it.
  requestedAt: timestamp("requested_at", { withTimezone: true }).notNull().defaultNow(),
  requestedBy: integer("requested_by").references(() => users.id),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  sentBy: integer("sent_by").references(() => users.id),
  code: text("code"),
  validUntil: text("valid_until"), // YYYY-MM-DD, inclusive
  denialReason: text("denial_reason"),
  respondedAt: timestamp("responded_at", { withTimezone: true }),
  respondedBy: integer("responded_by").references(() => users.id),
  escalatedAt: timestamp("escalated_at", { withTimezone: true }),
  escalationNote: text("escalation_note"),
  escalatedBy: integer("escalated_by").references(() => users.id),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  orgStatusIdx: index("hmo_authorizations_org_status_idx").on(t.organisationId, t.status, t.requestedAt),
  patientIdx: index("hmo_authorizations_patient_idx").on(t.patientId),
}));

export type HmoAuthorization = typeof hmoAuthorizations.$inferSelect;
export type NewHmoAuthorization = typeof hmoAuthorizations.$inferInsert;

// ─── HMO Authorization Items ──────────────────────────────────────────────────
// The bill items (lab/imaging requests, prescriptions) an authorization
// covers. itemId points at requests.id or prescriptions.id depending on
// itemType (polymorphic, no FK). An item can appear on several
// authorizations over time (e.g. denied, then re-requested); the newest
// non-cancelled one is the one that counts.
export const hmoAuthorizationItems = pgTable("hmo_authorization_items", {
  id: serial("id").primaryKey(),
  authorizationId: integer("authorization_id").notNull().references(() => hmoAuthorizations.id),
  itemType: text("item_type").notNull(), // "request" | "prescription"
  itemId: integer("item_id").notNull(),
  description: text("description"),
  tariffPrice: integer("tariff_price"),
}, (t) => ({
  itemIdx: index("hmo_authorization_items_item_idx").on(t.itemType, t.itemId),
  authItemUnique: uniqueIndex("hmo_authorization_items_unique_idx").on(t.authorizationId, t.itemType, t.itemId),
}));

export type HmoAuthorizationItem = typeof hmoAuthorizationItems.$inferSelect;
export type NewHmoAuthorizationItem = typeof hmoAuthorizationItems.$inferInsert;

// ─── Claim Batches ────────────────────────────────────────────────────────────
// A monthly claim to one HMO: the hmo_charges lines (claimBatchId) for
// services in periodMonth. Draft batches can be edited (lines added or
// removed, pre-submission checks re-run); submitting freezes the lines and
// marks them claimed. Remittance is then posted line by line. Status:
//   draft → submitted → closed (every line paid or rejected)
export const claimBatches = pgTable("claim_batches", {
  id: serial("id").primaryKey(),
  organisationId: integer("organisation_id").notNull().references(() => organisations.id),
  hmoId: integer("hmo_id").notNull().references(() => hmos.id),
  periodMonth: text("period_month").notNull(), // YYYY-MM (service month)
  reference: text("reference").notNull(), // hospital's batch number, e.g. CLM-LWH-202610-01
  status: text("status").notNull().default("draft"), // "draft" | "submitted" | "closed"
  submittedAt: timestamp("submitted_at", { withTimezone: true }),
  submittedBy: integer("submitted_by").references(() => users.id),
  submissionChannel: text("submission_channel"), // "email" | "hmo_portal" | "hand_delivery" | "other"
  hmoReference: text("hmo_reference"), // the HMO's acknowledgement / batch number
  // Snapshot of the HMO total at submission (lines can't change afterwards).
  totalClaimed: integer("total_claimed"),
  notes: text("notes"),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  orgReferenceUnique: uniqueIndex("claim_batches_org_reference_idx").on(t.organisationId, t.reference),
  orgHmoIdx: index("claim_batches_org_hmo_idx").on(t.organisationId, t.hmoId, t.periodMonth),
}));

export type ClaimBatch = typeof claimBatches.$inferSelect;
export type NewClaimBatch = typeof claimBatches.$inferInsert;

// ─── Drug Classes ─────────────────────────────────────────────────────────────
// Pharmacological families used for class-level allergy matching ("allergic
// to penicillins" must catch Amoxicillin). Built-in classes have a null
// organisationId and are shared reference data (like icd11_codes); a
// hospital's pharmacist can add its own (organisationId set). Members are
// lower-case active-ingredient names matched against drug_generics.name, so
// matching works across every org's own generic list without per-org links.
export const drugClasses = pgTable("drug_classes", {
  id: serial("id").primaryKey(),
  organisationId: integer("organisation_id").references(() => organisations.id),
  key: text("key").notNull(), // stable slug, e.g. "penicillins"
  name: text("name").notNull(),
  description: text("description"),
  members: json("members").$type<string[]>().notNull(),
  // Classes whose members commonly cross-react with this one (e.g.
  // penicillins ↔ cephalosporins): a warning, not a block.
  crossReactsWith: json("cross_reacts_with").$type<string[]>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
}, (t) => ({
  builtinKeyUnique: uniqueIndex("drug_classes_builtin_key_idx").on(t.key).where(sql`organisation_id IS NULL`),
  orgKeyUnique: uniqueIndex("drug_classes_org_key_idx").on(t.organisationId, t.key).where(sql`organisation_id IS NOT NULL`),
}));

export type DrugClass = typeof drugClasses.$inferSelect;
export type NewDrugClass = typeof drugClasses.$inferInsert;

// ─── Patient Allergies ────────────────────────────────────────────────────────
// Structured allergy / intolerance list (FHIR AllergyIntolerance). category:
//   "drug"       a specific active ingredient (genericId, or substance text)
//   "drug_class" a whole family (drugClassId) — e.g. all penicillins
//   "food" | "environment" | "other"  substance text only
// "allergy" (immune — can be dangerous) is kept distinct from "intolerance"
// (side effect, e.g. nausea) so warnings can be pitched correctly. Records
// are never hard-deleted: verification "refuted" means tested and not
// allergic; deletedAt means entered in error.
export const patientAllergies = pgTable("patient_allergies", {
  id: serial("id").primaryKey(),
  organisationId: integer("organisation_id").notNull().references(() => organisations.id),
  patientId: integer("patient_id").notNull().references(() => patients.id),
  category: text("category").notNull(), // "drug" | "drug_class" | "food" | "environment" | "other"
  genericId: integer("generic_id").references(() => drugGenerics.id),
  drugClassId: integer("drug_class_id").references(() => drugClasses.id),
  substance: text("substance").notNull(), // display name, e.g. "Amoxicillin", "Penicillins", "Groundnuts"
  type: text("type").notNull().default("allergy"), // "allergy" | "intolerance"
  reaction: text("reaction"), // e.g. "Rash, facial swelling"
  severity: text("severity").notNull().default("moderate"), // "mild" | "moderate" | "severe" | "life_threatening"
  verification: text("verification").notNull().default("unconfirmed"), // "unconfirmed" | "confirmed" | "refuted"
  onsetDate: text("onset_date"), // YYYY-MM-DD or YYYY, as reported
  notes: text("notes"),
  recordedBy: integer("recorded_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
}, (t) => ({
  patientIdx: index("patient_allergies_patient_idx").on(t.patientId),
}));

export type PatientAllergy = typeof patientAllergies.$inferSelect;
export type NewPatientAllergy = typeof patientAllergies.$inferInsert;

// ─── Patient Problems (problem list) ──────────────────────────────────────────
// Ongoing / long-term conditions carried across visits (FHIR Condition,
// category problem-list-item) — distinct from visit_diagnoses, which record
// what was diagnosed at one consultation. A visit diagnosis can be promoted
// here (sourceVisitId). deletedAt = entered in error.
export const patientProblems = pgTable("patient_problems", {
  id: serial("id").primaryKey(),
  organisationId: integer("organisation_id").notNull().references(() => organisations.id),
  patientId: integer("patient_id").notNull().references(() => patients.id),
  icdCode: text("icd_code").references(() => icd11Codes.code),
  icdTitle: text("icd_title"),
  clinicalText: text("clinical_text"),
  status: text("status").notNull().default("active"), // "active" | "inactive" | "resolved"
  onsetDate: text("onset_date"), // YYYY-MM-DD or YYYY
  resolvedDate: text("resolved_date"),
  notes: text("notes"),
  sourceVisitId: integer("source_visit_id").references(() => visits.id),
  recordedBy: integer("recorded_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
}, (t) => ({
  patientIdx: index("patient_problems_patient_idx").on(t.patientId),
}));

export type PatientProblem = typeof patientProblems.$inferSelect;
export type NewPatientProblem = typeof patientProblems.$inferInsert;

// ─── Patient Measurements (weight / height) ───────────────────────────────────
// Dated weight/height readings — weight drives paediatric mg/kg dosing
// checks. Kept small on purpose; the full vitals flowsheet (NEWS2) is a
// later, separate table.
export const patientMeasurements = pgTable("patient_measurements", {
  id: serial("id").primaryKey(),
  organisationId: integer("organisation_id").notNull().references(() => organisations.id),
  patientId: integer("patient_id").notNull().references(() => patients.id),
  weightKg: real("weight_kg"),
  heightCm: real("height_cm"),
  source: text("source").notNull().default("measured"), // "measured" | "reported"
  measuredAt: timestamp("measured_at", { withTimezone: true }).notNull().defaultNow(),
  notes: text("notes"),
  recordedBy: integer("recorded_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
}, (t) => ({
  patientIdx: index("patient_measurements_patient_idx").on(t.patientId, t.measuredAt),
}));

export type PatientMeasurement = typeof patientMeasurements.$inferSelect;
export type NewPatientMeasurement = typeof patientMeasurements.$inferInsert;

// ─── CDS Alert Events ─────────────────────────────────────────────────────────
// Append-only log of clinical decision-support alerts a prescriber
// overrode, with the coded reason — the audit trail for "the system warned,
// the doctor proceeded because…", and the data for tuning noisy rules.
export const cdsAlertEvents = pgTable("cds_alert_events", {
  id: serial("id").primaryKey(),
  organisationId: integer("organisation_id").notNull().references(() => organisations.id),
  patientId: integer("patient_id").notNull().references(() => patients.id),
  prescriptionId: integer("prescription_id").references(() => prescriptions.id),
  genericId: integer("generic_id").references(() => drugGenerics.id),
  rule: text("rule").notNull(), // "drug_allergy" | "class_allergy" | "cross_reactivity" | "allergy_not_assessed"
  severity: text("severity").notNull(), // "critical" | "warning"
  message: text("message").notNull(),
  allergyId: integer("allergy_id").references(() => patientAllergies.id),
  action: text("action").notNull().default("overridden"),
  overrideReason: text("override_reason"), // coded key, see lib/cds/allergy.ts
  overrideNote: text("override_note"),
  userId: integer("user_id").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  orgRuleIdx: index("cds_alert_events_org_rule_idx").on(t.organisationId, t.rule, t.createdAt),
}));

export type CdsAlertEvent = typeof cdsAlertEvents.$inferSelect;
export type NewCdsAlertEvent = typeof cdsAlertEvents.$inferInsert;

// ─── Lab Test Parameters (result fields) ──────────────────────────────────────
// The structured fields a lab test reports, e.g. Full Blood Count →
// Haemoglobin, WBC, Platelets. A test with no parameters is reported as a file
// only (as before). valueType:
//   "numeric" — compared against the reference range (refLow/refHigh, or a
//               sex/age-specific entry in refRanges) and the critical limits
//   "choice"  — one of `choices`; those in `abnormalChoices` are flagged
//   "text"    — free text, never flagged
// code/unit follow LOINC/UCUM where known (Nigeria Core declares both).
export const labTestParameters = pgTable("lab_test_parameters", {
  id: serial("id").primaryKey(),
  organisationId: integer("organisation_id").notNull().references(() => organisations.id),
  testId: integer("test_id").notNull().references(() => labTests.id),
  name: text("name").notNull(),
  code: text("code"), // LOINC, e.g. "718-7" (Hb)
  unit: text("unit"),
  valueType: text("value_type").notNull().default("numeric"), // "numeric" | "choice" | "text"
  choices: json("choices").$type<string[]>(),
  abnormalChoices: json("abnormal_choices").$type<string[]>(),
  refLow: real("ref_low"),
  refHigh: real("ref_high"),
  // Optional sex/age-specific ranges; the first match wins, else refLow/refHigh.
  refRanges: json("ref_ranges").$type<{ sex?: "male" | "female"; minAgeYears?: number; maxAgeYears?: number; low?: number | null; high?: number | null }[]>(),
  criticalLow: real("critical_low"),
  criticalHigh: real("critical_high"),
  decimals: integer("decimals"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
}, (t) => ({
  testIdx: index("lab_test_parameters_test_idx").on(t.testId),
}));

export type LabTestParameter = typeof labTestParameters.$inferSelect;
export type NewLabTestParameter = typeof labTestParameters.$inferInsert;

// ─── Lab Result Values ────────────────────────────────────────────────────────
// One structured result per parameter per request (FHIR Observation). The
// unit, reference range and flag are snapshotted at entry, so editing a
// test's ranges later doesn't rewrite past results. Corrections update the
// row and set amendedAt (the audit log keeps the previous value).
export const labResultValues = pgTable("lab_result_values", {
  id: serial("id").primaryKey(),
  organisationId: integer("organisation_id").notNull().references(() => organisations.id),
  requestId: integer("request_id").notNull().references(() => requests.id),
  parameterId: integer("parameter_id").notNull().references(() => labTestParameters.id),
  name: text("name").notNull(),
  valueNumeric: real("value_numeric"),
  valueText: text("value_text"),
  unit: text("unit"),
  refLow: real("ref_low"),
  refHigh: real("ref_high"),
  // "normal" | "low" | "high" | "critical_low" | "critical_high" | "abnormal"
  flag: text("flag").notNull().default("normal"),
  comment: text("comment"),
  enteredBy: integer("entered_by").references(() => users.id),
  enteredAt: timestamp("entered_at", { withTimezone: true }).notNull().defaultNow(),
  amendedAt: timestamp("amended_at", { withTimezone: true }),
}, (t) => ({
  requestParamUnique: uniqueIndex("lab_result_values_request_param_idx").on(t.requestId, t.parameterId),
}));

export type LabResultValue = typeof labResultValues.$inferSelect;
export type NewLabResultValue = typeof labResultValues.$inferInsert;

// ─── Critical Result Alerts ───────────────────────────────────────────────────
// A result past a critical limit must reach a clinician who confirms they
// received it (closed-loop communication). One row per critical value:
// raised when it's entered, addressed to the ordering clinician, and open
// until acknowledged with a note of what was done. Unacknowledged alerts
// older than the escalation window show as overdue on the lab's list so the
// lab phones the ward/doctor.
export const criticalAlerts = pgTable("critical_alerts", {
  id: serial("id").primaryKey(),
  organisationId: integer("organisation_id").notNull().references(() => organisations.id),
  patientId: integer("patient_id").notNull().references(() => patients.id),
  requestId: integer("request_id").notNull().references(() => requests.id),
  resultValueId: integer("result_value_id").notNull().references(() => labResultValues.id),
  parameterName: text("parameter_name").notNull(),
  value: text("value").notNull(), // display, e.g. "2.4 mmol/L"
  flag: text("flag").notNull(), // "critical_low" | "critical_high"
  notifyUserId: integer("notify_user_id").references(() => users.id),
  raisedBy: integer("raised_by").references(() => users.id),
  raisedAt: timestamp("raised_at", { withTimezone: true }).notNull().defaultNow(),
  acknowledgedAt: timestamp("acknowledged_at", { withTimezone: true }),
  acknowledgedBy: integer("acknowledged_by").references(() => users.id),
  actionNote: text("action_note"),
  // Set when the lab records that it phoned someone about an overdue alert.
  escalatedAt: timestamp("escalated_at", { withTimezone: true }),
  escalationNote: text("escalation_note"),
}, (t) => ({
  orgOpenIdx: index("critical_alerts_org_open_idx").on(t.organisationId, t.acknowledgedAt),
  resultUnique: uniqueIndex("critical_alerts_result_idx").on(t.resultValueId),
}));

export type CriticalAlert = typeof criticalAlerts.$inferSelect;
export type NewCriticalAlert = typeof criticalAlerts.$inferInsert;

// ─── Vital Signs (observations chart) ─────────────────────────────────────────
// One set of observations. The early-warning score is calculated server-side
// at save time (lib/clinical/ews.ts) and stored with its inputs, so the chart
// shows exactly what the nurse saw. scoreType:
//   "news2" adults · "meows" pregnant / up to 6 weeks postpartum ·
//   "paeds" under 16 (interim score on APLS age ranges — not a validated PEWS)
// band: "low" | "low_medium" | "medium" | "high"; nextDueAt follows the band.
// When the band calls for escalation, who was informed is recorded.
export const vitalSigns = pgTable("vital_signs", {
  id: serial("id").primaryKey(),
  organisationId: integer("organisation_id").notNull().references(() => organisations.id),
  patientId: integer("patient_id").notNull().references(() => patients.id),
  admissionId: integer("admission_id").references(() => admissions.id),
  recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull().defaultNow(),
  recordedBy: integer("recorded_by").references(() => users.id),
  temperatureC: real("temperature_c"),
  heartRate: integer("heart_rate"),
  respiratoryRate: integer("respiratory_rate"),
  systolicBp: integer("systolic_bp"),
  diastolicBp: integer("diastolic_bp"),
  spo2: integer("spo2"),
  onOxygen: boolean("on_oxygen").notNull().default(false),
  oxygenLpm: real("oxygen_lpm"),
  // NEWS2 SpO2 scale 2 — only for patients with confirmed hypercapnic
  // respiratory failure (target 88–92%), on a clinician's instruction.
  spo2Scale2: boolean("spo2_scale2").notNull().default(false),
  consciousness: text("consciousness"), // ACVPU: "A" | "C" | "V" | "P" | "U"
  painScore: integer("pain_score"), // 0–10
  bloodGlucose: real("blood_glucose"), // mg/dL
  scoreType: text("score_type"),
  score: integer("score"),
  band: text("band"),
  // Parameters that individually triggered (e.g. NEWS2 sub-score of 3, MEOWS red).
  triggers: json("triggers").$type<string[]>(),
  nextDueAt: timestamp("next_due_at", { withTimezone: true }),
  escalatedTo: text("escalated_to"),
  escalationNote: text("escalation_note"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
}, (t) => ({
  patientIdx: index("vital_signs_patient_idx").on(t.patientId, t.recordedAt),
  admissionIdx: index("vital_signs_admission_idx").on(t.admissionId, t.recordedAt),
}));

export type VitalSign = typeof vitalSigns.$inferSelect;
export type NewVitalSign = typeof vitalSigns.$inferInsert;

// ─── Medication Administrations (eMAR events) ─────────────────────────────────
// One row per recorded administration decision for an inpatient
// prescription. Scheduled doses are NOT pre-generated: the schedule is
// computed from the prescription's frequency/start/duration
// (lib/emar/schedule.ts) and each slot is "open" until an event with that
// scheduledAt exists. PRN (as-needed) and STAT doses have scheduledAt null.
// status: "given" | "held" | "refused" | "not_available" | "missed"
// High-alert medicines require a second nurse (witnessedBy) when given.
// deletedAt = entered in error.
export const medicationAdministrations = pgTable("medication_administrations", {
  id: serial("id").primaryKey(),
  organisationId: integer("organisation_id").notNull().references(() => organisations.id),
  prescriptionId: integer("prescription_id").notNull().references(() => prescriptions.id),
  patientId: integer("patient_id").notNull().references(() => patients.id),
  admissionId: integer("admission_id").references(() => admissions.id),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
  status: text("status").notNull(),
  givenAt: timestamp("given_at", { withTimezone: true }).notNull().defaultNow(),
  doseGiven: text("dose_given"),
  route: text("route"),
  reason: text("reason"), // why held / refused / missed / not available
  prnIndication: text("prn_indication"),
  prnEffect: text("prn_effect"),
  prnEffectAt: timestamp("prn_effect_at", { withTimezone: true }),
  administeredBy: integer("administered_by").references(() => users.id),
  witnessedBy: integer("witnessed_by").references(() => users.id),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
}, (t) => ({
  prescriptionIdx: index("medication_administrations_rx_idx").on(t.prescriptionId, t.scheduledAt),
  admissionIdx: index("medication_administrations_adm_idx").on(t.admissionId, t.givenAt),
  slotUnique: uniqueIndex("medication_administrations_slot_idx")
    .on(t.prescriptionId, t.scheduledAt)
    .where(sql`scheduled_at IS NOT NULL AND deleted_at IS NULL`),
}));

export type MedicationAdministration = typeof medicationAdministrations.$inferSelect;
export type NewMedicationAdministration = typeof medicationAdministrations.$inferInsert;

// ─── Patient Identifiers ──────────────────────────────────────────────────────
// Additional identifiers for a patient beyond patients.nin / patients.mrn:
// previous hospital numbers (incl. the MRN of a record merged into this one),
// birth certificate, passport, NHIA / insurance numbers. Searchable at
// registration so the same person is found by any number they carry.
// system: "legacy_mrn" | "nin" | "birth_certificate" | "passport" |
//         "nhia" | "insurance" | "voters_card" | "other"
export const patientIdentifiers = pgTable("patient_identifiers", {
  id: serial("id").primaryKey(),
  organisationId: integer("organisation_id").notNull().references(() => organisations.id),
  patientId: integer("patient_id").notNull().references(() => patients.id),
  system: text("system").notNull(),
  value: text("value").notNull(),
  assigner: text("assigner"), // who issued it, e.g. previous hospital's name
  notes: text("notes"),
  sourceMergeId: integer("source_merge_id"),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
}, (t) => ({
  patientIdx: index("patient_identifiers_patient_idx").on(t.patientId),
  orgValueIdx: index("patient_identifiers_org_value_idx").on(t.organisationId, t.value),
}));

export type PatientIdentifier = typeof patientIdentifiers.$inferSelect;
export type NewPatientIdentifier = typeof patientIdentifiers.$inferInsert;

// ─── Patient Merges ───────────────────────────────────────────────────────────
// Audit + undo record for merging a duplicate (merged) into the record kept
// (survivor). `repointed` lists, per table, the row ids moved from merged to
// survivor so an undo moves exactly those back. `snapshot` keeps the merged
// patient's demographics as they were.
export const patientMerges = pgTable("patient_merges", {
  id: serial("id").primaryKey(),
  organisationId: integer("organisation_id").notNull().references(() => organisations.id),
  survivorId: integer("survivor_id").notNull().references(() => patients.id),
  mergedId: integer("merged_id").notNull().references(() => patients.id),
  reason: text("reason"),
  matchScore: integer("match_score"),
  repointed: json("repointed").$type<Record<string, number[]>>().notNull(),
  snapshot: json("snapshot").$type<Record<string, unknown>>().notNull(),
  walletTransfer: integer("wallet_transfer"), // Naira moved from merged wallet to survivor's
  mergedBy: integer("merged_by").references(() => users.id),
  mergedAt: timestamp("merged_at", { withTimezone: true }).notNull().defaultNow(),
  undoneAt: timestamp("undone_at", { withTimezone: true }),
  undoneBy: integer("undone_by").references(() => users.id),
  undoReason: text("undo_reason"),
}, (t) => ({
  orgIdx: index("patient_merges_org_idx").on(t.organisationId, t.mergedAt),
}));

export type PatientMerge = typeof patientMerges.$inferSelect;
export type NewPatientMerge = typeof patientMerges.$inferInsert;

// ─── Duplicate Dismissals ─────────────────────────────────────────────────────
// Pairs a records officer reviewed and confirmed are different people, so
// the duplicate list stops suggesting them. Stored with lowId < highId.
export const patientDuplicateDismissals = pgTable("patient_duplicate_dismissals", {
  id: serial("id").primaryKey(),
  organisationId: integer("organisation_id").notNull().references(() => organisations.id),
  lowId: integer("low_id").notNull().references(() => patients.id),
  highId: integer("high_id").notNull().references(() => patients.id),
  note: text("note"),
  dismissedBy: integer("dismissed_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  pairUnique: uniqueIndex("patient_duplicate_dismissals_pair_idx").on(t.lowId, t.highId),
}));

// ─── Message Templates ────────────────────────────────────────────────────────
// A hospital's own wording for an automatic message kind; without one, the
// built-in default in lib/messaging/templates.ts is used. Placeholders:
// {patient} {hospital} {when} {date} {time} {doctor} {test} {amount}.
export const messageTemplates = pgTable("message_templates", {
  id: serial("id").primaryKey(),
  organisationId: integer("organisation_id").notNull().references(() => organisations.id),
  kind: text("kind").notNull(),
  body: text("body").notNull(),
  updatedBy: integer("updated_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  orgKindUnique: uniqueIndex("message_templates_org_kind_idx").on(t.organisationId, t.kind),
}));

export type MessageTemplate = typeof messageTemplates.$inferSelect;

// ─── Outbound Messages (SMS log) ──────────────────────────────────────────────
// Every message CareVault tried to send, including ones skipped (opted out,
// no phone, SMS off) — the record of what each patient was told and when.
// dedupeKey (unique per org) makes each automatic message send at most once,
// e.g. "appt:123:reminder_24h".
// status: "sent" | "failed" | "skipped"
export const outboundMessages = pgTable("outbound_messages", {
  id: serial("id").primaryKey(),
  organisationId: integer("organisation_id").notNull().references(() => organisations.id),
  patientId: integer("patient_id").references(() => patients.id),
  kind: text("kind").notNull(), // "appointment_booked" | "reminder_24h" | "reminder_2h" | "results_ready" | "payment_receipt" | "test" | "custom"
  channel: text("channel").notNull().default("sms"),
  toPhone: text("to_phone"),
  body: text("body").notNull(),
  status: text("status").notNull(),
  skipReason: text("skip_reason"),
  provider: text("provider"),
  providerRef: text("provider_ref"),
  error: text("error"),
  dedupeKey: text("dedupe_key"),
  relatedType: text("related_type"), // "appointment" | "request" | "payment"
  relatedId: integer("related_id"),
  sentBy: integer("sent_by").references(() => users.id), // null = automatic
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  orgCreatedIdx: index("outbound_messages_org_created_idx").on(t.organisationId, t.createdAt),
  dedupeUnique: uniqueIndex("outbound_messages_dedupe_idx").on(t.organisationId, t.dedupeKey).where(sql`dedupe_key IS NOT NULL`),
  patientIdx: index("outbound_messages_patient_idx").on(t.patientId),
}));

export type OutboundMessage = typeof outboundMessages.$inferSelect;

// ─── Service Items (non-lab, non-drug chargeable services) ────────────────────
// The hospital's price list for services that aren't a lab/imaging test or a
// product: consultation, nursing care, procedures, theatre, registration,
// dressings, ambulance… Charged onto a patient's bill as patient_charges.
// HMO tariffs: price list item type "service".
export const serviceItems = pgTable("service_items", {
  id: serial("id").primaryKey(),
  organisationId: integer("organisation_id").notNull().references(() => organisations.id),
  name: text("name").notNull(),
  category: text("category").notNull().default("other"), // "consultation" | "procedure" | "nursing" | "theatre" | "registration" | "accommodation" | "other"
  price: integer("price").notNull(),
  taxCode: text("tax_code").notNull().default("zero_rated"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
}, (t) => ({
  orgIdx: index("service_items_org_idx").on(t.organisationId),
}));

export type ServiceItem = typeof serviceItems.$inferSelect;
export type NewServiceItem = typeof serviceItems.$inferInsert;

// ─── Patient Charges ──────────────────────────────────────────────────────────
// Bill lines that aren't a lab/imaging request or a prescription:
//   "bed_day" — one per admission per WAT calendar day, generated from the
//               ward's dailyRate (unique per admission+date, so re-syncing
//               the bill never double-charges);
//   "service" — a service item added by staff (quantity × unit price);
//   "vaccine" — one vaccination dose (see vaccination_doses.chargeId).
// unitPrice is the self-pay price snapshotted when charged; HMO patients are
// priced from their tariff (lib/billing/pricing.ts, bill item type "charge").
// paymentStatus mirrors requests/prescriptions: "not_paid" | "paid" | "waived".
// deletedAt = voided (voidReason kept).
export const patientCharges = pgTable("patient_charges", {
  id: serial("id").primaryKey(),
  organisationId: integer("organisation_id").notNull().references(() => organisations.id),
  patientId: integer("patient_id").notNull().references(() => patients.id),
  admissionId: integer("admission_id").references(() => admissions.id),
  appointmentId: integer("appointment_id").references(() => appointments.id),
  sourceType: text("source_type").notNull(), // "bed_day" | "service" | "vaccine"
  serviceItemId: integer("service_item_id").references(() => serviceItems.id),
  wardId: integer("ward_id").references(() => wards.id),
  chargeDate: text("charge_date").notNull(), // YYYY-MM-DD (WAT)
  description: text("description").notNull(),
  quantity: integer("quantity").notNull().default(1),
  unitPrice: integer("unit_price").notNull(),
  taxCode: text("tax_code").notNull().default("zero_rated"),
  paymentStatus: text("payment_status").notNull().default("not_paid"),
  waivedReason: text("waived_reason"),
  waivedBy: integer("waived_by").references(() => users.id),
  notes: text("notes"),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  voidReason: text("void_reason"),
}, (t) => ({
  admissionIdx: index("patient_charges_admission_idx").on(t.admissionId),
  patientIdx: index("patient_charges_patient_idx").on(t.patientId),
  bedDayUnique: uniqueIndex("patient_charges_bed_day_idx")
    .on(t.admissionId, t.chargeDate)
    // Includes voided rows, so a bed day voided as charged-in-error is never
    // regenerated by the next bill sync.
    .where(sql`source_type = 'bed_day'`),
}));

export type PatientCharge = typeof patientCharges.$inferSelect;
export type NewPatientCharge = typeof patientCharges.$inferInsert;

// ─── Vaccines (catalogue) ─────────────────────────────────────────────────────
// The vaccines a hospital offers, priced per dose. doseCount / interval are the
// usual schedule (e.g. Hepatitis B: 3 doses, 1 month apart) and only prefill a
// booking — staff can set a different period per patient.
// intervalUnit: "day" | "week" | "month" | "year".
export const vaccines = pgTable("vaccines", {
  id: serial("id").primaryKey(),
  organisationId: integer("organisation_id").notNull().references(() => organisations.id),
  name: text("name").notNull(),
  description: text("description"),
  doseCount: integer("dose_count").notNull().default(1),
  intervalValue: integer("interval_value").notNull().default(0),
  intervalUnit: text("interval_unit").notNull().default("month"),
  price: integer("price").notNull(), // per dose, whole Naira
  taxCode: text("tax_code").notNull().default("zero_rated"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
}, (t) => ({
  orgIdx: index("vaccines_org_idx").on(t.organisationId),
}));

export type Vaccine = typeof vaccines.$inferSelect;

// ─── Vaccination Courses ──────────────────────────────────────────────────────
// One patient on one vaccine, with the period they come back in: doseCount
// doses, the first on startDate, then one every intervalValue intervalUnit.
// The doses themselves (and their bill lines) are vaccination_doses.
// status: "active" | "completed" | "cancelled".
export const vaccinationCourses = pgTable("vaccination_courses", {
  id: serial("id").primaryKey(),
  organisationId: integer("organisation_id").notNull().references(() => organisations.id),
  patientId: integer("patient_id").notNull().references(() => patients.id),
  vaccineId: integer("vaccine_id").notNull().references(() => vaccines.id),
  startDate: text("start_date").notNull(), // YYYY-MM-DD
  doseCount: integer("dose_count").notNull(),
  intervalValue: integer("interval_value").notNull(),
  intervalUnit: text("interval_unit").notNull(),
  status: text("status").notNull().default("active"),
  notes: text("notes"),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  patientIdx: index("vaccination_courses_patient_idx").on(t.patientId),
}));

export type VaccinationCourse = typeof vaccinationCourses.$inferSelect;

// ─── Vaccination Doses ────────────────────────────────────────────────────────
// Each visit the patient is due to come in for. Every dose is billed when the
// course is booked (a patient_charges row, source "vaccine", linked by
// chargeId) so the patient can pay ahead from their portal; cancelling an
// unpaid dose voids its charge.
// status: "scheduled" | "given" | "missed" | "cancelled" ("overdue" is derived:
// scheduled with a date in the past).
export const vaccinationDoses = pgTable("vaccination_doses", {
  id: serial("id").primaryKey(),
  organisationId: integer("organisation_id").notNull().references(() => organisations.id),
  courseId: integer("course_id").notNull().references(() => vaccinationCourses.id),
  patientId: integer("patient_id").notNull().references(() => patients.id),
  doseNumber: integer("dose_number").notNull(),
  scheduledDate: text("scheduled_date").notNull(), // YYYY-MM-DD
  status: text("status").notNull().default("scheduled"),
  chargeId: integer("charge_id").references(() => patientCharges.id),
  givenAt: timestamp("given_at", { withTimezone: true }),
  givenBy: integer("given_by").references(() => users.id),
  batchNumber: text("batch_number"),
  site: text("site"), // where it was given, e.g. "left deltoid"
  notes: text("notes"),
  cancelReason: text("cancel_reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  courseIdx: index("vaccination_doses_course_idx").on(t.courseId),
  patientIdx: index("vaccination_doses_patient_idx").on(t.patientId),
  orgDateIdx: index("vaccination_doses_org_date_idx").on(t.organisationId, t.scheduledDate),
}));

export type VaccinationDose = typeof vaccinationDoses.$inferSelect;

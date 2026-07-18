import {
  pgTable,
  text,
  timestamp,
  json,
  serial,
  integer,
  boolean,
  uniqueIndex,
} from "drizzle-orm/pg-core";

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

// ─── HMOs (shared across all orgs) ───────────────────────────────────────────
export const hmos = pgTable("hmos", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

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
});

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

// ─── Products ─────────────────────────────────────────────────────────────────
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  organisationId: integer("organisation_id").notNull().references(() => organisations.id),
  name: text("name").notNull(),
  description: text("description"),
  casesInStock: integer("cases_in_stock").notNull().default(0),
  unitsPerCase: integer("units_per_case").notNull().default(1),
  looseUnitsInStock: integer("loose_units_in_stock").notNull().default(0),
  reorderLevel: integer("reorder_level").notNull().default(20),
  price: integer("price").notNull().default(0),
  category: text("category").notNull().default("general"),
  isPrescribable: boolean("is_prescribable").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

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
export const prescriptions = pgTable("prescriptions", {
  id: serial("id").primaryKey(),
  organisationId: integer("organisation_id").notNull().references(() => organisations.id),
  appointmentId: integer("appointment_id").references(() => appointments.id),
  patientId: integer("patient_id").notNull().references(() => patients.id),
  requestedBy: integer("requested_by").notNull().references(() => users.id),
  productId: integer("product_id").notNull().references(() => products.id),
  dosage: text("dosage").notNull(),
  paymentStatus: text("payment_status").notNull().default("not_paid"),
  status: text("status").notNull().default("pending"),
  cancellationReason: text("cancellation_reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

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

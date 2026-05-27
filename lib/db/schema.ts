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
export const organisations = pgTable("organisations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
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
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
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

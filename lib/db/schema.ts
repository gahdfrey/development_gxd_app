import {
  pgTable,
  text,
  timestamp,
  json,
  serial,
  integer,
  boolean,
} from "drizzle-orm/pg-core";

/**
 * Users table schema
 * Stores user authentication and profile information
 */
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  firstname: text("firstname").notNull(),
  lastname: text("lastname").notNull(),
  password: text("password").notNull(), // Hashed with bcrypt
  roleId: integer("role_id").references(() => roles.id),
  departmentId: integer("department_id").references(() => departments.id), // Department the user belongs to
  patientId: integer("patient_id"), // Links to patients table for patient portal accounts
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const roles = pgTable("roles", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  permissions: json("permissions"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * HMO table schema
 * Stores Health Maintenance Organization information
 */
export const hmos = pgTable("hmos", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type HMO = typeof hmos.$inferSelect;
export type NewHMO = typeof hmos.$inferInsert;

export const patients = pgTable("patients", {
  id: serial("id").primaryKey(),
  firstname: text("firstname").notNull(),
  lastname: text("lastname").notNull(),
  gender: text("gender").notNull(),
  dob: text("dob").notNull(),
  maidenName: text("maiden_name"),
  email: text("email"), // Patient's own email — used for portal login
  countryCode: text("country_code").notNull(),
  phone: text("phone").notNull(),
  insuranceType: text("insurance_type").notNull(), // "private", "hmo", "corporate"
  hmoId: integer("hmo_id").references(() => hmos.id), // Required when insuranceType is "hmo"
  policyNumber: text("policy_number"), // Required when insuranceType is "hmo"
  // Next of Kin fields
  nextOfKinFirstname: text("next_of_kin_firstname"),
  nextOfKinLastname: text("next_of_kin_lastname"),
  nextOfKinRelationship: text("next_of_kin_relationship"),
  nextOfKinAddress: text("next_of_kin_address"),
  nextOfKinPhone: text("next_of_kin_phone"),
  nextOfKinEmail: text("next_of_kin_email"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }), // Soft delete: null = active, timestamp = deleted
});

/**
 * Appointments table schema
 * Stores scheduled appointments between patients and doctors
 */
export const appointments = pgTable("appointments", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id")
    .notNull()
    .references(() => patients.id),
  doctorId: integer("doctor_id")
    .notNull()
    .references(() => users.id),
  appointmentDate: text("appointment_date").notNull(), // Format: YYYY-MM-DD
  appointmentTime: text("appointment_time").notNull(), // Format: HH:MM (24-hour)
  status: text("status").notNull().default("scheduled"), // scheduled, completed, cancelled, no-show
  visitType: text("visit_type").notNull().default("new visit"), // new visit, follow up, review, first visit after discharge, drug refill
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Visits table schema
 * Stores consultation records with duration and doctor notes
 */
export const visits = pgTable("visits", {
  id: serial("id").primaryKey(),
  appointmentId: integer("appointment_id")
    .notNull()
    .references(() => appointments.id),
  patientId: integer("patient_id")
    .notNull()
    .references(() => patients.id),
  doctorId: integer("doctor_id")
    .notNull()
    .references(() => users.id),
  doctorNotes: text("doctor_notes"),
  durationMinutes: integer("duration_minutes").notNull(),
  startTime: timestamp("start_time", { withTimezone: true }).notNull(),
  endTime: timestamp("end_time", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// Type inference for TypeScript
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Role = typeof roles.$inferSelect;
export type NewRole = typeof roles.$inferInsert;

export type Patient = typeof patients.$inferSelect;
export type NewPatient = typeof patients.$inferInsert;

export type Appointment = typeof appointments.$inferSelect;
export type NewAppointment = typeof appointments.$inferInsert;

export type Visit = typeof visits.$inferSelect;
export type NewVisit = typeof visits.$inferInsert;



// User with role name joined
export type UserWithRole = User & { roleName: string | null };

/**
 * Departments table schema
 * Stores laboratory/clinical departments
 */
export const departments = pgTable("departments", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Department = typeof departments.$inferSelect;
export type NewDepartment = typeof departments.$inferInsert;

/**
 * Lab Tests table schema
 * Stores tests/investigations linked to a department
 */
export const labTests = pgTable("lab_tests", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  price: integer("price").notNull(), // stored in smallest currency unit (e.g. kobo)
  departmentId: integer("department_id")
    .notNull()
    .references(() => departments.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type LabTest = typeof labTests.$inferSelect;
export type NewLabTest = typeof labTests.$inferInsert;

// Lab test with department name joined
export type LabTestWithDepartment = LabTest & { departmentName: string };

/**
 * Requests table schema
 * Stores lab/test requests raised by doctors after a consultation
 */
export const requests = pgTable("requests", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id")
    .notNull()
    .references(() => patients.id),
  departmentId: integer("department_id")
    .notNull()
    .references(() => departments.id),
  testId: integer("test_id")
    .notNull()
    .references(() => labTests.id),
  requestedBy: integer("requested_by")
    .notNull()
    .references(() => users.id),
  appointmentId: integer("appointment_id").references(() => appointments.id),
  status: text("status").notNull().default("pending"), // pending, completed, cancelled
  paymentStatus: text("payment_status").notNull().default("not_paid"), // paid, not_paid
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Request = typeof requests.$inferSelect;
export type NewRequest = typeof requests.$inferInsert;

/**
 * Request Results table schema
 * Stores uploaded result files (PDF, images, etc.) for a completed request
 */
export const requestResults = pgTable("request_results", {
  id: serial("id").primaryKey(),
  requestId: integer("request_id")
    .notNull()
    .references(() => requests.id),
  fileName: text("file_name").notNull(),
  filePath: text("file_path").notNull(),
  fileType: text("file_type").notNull(),
  message: text("message"),
  uploadedBy: integer("uploaded_by")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type RequestResult = typeof requestResults.$inferSelect;
export type NewRequestResult = typeof requestResults.$inferInsert;

/**
 * Notifications table schema
 * Stores result-upload notifications for doctors
 */
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id), // the doctor to notify
  requestId: integer("request_id")
    .notNull()
    .references(() => requests.id),
  patientFirstname: text("patient_firstname"),
  patientLastname: text("patient_lastname"),
  departmentName: text("department_name"),
  message: text("message"), // optional message from the uploaded result
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;

/**
 * Inventory Items table schema
 * Stores the central stock of supply items managed by admin/store
 */
export const inventoryItems = pgTable("inventory_items", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  unit: text("unit").notNull(), // e.g. "units", "boxes", "vials", "packs"
  quantity: integer("quantity").notNull().default(0), // current stock level
  reorderLevel: integer("reorder_level").notNull().default(10), // warn when stock <= this
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type InventoryItem = typeof inventoryItems.$inferSelect;
export type NewInventoryItem = typeof inventoryItems.$inferInsert;

/**
 * Supply Orders table schema
 * A supply order raised by a department requesting items from inventory
 */
export const supplyOrders = pgTable("supply_orders", {
  id: serial("id").primaryKey(),
  departmentOrderId: integer("department_order_id"), // groups all line-orders from the same dept requisition
  departmentId: integer("department_id")
    .notNull()
    .references(() => departments.id),
  requestedBy: integer("requested_by")
    .notNull()
    .references(() => users.id),
  status: text("status").notNull().default("pending"), // legacy — kept for old data
  departmentStatus: text("department_status").notNull().default("pending"), // dept view: pending | accepted
  supplyStatus: text("supply_status").notNull().default("pending"),         // supply view: pending | accepted | delivered | cancelled
  notes: text("notes"),
  cancellationReason: text("cancellation_reason"), // set by supply team when supplyStatus = cancelled
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type SupplyOrder = typeof supplyOrders.$inferSelect;
export type NewSupplyOrder = typeof supplyOrders.$inferInsert;

/**
 * Supply Order Items table schema
 * The individual line items within a supply order.
 * References products (new flow). inventoryItemId kept nullable for legacy data.
 */
export const supplyOrderItems = pgTable("supply_order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id")
    .notNull()
    .references(() => supplyOrders.id),
  inventoryItemId: integer("inventory_item_id")
    .references(() => inventoryItems.id),
  productId: integer("product_id")
    .references(() => products.id),
  quantityRequested: integer("quantity_requested").notNull(),
  status: text("status").notNull().default("pending"), // pending | delivered
  deliveredAt: timestamp("delivered_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type SupplyOrderItem = typeof supplyOrderItems.$inferSelect;
export type NewSupplyOrderItem = typeof supplyOrderItems.$inferInsert;

/**
 * Products table schema
 * Tracks medical product stock using a case + loose-unit model.
 * Total units = casesInStock × unitsPerCase + looseUnitsInStock
 */
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  casesInStock: integer("cases_in_stock").notNull().default(0),
  unitsPerCase: integer("units_per_case").notNull().default(1),
  looseUnitsInStock: integer("loose_units_in_stock").notNull().default(0),
  reorderLevel: integer("reorder_level").notNull().default(20), // threshold in total units
  price: integer("price").notNull().default(0), // price in naira (whole units)
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;

import {
  pgTable,
  text,
  timestamp,
  json,
  serial,
  integer,
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
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const roles = pgTable("roles", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  permissions: json("permissions"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/**
 * HMO table schema
 * Stores Health Maintenance Organization information
 */
export const hmos = pgTable("hmos", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
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
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  deletedAt: timestamp("deleted_at"), // Soft delete: null = active, timestamp = deleted
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
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
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
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
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

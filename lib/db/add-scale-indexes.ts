import "dotenv/config";
import { db } from "./index";
import { sql } from "drizzle-orm";

/**
 * Indexes for growth (more patients, more staff, a growing audit trail):
 *  1. Org-leading indexes on the high-volume tenant tables. Nearly every
 *     query filters by organisation_id and sorts by date, and Postgres does
 *     not index foreign keys on its own, so these lists were full scans.
 *  2. patient_id indexes on per-patient clinical tables (history, FHIR
 *     export, portal) that lacked one.
 *  3. audit_logs — the fastest-growing table. The failed-login lockout check
 *     in auth.ts runs on every sign-in and filtered it with no index.
 *
 * CONCURRENTLY builds each index without locking writes, so this is safe to
 * run against a live database. Idempotent: re-running skips existing ones.
 */
const INDEXES: [name: string, table: string, columns: string][] = [
  ["patients_org_created_idx", "patients", "organisation_id, created_at"],
  ["appointments_org_date_idx", "appointments", "organisation_id, appointment_date"],
  ["appointments_doctor_date_idx", "appointments", "doctor_id, appointment_date"],
  ["visits_org_created_idx", "visits", "organisation_id, created_at"],
  ["visits_patient_idx", "visits", "patient_id"],
  ["requests_org_created_idx", "requests", "organisation_id, created_at"],
  ["requests_patient_idx", "requests", "patient_id"],
  ["request_results_request_idx", "request_results", "request_id"],
  ["notifications_user_read_idx", "notifications", "user_id, is_read"],
  ["inventory_items_org_idx", "inventory_items", "organisation_id"],
  ["supply_orders_org_created_idx", "supply_orders", "organisation_id, created_at"],
  ["prescriptions_org_created_idx", "prescriptions", "organisation_id, created_at"],
  ["prescriptions_patient_idx", "prescriptions", "patient_id"],
  ["patient_consents_patient_idx", "patient_consents", "patient_id"],
  ["visit_diagnoses_patient_idx", "visit_diagnoses", "patient_id"],
  ["data_requests_org_created_idx", "data_requests", "organisation_id, created_at"],
  ["admissions_org_status_idx", "admissions", "organisation_id, status"],
  ["admissions_patient_idx", "admissions", "patient_id"],
  ["payments_org_created_idx", "payments", "organisation_id, created_at"],
  ["payments_patient_idx", "payments", "patient_id"],
  ["patient_charges_org_created_idx", "patient_charges", "organisation_id, created_at"],
  ["audit_logs_org_created_idx", "audit_logs", "organisation_id, created_at"],
  ["audit_logs_login_attempts_idx", "audit_logs", "user_email, action, created_at"],
  ["audit_logs_entity_idx", "audit_logs", "entity_type, entity_id"],
];

async function migrate() {
  for (const [name, table, columns] of INDEXES) {
    console.log(`Adding ${name}...`);
    await db.execute(
      sql.raw(`CREATE INDEX CONCURRENTLY IF NOT EXISTS ${name} ON ${table} (${columns})`),
    );
  }

  console.log("Migration completed successfully.");
  process.exit(0);
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});

import "dotenv/config";
import { db } from "./index";
import { sql } from "drizzle-orm";

/**
 * Structured lab results + critical value alerts:
 *  1. lab_test_parameters — the result fields each test reports, with units,
 *     reference ranges (incl. sex/age-specific) and critical limits
 *  2. lab_result_values — one entered value per field per request, with the
 *     range and flag snapshotted
 *  3. critical_alerts — closed-loop alerts for values past a critical limit
 * Additive only; safe to re-run. Existing file-only results are untouched.
 */
async function migrate() {
  console.log("Creating lab_test_parameters table...");
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS lab_test_parameters (
      id SERIAL PRIMARY KEY,
      organisation_id INTEGER NOT NULL REFERENCES organisations(id),
      test_id INTEGER NOT NULL REFERENCES lab_tests(id),
      name TEXT NOT NULL,
      code TEXT,
      unit TEXT,
      value_type TEXT NOT NULL DEFAULT 'numeric',
      choices JSON,
      abnormal_choices JSON,
      ref_low REAL,
      ref_high REAL,
      ref_ranges JSON,
      critical_low REAL,
      critical_high REAL,
      decimals INTEGER,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      deleted_at TIMESTAMPTZ
    )
  `);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS lab_test_parameters_test_idx ON lab_test_parameters (test_id)`);

  console.log("Creating lab_result_values table...");
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS lab_result_values (
      id SERIAL PRIMARY KEY,
      organisation_id INTEGER NOT NULL REFERENCES organisations(id),
      request_id INTEGER NOT NULL REFERENCES requests(id),
      parameter_id INTEGER NOT NULL REFERENCES lab_test_parameters(id),
      name TEXT NOT NULL,
      value_numeric REAL,
      value_text TEXT,
      unit TEXT,
      ref_low REAL,
      ref_high REAL,
      flag TEXT NOT NULL DEFAULT 'normal',
      comment TEXT,
      entered_by INTEGER REFERENCES users(id),
      entered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      amended_at TIMESTAMPTZ
    )
  `);
  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS lab_result_values_request_param_idx ON lab_result_values (request_id, parameter_id)
  `);

  console.log("Creating critical_alerts table...");
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS critical_alerts (
      id SERIAL PRIMARY KEY,
      organisation_id INTEGER NOT NULL REFERENCES organisations(id),
      patient_id INTEGER NOT NULL REFERENCES patients(id),
      request_id INTEGER NOT NULL REFERENCES requests(id),
      result_value_id INTEGER NOT NULL REFERENCES lab_result_values(id),
      parameter_name TEXT NOT NULL,
      value TEXT NOT NULL,
      flag TEXT NOT NULL,
      notify_user_id INTEGER REFERENCES users(id),
      raised_by INTEGER REFERENCES users(id),
      raised_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      acknowledged_at TIMESTAMPTZ,
      acknowledged_by INTEGER REFERENCES users(id),
      action_note TEXT,
      escalated_at TIMESTAMPTZ,
      escalation_note TEXT
    )
  `);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS critical_alerts_org_open_idx ON critical_alerts (organisation_id, acknowledged_at)`);
  await db.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS critical_alerts_result_idx ON critical_alerts (result_value_id)`);

  console.log("Lab results migration complete.");
  process.exit(0);
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});

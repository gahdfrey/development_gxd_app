import "dotenv/config";
import { db } from "./index";
import { sql } from "drizzle-orm";
import { BUILT_IN_DRUG_CLASSES } from "../cds/drugClassSeed";

/**
 * Release B part 1 — clinical safety foundation:
 *  1. patients.allergy_status (+ who/when) — "not_assessed" by default, so
 *     never-asked is distinguishable from "no known allergies"
 *  2. drug_classes — built-in (organisation_id NULL) + per-hospital drug
 *     families for class-level allergy matching; built-ins seeded/updated here
 *  3. patient_allergies, patient_problems, patient_measurements
 *  4. cds_alert_events — log of overridden prescribing alerts
 * Additive only; safe to re-run (built-in classes are upserted by key).
 */
async function migrate() {
  console.log("Adding allergy status to patients...");
  await db.execute(sql`
    ALTER TABLE patients
      ADD COLUMN IF NOT EXISTS allergy_status TEXT NOT NULL DEFAULT 'not_assessed',
      ADD COLUMN IF NOT EXISTS allergy_status_updated_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS allergy_status_updated_by INTEGER
  `);

  console.log("Creating drug_classes table...");
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS drug_classes (
      id SERIAL PRIMARY KEY,
      organisation_id INTEGER REFERENCES organisations(id),
      key TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      members JSON NOT NULL,
      cross_reacts_with JSON,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      deleted_at TIMESTAMPTZ
    )
  `);
  // NULL organisation_id would make a plain (org, key) unique index allow
  // duplicate built-ins, so built-ins and org classes get separate indexes.
  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS drug_classes_builtin_key_idx ON drug_classes (key) WHERE organisation_id IS NULL
  `);
  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS drug_classes_org_key_idx ON drug_classes (organisation_id, key) WHERE organisation_id IS NOT NULL
  `);

  console.log("Seeding built-in drug classes...");
  for (const c of BUILT_IN_DRUG_CLASSES) {
    await db.execute(sql`
      INSERT INTO drug_classes (organisation_id, key, name, description, members, cross_reacts_with)
      VALUES (NULL, ${c.key}, ${c.name}, ${c.description}, ${JSON.stringify(c.members)}::json, ${c.crossReactsWith ? JSON.stringify(c.crossReactsWith) : null}::json)
      ON CONFLICT (key) WHERE organisation_id IS NULL
      DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description,
        members = EXCLUDED.members, cross_reacts_with = EXCLUDED.cross_reacts_with, updated_at = NOW()
    `);
  }
  console.log(`  ${BUILT_IN_DRUG_CLASSES.length} built-in classes`);

  console.log("Creating patient_allergies table...");
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS patient_allergies (
      id SERIAL PRIMARY KEY,
      organisation_id INTEGER NOT NULL REFERENCES organisations(id),
      patient_id INTEGER NOT NULL REFERENCES patients(id),
      category TEXT NOT NULL,
      generic_id INTEGER REFERENCES drug_generics(id),
      drug_class_id INTEGER REFERENCES drug_classes(id),
      substance TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'allergy',
      reaction TEXT,
      severity TEXT NOT NULL DEFAULT 'moderate',
      verification TEXT NOT NULL DEFAULT 'unconfirmed',
      onset_date TEXT,
      notes TEXT,
      recorded_by INTEGER REFERENCES users(id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      deleted_at TIMESTAMPTZ
    )
  `);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS patient_allergies_patient_idx ON patient_allergies (patient_id)`);

  console.log("Creating patient_problems table...");
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS patient_problems (
      id SERIAL PRIMARY KEY,
      organisation_id INTEGER NOT NULL REFERENCES organisations(id),
      patient_id INTEGER NOT NULL REFERENCES patients(id),
      icd_code TEXT REFERENCES icd11_codes(code),
      icd_title TEXT,
      clinical_text TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      onset_date TEXT,
      resolved_date TEXT,
      notes TEXT,
      source_visit_id INTEGER REFERENCES visits(id),
      recorded_by INTEGER REFERENCES users(id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      deleted_at TIMESTAMPTZ
    )
  `);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS patient_problems_patient_idx ON patient_problems (patient_id)`);

  console.log("Creating patient_measurements table...");
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS patient_measurements (
      id SERIAL PRIMARY KEY,
      organisation_id INTEGER NOT NULL REFERENCES organisations(id),
      patient_id INTEGER NOT NULL REFERENCES patients(id),
      weight_kg REAL,
      height_cm REAL,
      source TEXT NOT NULL DEFAULT 'measured',
      measured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      notes TEXT,
      recorded_by INTEGER REFERENCES users(id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      deleted_at TIMESTAMPTZ
    )
  `);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS patient_measurements_patient_idx ON patient_measurements (patient_id, measured_at)`);

  console.log("Creating cds_alert_events table...");
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS cds_alert_events (
      id SERIAL PRIMARY KEY,
      organisation_id INTEGER NOT NULL REFERENCES organisations(id),
      patient_id INTEGER NOT NULL REFERENCES patients(id),
      prescription_id INTEGER REFERENCES prescriptions(id),
      generic_id INTEGER REFERENCES drug_generics(id),
      rule TEXT NOT NULL,
      severity TEXT NOT NULL,
      message TEXT NOT NULL,
      allergy_id INTEGER REFERENCES patient_allergies(id),
      action TEXT NOT NULL DEFAULT 'overridden',
      override_reason TEXT,
      override_note TEXT,
      user_id INTEGER REFERENCES users(id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS cds_alert_events_org_rule_idx ON cds_alert_events (organisation_id, rule, created_at)`);

  console.log("Allergies / problems / measurements migration complete.");
  process.exit(0);
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});

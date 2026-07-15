import "dotenv/config";
import { db } from "./index";
import { sql } from "drizzle-orm";

/**
 * Section-B migration: ICD-11 coded diagnoses (NDHA Terminology Services /
 * FHIR Condition artifact).
 *  1. icd11_codes      — WHO ICD-11 MMS reference table (seeded separately)
 *  2. visit_diagnoses  — structured diagnoses attached to a consultation
 *
 * pg_trgm powers fast fuzzy title search in the diagnosis picker.
 */
async function migrate() {
  console.log("Enabling pg_trgm extension...");
  await db.execute(sql`CREATE EXTENSION IF NOT EXISTS pg_trgm`);

  console.log("Creating icd11_codes table...");
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS icd11_codes (
      code TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      chapter TEXT,
      is_leaf BOOLEAN NOT NULL DEFAULT TRUE
    )
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS icd11_codes_title_trgm_idx
      ON icd11_codes USING gin (title gin_trgm_ops)
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS icd11_codes_code_prefix_idx
      ON icd11_codes (code text_pattern_ops)
  `);

  console.log("Creating visit_diagnoses table...");
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS visit_diagnoses (
      id SERIAL PRIMARY KEY,
      organisation_id INTEGER NOT NULL REFERENCES organisations(id),
      visit_id INTEGER NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
      patient_id INTEGER NOT NULL REFERENCES patients(id),
      icd_code TEXT REFERENCES icd11_codes(code),
      icd_title TEXT,
      clinical_text TEXT,
      diagnosis_type TEXT NOT NULL DEFAULT 'primary',
      recorded_by INTEGER NOT NULL REFERENCES users(id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS visit_diagnoses_visit_idx ON visit_diagnoses (visit_id)
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS visit_diagnoses_patient_idx ON visit_diagnoses (patient_id)
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS visit_diagnoses_code_idx ON visit_diagnoses (icd_code)
  `);

  console.log("Migration completed successfully.");
  process.exit(0);
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});

import "dotenv/config";
import { db } from "./index";
import { sql } from "drizzle-orm";

/**
 * Patient identity (master patient index):
 *  1. patients.merged_into_id / merged_at
 *  2. patient_identifiers — extra identifiers (previous MRNs, NHIA no., …),
 *     backfilled with nothing; populated by staff and by merges
 *  3. patient_merges — merge audit + undo data
 *  4. patient_duplicate_dismissals — pairs confirmed as different people
 *  5. trigram indexes on patient names for fast fuzzy candidate search
 * Additive; safe to re-run. pg_trgm is already installed.
 */
async function migrate() {
  console.log("Adding merge columns to patients...");
  await db.execute(sql`
    ALTER TABLE patients
      ADD COLUMN IF NOT EXISTS merged_into_id INTEGER,
      ADD COLUMN IF NOT EXISTS merged_at TIMESTAMPTZ
  `);

  console.log("Creating patient_identifiers...");
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS patient_identifiers (
      id SERIAL PRIMARY KEY,
      organisation_id INTEGER NOT NULL REFERENCES organisations(id),
      patient_id INTEGER NOT NULL REFERENCES patients(id),
      system TEXT NOT NULL,
      value TEXT NOT NULL,
      assigner TEXT,
      notes TEXT,
      source_merge_id INTEGER,
      created_by INTEGER REFERENCES users(id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      deleted_at TIMESTAMPTZ
    )
  `);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS patient_identifiers_patient_idx ON patient_identifiers (patient_id)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS patient_identifiers_org_value_idx ON patient_identifiers (organisation_id, value)`);

  console.log("Creating patient_merges...");
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS patient_merges (
      id SERIAL PRIMARY KEY,
      organisation_id INTEGER NOT NULL REFERENCES organisations(id),
      survivor_id INTEGER NOT NULL REFERENCES patients(id),
      merged_id INTEGER NOT NULL REFERENCES patients(id),
      reason TEXT,
      match_score INTEGER,
      repointed JSON NOT NULL,
      snapshot JSON NOT NULL,
      wallet_transfer INTEGER,
      merged_by INTEGER REFERENCES users(id),
      merged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      undone_at TIMESTAMPTZ,
      undone_by INTEGER REFERENCES users(id),
      undo_reason TEXT
    )
  `);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS patient_merges_org_idx ON patient_merges (organisation_id, merged_at)`);

  console.log("Creating patient_duplicate_dismissals...");
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS patient_duplicate_dismissals (
      id SERIAL PRIMARY KEY,
      organisation_id INTEGER NOT NULL REFERENCES organisations(id),
      low_id INTEGER NOT NULL REFERENCES patients(id),
      high_id INTEGER NOT NULL REFERENCES patients(id),
      note TEXT,
      dismissed_by INTEGER REFERENCES users(id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS patient_duplicate_dismissals_pair_idx ON patient_duplicate_dismissals (low_id, high_id)
  `);

  console.log("Adding trigram name indexes...");
  await db.execute(sql`CREATE EXTENSION IF NOT EXISTS pg_trgm`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS patients_lastname_trgm_idx ON patients USING gin (lower(lastname) gin_trgm_ops)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS patients_firstname_trgm_idx ON patients USING gin (lower(firstname) gin_trgm_ops)`);

  console.log("Patient identity migration complete.");
  process.exit(0);
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});

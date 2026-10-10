import "dotenv/config";
import { db } from "./index";
import { sql } from "drizzle-orm";

/**
 * Observations chart with early-warning scores (NEWS2 / MEOWS / interim
 * paediatric): vital_signs, one row per set of observations with the
 * calculated score, band, triggers and next-due time. Additive; safe to re-run.
 */
async function migrate() {
  console.log("Creating vital_signs table...");
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS vital_signs (
      id SERIAL PRIMARY KEY,
      organisation_id INTEGER NOT NULL REFERENCES organisations(id),
      patient_id INTEGER NOT NULL REFERENCES patients(id),
      admission_id INTEGER REFERENCES admissions(id),
      recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      recorded_by INTEGER REFERENCES users(id),
      temperature_c REAL,
      heart_rate INTEGER,
      respiratory_rate INTEGER,
      systolic_bp INTEGER,
      diastolic_bp INTEGER,
      spo2 INTEGER,
      on_oxygen BOOLEAN NOT NULL DEFAULT FALSE,
      oxygen_lpm REAL,
      spo2_scale2 BOOLEAN NOT NULL DEFAULT FALSE,
      consciousness TEXT,
      pain_score INTEGER,
      blood_glucose REAL,
      score_type TEXT,
      score INTEGER,
      band TEXT,
      triggers JSON,
      next_due_at TIMESTAMPTZ,
      escalated_to TEXT,
      escalation_note TEXT,
      notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      deleted_at TIMESTAMPTZ
    )
  `);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS vital_signs_patient_idx ON vital_signs (patient_id, recorded_at)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS vital_signs_admission_idx ON vital_signs (admission_id, recorded_at)`);
  console.log("Vitals migration complete.");
  process.exit(0);
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});

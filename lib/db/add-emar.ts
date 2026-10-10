import "dotenv/config";
import { db } from "./index";
import { sql } from "drizzle-orm";

/**
 * Inpatient medication chart (eMAR):
 *  1. structured dosing columns on prescriptions (dose, route, frequency,
 *     duration, start, PRN rules, admission, stop)
 *  2. medication_administrations — given / held / refused / not available /
 *     missed events, one per scheduled slot (or PRN/STAT dose)
 * Additive only (existing prescriptions keep working as outpatient
 * prescriptions); safe to re-run.
 */
async function migrate() {
  console.log("Adding structured dosing columns to prescriptions...");
  await db.execute(sql`
    ALTER TABLE prescriptions
      ADD COLUMN IF NOT EXISTS dose_amount TEXT,
      ADD COLUMN IF NOT EXISTS route TEXT,
      ADD COLUMN IF NOT EXISTS frequency TEXT,
      ADD COLUMN IF NOT EXISTS duration_days INTEGER,
      ADD COLUMN IF NOT EXISTS start_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS is_prn BOOLEAN NOT NULL DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS prn_indication TEXT,
      ADD COLUMN IF NOT EXISTS prn_max_per_24h INTEGER,
      ADD COLUMN IF NOT EXISTS prn_min_interval_hours REAL,
      ADD COLUMN IF NOT EXISTS admission_id INTEGER REFERENCES admissions(id),
      ADD COLUMN IF NOT EXISTS stopped_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS stopped_by INTEGER REFERENCES users(id),
      ADD COLUMN IF NOT EXISTS stop_reason TEXT
  `);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS prescriptions_admission_idx ON prescriptions (admission_id)`);

  console.log("Creating medication_administrations table...");
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS medication_administrations (
      id SERIAL PRIMARY KEY,
      organisation_id INTEGER NOT NULL REFERENCES organisations(id),
      prescription_id INTEGER NOT NULL REFERENCES prescriptions(id),
      patient_id INTEGER NOT NULL REFERENCES patients(id),
      admission_id INTEGER REFERENCES admissions(id),
      scheduled_at TIMESTAMPTZ,
      status TEXT NOT NULL,
      given_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      dose_given TEXT,
      route TEXT,
      reason TEXT,
      prn_indication TEXT,
      prn_effect TEXT,
      prn_effect_at TIMESTAMPTZ,
      administered_by INTEGER REFERENCES users(id),
      witnessed_by INTEGER REFERENCES users(id),
      notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      deleted_at TIMESTAMPTZ
    )
  `);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS medication_administrations_rx_idx ON medication_administrations (prescription_id, scheduled_at)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS medication_administrations_adm_idx ON medication_administrations (admission_id, given_at)`);
  // One recorded decision per scheduled dose (entered-in-error rows excluded).
  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS medication_administrations_slot_idx
      ON medication_administrations (prescription_id, scheduled_at)
      WHERE scheduled_at IS NOT NULL AND deleted_at IS NULL
  `);

  console.log("eMAR migration complete.");
  process.exit(0);
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});

import "dotenv/config";
import { db } from "./index";
import { sql } from "drizzle-orm";

/**
 * Admission billing (running inpatient bill):
 *  1. wards.daily_rate — bed charge per day
 *  2. service_items — non-lab / non-drug chargeable services
 *  3. patient_charges — bed-day and service bill lines
 *  4. admissions.discharge_balance / discharge_balance_note — discharge with
 *     an outstanding balance needs a recorded reason
 * Additive only; safe to re-run.
 */
async function migrate() {
  console.log("Adding wards.daily_rate...");
  await db.execute(sql`ALTER TABLE wards ADD COLUMN IF NOT EXISTS daily_rate INTEGER`);
  console.log("Adding discharge balance columns...");
  await db.execute(sql`
    ALTER TABLE admissions
      ADD COLUMN IF NOT EXISTS discharge_balance INTEGER,
      ADD COLUMN IF NOT EXISTS discharge_balance_note TEXT
  `);
  console.log("Creating service_items...");
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS service_items (
      id SERIAL PRIMARY KEY,
      organisation_id INTEGER NOT NULL REFERENCES organisations(id),
      name TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'other',
      price INTEGER NOT NULL,
      tax_code TEXT NOT NULL DEFAULT 'zero_rated',
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      deleted_at TIMESTAMPTZ
    )
  `);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS service_items_org_idx ON service_items (organisation_id)`);
  console.log("Creating patient_charges...");
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS patient_charges (
      id SERIAL PRIMARY KEY,
      organisation_id INTEGER NOT NULL REFERENCES organisations(id),
      patient_id INTEGER NOT NULL REFERENCES patients(id),
      admission_id INTEGER REFERENCES admissions(id),
      appointment_id INTEGER REFERENCES appointments(id),
      source_type TEXT NOT NULL,
      service_item_id INTEGER REFERENCES service_items(id),
      ward_id INTEGER REFERENCES wards(id),
      charge_date TEXT NOT NULL,
      description TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      unit_price INTEGER NOT NULL,
      tax_code TEXT NOT NULL DEFAULT 'zero_rated',
      payment_status TEXT NOT NULL DEFAULT 'not_paid',
      waived_reason TEXT,
      waived_by INTEGER REFERENCES users(id),
      notes TEXT,
      created_by INTEGER REFERENCES users(id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      deleted_at TIMESTAMPTZ,
      void_reason TEXT
    )
  `);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS patient_charges_admission_idx ON patient_charges (admission_id)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS patient_charges_patient_idx ON patient_charges (patient_id)`);
  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS patient_charges_bed_day_idx ON patient_charges (admission_id, charge_date)
      WHERE source_type = 'bed_day'
  `);
  console.log("Admission billing migration complete.");
  process.exit(0);
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});

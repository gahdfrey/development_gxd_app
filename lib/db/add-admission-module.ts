import "dotenv/config";
import { db } from "./index";
import { sql } from "drizzle-orm";

/**
 * Admission (ADT — Admission, Discharge, Transfer) module migration:
 *  1. wards — hospital wards, optionally tied to a department
 *  2. beds — individual beds within a ward, with an occupancy status
 *  3. admissions — a patient's inpatient stay: ward/bed, admitting doctor,
 *     type, reason, and eventual discharge
 *  4. admission_transfers — full ward/bed movement history per admission
 */
async function migrate() {
  console.log("Creating wards table...");
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS wards (
      id SERIAL PRIMARY KEY,
      organisation_id INTEGER NOT NULL REFERENCES organisations(id),
      name TEXT NOT NULL,
      department_id INTEGER REFERENCES departments(id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      deleted_at TIMESTAMPTZ
    )
  `);
  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS wards_name_org_idx
      ON wards (name, organisation_id)
  `);

  console.log("Creating beds table...");
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS beds (
      id SERIAL PRIMARY KEY,
      organisation_id INTEGER NOT NULL REFERENCES organisations(id),
      ward_id INTEGER NOT NULL REFERENCES wards(id),
      bed_number TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'available',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      deleted_at TIMESTAMPTZ
    )
  `);
  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS beds_number_ward_idx
      ON beds (bed_number, ward_id)
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS beds_ward_idx ON beds (ward_id)
  `);

  console.log("Creating admissions table...");
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS admissions (
      id SERIAL PRIMARY KEY,
      organisation_id INTEGER NOT NULL REFERENCES organisations(id),
      patient_id INTEGER NOT NULL REFERENCES patients(id),
      appointment_id INTEGER REFERENCES appointments(id),
      ward_id INTEGER NOT NULL REFERENCES wards(id),
      bed_id INTEGER NOT NULL REFERENCES beds(id),
      admitting_doctor_id INTEGER NOT NULL REFERENCES users(id),
      admission_type TEXT NOT NULL DEFAULT 'elective',
      admission_reason TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'admitted',
      admitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      discharged_at TIMESTAMPTZ,
      discharge_summary TEXT,
      discharged_by INTEGER REFERENCES users(id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS admissions_org_status_idx
      ON admissions (organisation_id, status)
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS admissions_patient_idx ON admissions (patient_id)
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS admissions_bed_idx ON admissions (bed_id)
  `);

  console.log("Creating admission_transfers table...");
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS admission_transfers (
      id SERIAL PRIMARY KEY,
      organisation_id INTEGER NOT NULL REFERENCES organisations(id),
      admission_id INTEGER NOT NULL REFERENCES admissions(id),
      from_ward_id INTEGER REFERENCES wards(id),
      from_bed_id INTEGER REFERENCES beds(id),
      to_ward_id INTEGER NOT NULL REFERENCES wards(id),
      to_bed_id INTEGER NOT NULL REFERENCES beds(id),
      reason TEXT,
      transferred_by INTEGER NOT NULL REFERENCES users(id),
      transferred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS admission_transfers_admission_idx
      ON admission_transfers (admission_id)
  `);

  console.log("Migration completed successfully.");
  process.exit(0);
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});

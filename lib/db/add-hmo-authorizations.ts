import "dotenv/config";
import { db } from "./index";
import { sql } from "drizzle-orm";

/**
 * HMO pre-authorization log:
 *  1. hmo_authorizations — one row per authorization request to an HMO, with
 *     request/response timestamps (NHIA one-hour SLA evidence), code,
 *     validity, denial reason and escalation
 *  2. hmo_authorization_items — the requests/prescriptions it covers
 *  3. hmo_charges.authorization_id — the approved authorization a charge
 *     was settled under
 */
async function migrate() {
  console.log("Creating hmo_authorizations table...");
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS hmo_authorizations (
      id SERIAL PRIMARY KEY,
      organisation_id INTEGER NOT NULL REFERENCES organisations(id),
      patient_id INTEGER NOT NULL REFERENCES patients(id),
      coverage_id INTEGER NOT NULL REFERENCES patient_coverages(id),
      hmo_id INTEGER NOT NULL REFERENCES hmos(id),
      status TEXT NOT NULL DEFAULT 'pending',
      source TEXT NOT NULL DEFAULT 'manual',
      channel TEXT,
      is_emergency BOOLEAN NOT NULL DEFAULT FALSE,
      requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      requested_by INTEGER REFERENCES users(id),
      sent_at TIMESTAMPTZ,
      sent_by INTEGER REFERENCES users(id),
      code TEXT,
      valid_until TEXT,
      denial_reason TEXT,
      responded_at TIMESTAMPTZ,
      responded_by INTEGER REFERENCES users(id),
      escalated_at TIMESTAMPTZ,
      escalation_note TEXT,
      escalated_by INTEGER REFERENCES users(id),
      notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS hmo_authorizations_org_status_idx
      ON hmo_authorizations (organisation_id, status, requested_at)
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS hmo_authorizations_patient_idx ON hmo_authorizations (patient_id)
  `);

  console.log("Creating hmo_authorization_items table...");
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS hmo_authorization_items (
      id SERIAL PRIMARY KEY,
      authorization_id INTEGER NOT NULL REFERENCES hmo_authorizations(id),
      item_type TEXT NOT NULL,
      item_id INTEGER NOT NULL,
      description TEXT,
      tariff_price INTEGER
    )
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS hmo_authorization_items_item_idx ON hmo_authorization_items (item_type, item_id)
  `);
  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS hmo_authorization_items_unique_idx
      ON hmo_authorization_items (authorization_id, item_type, item_id)
  `);

  console.log("Adding hmo_charges.authorization_id...");
  await db.execute(sql`
    ALTER TABLE hmo_charges ADD COLUMN IF NOT EXISTS authorization_id INTEGER REFERENCES hmo_authorizations(id)
  `);

  console.log("HMO authorizations migration complete.");
  process.exit(0);
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});

import "dotenv/config";
import { db } from "./index";
import { sql } from "drizzle-orm";

/**
 * HMO price lists & billing migration:
 *  1. price_lists — payer-specific tariff schedules (one per HMO contract)
 *  2. price_list_items — the per-service tariff lines on a price list
 *  3. hmo_charges — the HMO's share of each settled bill item (receivables
 *     that monthly HMO claims are built from)
 */
async function migrate() {
  console.log("Creating price_lists table...");
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS price_lists (
      id SERIAL PRIMARY KEY,
      organisation_id INTEGER NOT NULL REFERENCES organisations(id),
      name TEXT NOT NULL,
      payer_type TEXT NOT NULL DEFAULT 'hmo',
      hmo_id INTEGER NOT NULL REFERENCES hmos(id),
      effective_from TEXT NOT NULL,
      effective_to TEXT,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      notes TEXT,
      created_by INTEGER REFERENCES users(id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      deleted_at TIMESTAMPTZ
    )
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS price_lists_org_hmo_idx
      ON price_lists (organisation_id, hmo_id)
  `);

  console.log("Creating price_list_items table...");
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS price_list_items (
      id SERIAL PRIMARY KEY,
      organisation_id INTEGER NOT NULL REFERENCES organisations(id),
      price_list_id INTEGER NOT NULL REFERENCES price_lists(id),
      item_type TEXT NOT NULL,
      item_id INTEGER NOT NULL,
      price INTEGER NOT NULL,
      coverage TEXT NOT NULL DEFAULT 'covered',
      copay_percent INTEGER NOT NULL DEFAULT 0,
      requires_authorization BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS price_list_items_unique_idx
      ON price_list_items (price_list_id, item_type, item_id)
  `);

  console.log("Creating hmo_charges table...");
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS hmo_charges (
      id SERIAL PRIMARY KEY,
      organisation_id INTEGER NOT NULL REFERENCES organisations(id),
      patient_id INTEGER NOT NULL REFERENCES patients(id),
      hmo_id INTEGER NOT NULL REFERENCES hmos(id),
      price_list_id INTEGER NOT NULL REFERENCES price_lists(id),
      item_type TEXT NOT NULL,
      item_id INTEGER NOT NULL,
      description TEXT,
      policy_number TEXT,
      tariff_price INTEGER NOT NULL,
      hmo_amount INTEGER NOT NULL,
      patient_amount INTEGER NOT NULL,
      requires_authorization BOOLEAN NOT NULL DEFAULT FALSE,
      authorization_code TEXT,
      status TEXT NOT NULL DEFAULT 'unclaimed',
      status_note TEXT,
      service_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS hmo_charges_item_idx
      ON hmo_charges (item_type, item_id)
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS hmo_charges_org_hmo_status_idx
      ON hmo_charges (organisation_id, hmo_id, status)
  `);

  console.log("HMO price lists migration complete.");
  process.exit(0);
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});

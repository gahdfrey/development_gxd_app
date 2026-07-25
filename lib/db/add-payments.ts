import "dotenv/config";
import { db } from "./index";
import { sql } from "drizzle-orm";

/**
 * Patient-initiated online payment migration:
 *  1. payments — a gateway transaction (may cover several items at once)
 *  2. payment_items — which requests/prescriptions a payment covers, with
 *     the price snapshotted at payment time
 */
async function migrate() {
  console.log("Creating payments table...");
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS payments (
      id SERIAL PRIMARY KEY,
      organisation_id INTEGER NOT NULL REFERENCES organisations(id),
      patient_id INTEGER NOT NULL REFERENCES patients(id),
      amount INTEGER NOT NULL,
      currency TEXT NOT NULL DEFAULT 'NGN',
      status TEXT NOT NULL DEFAULT 'pending',
      gateway_provider TEXT NOT NULL,
      gateway_reference TEXT NOT NULL UNIQUE,
      initiated_by TEXT NOT NULL DEFAULT 'patient',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS payments_patient_idx ON payments (patient_id)
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS payments_org_status_idx ON payments (organisation_id, status)
  `);

  console.log("Creating payment_items table...");
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS payment_items (
      id SERIAL PRIMARY KEY,
      payment_id INTEGER NOT NULL REFERENCES payments(id),
      item_type TEXT NOT NULL,
      item_id INTEGER NOT NULL,
      amount INTEGER NOT NULL
    )
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS payment_items_payment_idx ON payment_items (payment_id)
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS payment_items_item_idx ON payment_items (item_type, item_id)
  `);

  console.log("Migration completed successfully.");
  process.exit(0);
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});

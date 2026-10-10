import "dotenv/config";
import { db } from "./index";
import { sql } from "drizzle-orm";

/**
 * Release A — tax codes + HMO claim batches:
 *  1. lab_tests.tax_code / products.tax_code — VAT treatment per catalog
 *     item ("zero_rated" default: medical items are zero-rated under the
 *     Nigeria Tax Act 2025)
 *  2. claim_batches — monthly claims to an HMO
 *  3. hmo_charges.claim_batch_id / paid_amount / paid_at — claim lines and
 *     per-line remittance
 * Additive only; safe to re-run.
 */
async function migrate() {
  console.log("Adding tax_code to lab_tests and products...");
  await db.execute(sql`ALTER TABLE lab_tests ADD COLUMN IF NOT EXISTS tax_code TEXT NOT NULL DEFAULT 'zero_rated'`);
  await db.execute(sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS tax_code TEXT NOT NULL DEFAULT 'zero_rated'`);

  console.log("Creating claim_batches table...");
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS claim_batches (
      id SERIAL PRIMARY KEY,
      organisation_id INTEGER NOT NULL REFERENCES organisations(id),
      hmo_id INTEGER NOT NULL REFERENCES hmos(id),
      period_month TEXT NOT NULL,
      reference TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'draft',
      submitted_at TIMESTAMPTZ,
      submitted_by INTEGER REFERENCES users(id),
      submission_channel TEXT,
      hmo_reference TEXT,
      total_claimed INTEGER,
      notes TEXT,
      created_by INTEGER REFERENCES users(id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS claim_batches_org_reference_idx ON claim_batches (organisation_id, reference)
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS claim_batches_org_hmo_idx ON claim_batches (organisation_id, hmo_id, period_month)
  `);

  console.log("Adding claim line / remittance columns to hmo_charges...");
  await db.execute(sql`
    ALTER TABLE hmo_charges
      ADD COLUMN IF NOT EXISTS claim_batch_id INTEGER REFERENCES claim_batches(id),
      ADD COLUMN IF NOT EXISTS paid_amount INTEGER,
      ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS hmo_charges_claim_batch_idx ON hmo_charges (claim_batch_id)
  `);

  console.log("Claims + tax codes migration complete.");
  process.exit(0);
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});

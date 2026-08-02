import "dotenv/config";
import { db } from "./index";
import { sql } from "drizzle-orm";

/**
 * Brand-vs-generic medication tracking.
 *
 *  1. drug_generics        — active constituent + strength + form (RxNorm SCD
 *                             level), what clinicians actually prescribe.
 *  2. products             — gains genericId/manufacturer/nafdacRegNumber so
 *                             each brand SKU links back to its generic.
 *  3. prescriptions        — product_id becomes optional (a *preferred*
 *                             brand); gains generic_id (prescribing intent),
 *                             dispensed_product_id + batch_number (what
 *                             pharmacy actually handed out).
 *
 * Backfill: prescriptions that were already dispatched had exactly one brand
 * in play (product_id), so that's also what was dispensed.
 */
async function migrate() {
  console.log("Creating drug_generics table...");
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS drug_generics (
      id SERIAL PRIMARY KEY,
      organisation_id INTEGER NOT NULL REFERENCES organisations(id),
      name TEXT NOT NULL,
      strength TEXT NOT NULL,
      form TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      deleted_at TIMESTAMPTZ
    )
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS drug_generics_org_name_idx ON drug_generics (organisation_id, name)
  `);

  console.log("Adding brand columns to products...");
  await db.execute(sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS generic_id INTEGER REFERENCES drug_generics(id)`);
  await db.execute(sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS manufacturer TEXT`);
  await db.execute(sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS nafdac_reg_number TEXT`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS products_generic_idx ON products (generic_id)`);

  console.log("Updating prescriptions for generic/brand/dispensed tracking...");
  await db.execute(sql`ALTER TABLE prescriptions ALTER COLUMN product_id DROP NOT NULL`);
  await db.execute(sql`ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS generic_id INTEGER REFERENCES drug_generics(id)`);
  await db.execute(sql`ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS dispensed_product_id INTEGER REFERENCES products(id)`);
  await db.execute(sql`ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS batch_number TEXT`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS prescriptions_generic_idx ON prescriptions (generic_id)`);

  console.log("Backfilling dispensed_product_id for already-dispatched prescriptions...");
  await db.execute(sql`
    UPDATE prescriptions
    SET dispensed_product_id = product_id
    WHERE status = 'dispatched' AND dispensed_product_id IS NULL AND product_id IS NOT NULL
  `);

  console.log("Migration completed successfully.");
  process.exit(0);
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});

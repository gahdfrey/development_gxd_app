/**
 * Migration: create prescriptions table
 * Run: npx tsx lib/db/add-prescriptions.ts
 */
import { db } from "./index";
import { sql } from "drizzle-orm";

async function migrate() {
  console.log("Creating prescriptions table…");
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS prescriptions (
      id               SERIAL PRIMARY KEY,
      appointment_id   INTEGER REFERENCES appointments(id),
      patient_id       INTEGER NOT NULL REFERENCES patients(id),
      requested_by     INTEGER NOT NULL REFERENCES users(id),
      product_id       INTEGER NOT NULL REFERENCES products(id),
      dosage           TEXT NOT NULL,
      payment_status   TEXT NOT NULL DEFAULT 'not_paid',
      status           TEXT NOT NULL DEFAULT 'pending',
      cancellation_reason TEXT,
      created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  console.log("Done ✓");
  process.exit(0);
}

migrate().catch((err) => { console.error(err); process.exit(1); });

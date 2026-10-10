import "dotenv/config";
import { db } from "./index";
import { sql } from "drizzle-orm";

/**
 * Cashier shifts & end-of-day reconciliation:
 *  1. cashier_shifts — a cashier's till session with float, counted vs
 *     expected per channel, variance and supervisor sign-off
 *  2. payments.shift_id / channel / pos_reference — desk payments
 *     (method "desk") are tied to the shift they were taken in
 * Additive only; safe to re-run.
 */
async function migrate() {
  console.log("Creating cashier_shifts...");
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS cashier_shifts (
      id SERIAL PRIMARY KEY,
      organisation_id INTEGER NOT NULL REFERENCES organisations(id),
      user_id INTEGER NOT NULL REFERENCES users(id),
      status TEXT NOT NULL DEFAULT 'open',
      opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      opening_float INTEGER NOT NULL DEFAULT 0,
      closed_at TIMESTAMPTZ,
      expected_cash INTEGER,
      expected_pos INTEGER,
      expected_transfer INTEGER,
      counted_cash INTEGER,
      counted_pos INTEGER,
      counted_transfer INTEGER,
      variance INTEGER,
      close_note TEXT,
      reviewed_by INTEGER REFERENCES users(id),
      reviewed_at TIMESTAMPTZ,
      review_note TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS cashier_shifts_one_open_idx ON cashier_shifts (organisation_id, user_id)
      WHERE status = 'open'
  `);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS cashier_shifts_org_opened_idx ON cashier_shifts (organisation_id, opened_at)`);
  console.log("Adding desk payment columns...");
  await db.execute(sql`
    ALTER TABLE payments
      ADD COLUMN IF NOT EXISTS shift_id INTEGER REFERENCES cashier_shifts(id),
      ADD COLUMN IF NOT EXISTS channel TEXT,
      ADD COLUMN IF NOT EXISTS pos_reference TEXT
  `);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS payments_shift_idx ON payments (shift_id)`);
  console.log("Cashier shifts migration complete.");
  process.exit(0);
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});

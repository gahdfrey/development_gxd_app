import "dotenv/config";
import { db } from "./index";
import { sql } from "drizzle-orm";

/**
 * Patient SMS messaging:
 *  1. organisations.sms_enabled (default OFF) / sms_sender_id / sms_settings
 *  2. patients.messaging_opt_out / messaging_opt_out_at
 *  3. message_templates — per-hospital wording overrides
 *  4. outbound_messages — log of every message (sent / failed / skipped)
 * Additive only; safe to re-run.
 */
async function migrate() {
  console.log("Adding SMS settings to organisations...");
  await db.execute(sql`
    ALTER TABLE organisations
      ADD COLUMN IF NOT EXISTS sms_enabled BOOLEAN NOT NULL DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS sms_sender_id TEXT,
      ADD COLUMN IF NOT EXISTS sms_settings JSON
  `);
  console.log("Adding messaging opt-out to patients...");
  await db.execute(sql`
    ALTER TABLE patients
      ADD COLUMN IF NOT EXISTS messaging_opt_out BOOLEAN NOT NULL DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS messaging_opt_out_at TIMESTAMPTZ
  `);
  console.log("Creating message_templates...");
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS message_templates (
      id SERIAL PRIMARY KEY,
      organisation_id INTEGER NOT NULL REFERENCES organisations(id),
      kind TEXT NOT NULL,
      body TEXT NOT NULL,
      updated_by INTEGER REFERENCES users(id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await db.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS message_templates_org_kind_idx ON message_templates (organisation_id, kind)`);
  console.log("Creating outbound_messages...");
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS outbound_messages (
      id SERIAL PRIMARY KEY,
      organisation_id INTEGER NOT NULL REFERENCES organisations(id),
      patient_id INTEGER REFERENCES patients(id),
      kind TEXT NOT NULL,
      channel TEXT NOT NULL DEFAULT 'sms',
      to_phone TEXT,
      body TEXT NOT NULL,
      status TEXT NOT NULL,
      skip_reason TEXT,
      provider TEXT,
      provider_ref TEXT,
      error TEXT,
      dedupe_key TEXT,
      related_type TEXT,
      related_id INTEGER,
      sent_by INTEGER REFERENCES users(id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS outbound_messages_org_created_idx ON outbound_messages (organisation_id, created_at)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS outbound_messages_patient_idx ON outbound_messages (patient_id)`);
  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS outbound_messages_dedupe_idx ON outbound_messages (organisation_id, dedupe_key) WHERE dedupe_key IS NOT NULL
  `);
  console.log("Messaging migration complete.");
  process.exit(0);
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});

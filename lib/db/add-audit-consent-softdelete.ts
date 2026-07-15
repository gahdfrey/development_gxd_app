import "dotenv/config";
import { db } from "./index";
import { sql } from "drizzle-orm";

/**
 * Section-D compliance migration (NDPA 2023 / NDHA privacy-by-design):
 *  1. audit_logs        — append-only audit trail of mutations and auth events
 *  2. patient_consents  — consent records with purpose, scope, expiry, withdrawal
 *  3. deleted_at        — soft-delete columns replacing hard deletes
 */
async function migrate() {
  console.log("Creating audit_logs table...");
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id SERIAL PRIMARY KEY,
      organisation_id INTEGER,
      user_id INTEGER,
      user_email TEXT,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT,
      details JSON,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS audit_logs_org_created_idx
      ON audit_logs (organisation_id, created_at)
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS audit_logs_entity_idx
      ON audit_logs (entity_type, entity_id)
  `);

  console.log("Creating patient_consents table...");
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS patient_consents (
      id SERIAL PRIMARY KEY,
      organisation_id INTEGER NOT NULL REFERENCES organisations(id),
      patient_id INTEGER NOT NULL REFERENCES patients(id),
      purpose TEXT NOT NULL,
      information_types JSON,
      status TEXT NOT NULL DEFAULT 'granted',
      granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      expires_at TIMESTAMPTZ,
      withdrawn_at TIMESTAMPTZ,
      recorded_by INTEGER REFERENCES users(id),
      notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS patient_consents_patient_idx
      ON patient_consents (patient_id)
  `);

  console.log("Adding deleted_at soft-delete columns...");
  const tables = [
    "users",
    "roles",
    "departments",
    "hmos",
    "lab_tests",
    "products",
    "inventory_items",
  ];
  for (const table of tables) {
    await db.execute(
      sql.raw(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ`),
    );
    console.log(`  ✓ ${table}.deleted_at`);
  }

  console.log("Migration completed successfully.");
  process.exit(0);
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});

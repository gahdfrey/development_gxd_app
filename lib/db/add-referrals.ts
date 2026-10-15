import "dotenv/config";
import { db } from "./index";
import { roles } from "./schema";
import { eq, sql } from "drizzle-orm";

/**
 * Referral module:
 *  1. referrers — people/facilities who refer patients in (Setup → Referrers),
 *     each with a unique code ("REF-00012") and bank + WhatsApp details
 *  2. lab_tests.ref_discount_type / ref_discount_value — what a referrer earns
 *     per referred test (₦ amount or % of the price)
 *  3. patients.referrer_id — who referred the patient
 *  4. patient_referrals — each referred test with its price and discount
 *     snapshotted at registration (drives the amount owed to a referrer)
 *  5. the "referral" role permission, backfilled onto existing roles:
 *     roles that can view Finance or Setup get view/print; everyone else gets
 *     the key unticked so it shows in the roles matrix. Roles that already
 *     have the key are left alone.
 * Additive only; safe to re-run.
 */

const MODULE_KEY = "referral";
const GRANT_FROM_MODULES = ["finance", "setup"];

/** Matches permissionGranted() in lib/authz.ts — handles array and object shapes. */
function hasView(permissions: Record<string, unknown>, module: string): boolean {
  const entry = permissions[module];
  if (Array.isArray(entry)) return entry.includes("view");
  if (entry && typeof entry === "object") return (entry as Record<string, unknown>).view === true;
  return false;
}

async function migrate() {
  console.log("Creating referrers...");
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS referrers (
      id SERIAL PRIMARY KEY,
      organisation_id INTEGER NOT NULL REFERENCES organisations(id),
      code TEXT,
      name TEXT NOT NULL,
      account_name TEXT NOT NULL,
      account_number TEXT NOT NULL,
      bank TEXT NOT NULL,
      whatsapp_number TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      deleted_at TIMESTAMPTZ
    )
  `);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS referrers_org_idx ON referrers (organisation_id)`);
  await db.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS referrers_code_idx ON referrers (code)`);

  console.log("Adding referral discount columns to lab_tests...");
  await db.execute(sql`ALTER TABLE lab_tests ADD COLUMN IF NOT EXISTS ref_discount_type TEXT`);
  await db.execute(sql`ALTER TABLE lab_tests ADD COLUMN IF NOT EXISTS ref_discount_value REAL`);

  console.log("Adding referrer_id to patients...");
  await db.execute(sql`ALTER TABLE patients ADD COLUMN IF NOT EXISTS referrer_id INTEGER REFERENCES referrers(id)`);

  console.log("Creating patient_referrals...");
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS patient_referrals (
      id SERIAL PRIMARY KEY,
      organisation_id INTEGER NOT NULL REFERENCES organisations(id),
      patient_id INTEGER NOT NULL REFERENCES patients(id),
      referrer_id INTEGER NOT NULL REFERENCES referrers(id),
      test_id INTEGER NOT NULL REFERENCES lab_tests(id),
      department_id INTEGER NOT NULL REFERENCES departments(id),
      request_id INTEGER REFERENCES requests(id),
      test_name TEXT NOT NULL,
      amount INTEGER NOT NULL,
      discount_type TEXT,
      discount_value REAL,
      discount_amount INTEGER NOT NULL DEFAULT 0,
      created_by INTEGER REFERENCES users(id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      deleted_at TIMESTAMPTZ
    )
  `);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS patient_referrals_referrer_idx ON patient_referrals (referrer_id)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS patient_referrals_patient_idx ON patient_referrals (patient_id)`);

  console.log("Backfilling the referral permission onto roles...");
  const allRoles = await db
    .select({ id: roles.id, name: roles.name, organisationId: roles.organisationId, permissions: roles.permissions })
    .from(roles);
  let granted = 0;
  let added = 0;
  let skipped = 0;
  for (const role of allRoles) {
    const permissions = (role.permissions ?? {}) as Record<string, unknown>;
    if (MODULE_KEY in permissions) {
      skipped++;
      continue;
    }
    const grant = GRANT_FROM_MODULES.some((m) => hasView(permissions, m));
    // Match the shape the rest of the role already uses.
    const usesArrayShape = Object.values(permissions).some((v) => Array.isArray(v));
    const value = usesArrayShape
      ? grant ? ["view", "print"] : []
      : { view: grant, add: false, edit: false, delete: false, print: grant };
    await db
      .update(roles)
      .set({ permissions: { ...permissions, [MODULE_KEY]: value }, updatedAt: new Date() })
      .where(eq(roles.id, role.id));
    if (grant) granted++;
    else added++;
    console.log(`  ${grant ? "granted" : "added (off)"}: role #${role.id} "${role.name}" (org ${role.organisationId})`);
  }
  console.log(`\nDone. ${granted} role(s) granted referral, ${added} added unticked, ${skipped} already had the key.`);
  process.exit(0);
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});

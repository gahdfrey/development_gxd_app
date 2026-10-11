import "dotenv/config";
import { db } from "./index";
import { roles } from "./schema";
import { eq, sql } from "drizzle-orm";

/**
 * Vaccination module:
 *  1. vaccines — the hospital's vaccine list, priced per dose (Setup → Vaccines)
 *  2. vaccination_courses — a patient on a vaccine, with the period they come
 *     back in (dose count + interval)
 *  3. vaccination_doses — each due visit, linked to its bill line
 *     (patient_charges, source_type "vaccine")
 *  4. the "vaccination" role permission, backfilled onto existing roles:
 *     roles that already work with patients clinically (view on dashboard,
 *     appointments, my-appointments, all-appointments or admission) get
 *     view/add/edit/print; everyone else gets the key unticked so it shows in
 *     the roles matrix. Roles that already have the key are left alone.
 * Additive only; safe to re-run.
 */

const MODULE_KEY = "vaccination";
const CLINICAL_MODULES = ["dashboard", "appointments", "my-appointments", "all-appointments", "admission"];

/** Matches permissionGranted() in lib/authz.ts — handles array and object shapes. */
function hasView(permissions: Record<string, unknown>, module: string): boolean {
  const entry = permissions[module];
  if (Array.isArray(entry)) return entry.includes("view");
  if (entry && typeof entry === "object") return (entry as Record<string, unknown>).view === true;
  return false;
}

async function migrate() {
  console.log("Creating vaccines...");
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS vaccines (
      id SERIAL PRIMARY KEY,
      organisation_id INTEGER NOT NULL REFERENCES organisations(id),
      name TEXT NOT NULL,
      description TEXT,
      dose_count INTEGER NOT NULL DEFAULT 1,
      interval_value INTEGER NOT NULL DEFAULT 0,
      interval_unit TEXT NOT NULL DEFAULT 'month',
      price INTEGER NOT NULL,
      tax_code TEXT NOT NULL DEFAULT 'zero_rated',
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      deleted_at TIMESTAMPTZ
    )
  `);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS vaccines_org_idx ON vaccines (organisation_id)`);

  console.log("Creating vaccination_courses...");
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS vaccination_courses (
      id SERIAL PRIMARY KEY,
      organisation_id INTEGER NOT NULL REFERENCES organisations(id),
      patient_id INTEGER NOT NULL REFERENCES patients(id),
      vaccine_id INTEGER NOT NULL REFERENCES vaccines(id),
      start_date TEXT NOT NULL,
      dose_count INTEGER NOT NULL,
      interval_value INTEGER NOT NULL,
      interval_unit TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      notes TEXT,
      created_by INTEGER REFERENCES users(id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS vaccination_courses_patient_idx ON vaccination_courses (patient_id)`);

  console.log("Creating vaccination_doses...");
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS vaccination_doses (
      id SERIAL PRIMARY KEY,
      organisation_id INTEGER NOT NULL REFERENCES organisations(id),
      course_id INTEGER NOT NULL REFERENCES vaccination_courses(id),
      patient_id INTEGER NOT NULL REFERENCES patients(id),
      dose_number INTEGER NOT NULL,
      scheduled_date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'scheduled',
      charge_id INTEGER REFERENCES patient_charges(id),
      given_at TIMESTAMPTZ,
      given_by INTEGER REFERENCES users(id),
      batch_number TEXT,
      site TEXT,
      notes TEXT,
      cancel_reason TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS vaccination_doses_course_idx ON vaccination_doses (course_id)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS vaccination_doses_patient_idx ON vaccination_doses (patient_id)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS vaccination_doses_org_date_idx ON vaccination_doses (organisation_id, scheduled_date)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS vaccination_doses_charge_idx ON vaccination_doses (charge_id)`);

  console.log("Backfilling the vaccination permission onto roles...");
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
    const isClinical = CLINICAL_MODULES.some((m) => hasView(permissions, m));
    // Match the shape the rest of the role already uses.
    const usesArrayShape = Object.values(permissions).some((v) => Array.isArray(v));
    const value = usesArrayShape
      ? isClinical ? ["view", "add", "edit", "print"] : []
      : { view: isClinical, add: isClinical, edit: isClinical, delete: false, print: isClinical };
    await db
      .update(roles)
      .set({ permissions: { ...permissions, [MODULE_KEY]: value }, updatedAt: new Date() })
      .where(eq(roles.id, role.id));
    if (isClinical) granted++;
    else added++;
    console.log(`  ${isClinical ? "granted" : "added (off)"}: role #${role.id} "${role.name}" (org ${role.organisationId})`);
  }
  console.log(`\nDone. ${granted} role(s) granted vaccination, ${added} added unticked, ${skipped} already had the key.`);
  process.exit(0);
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});

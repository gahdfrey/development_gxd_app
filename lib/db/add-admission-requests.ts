import "dotenv/config";
import { db } from "./index";
import { roles } from "./schema";
import { eq, sql } from "drizzle-orm";

/**
 * Doctor-initiated admission requests.
 *
 * A doctor finishing a consultation can now request that a patient be
 * admitted, alongside raising tests and writing prescriptions. The request
 * lands in the Admission module's queue with the case severity and the
 * doctor's notes; the admission desk then assigns a ward/bed (or declines it).
 *
 * Schema effects on `admissions`:
 *  - ward_id / bed_id / admitted_at become nullable — a requested admission
 *    has no bed and no admission time until the desk acts on it.
 *  - severity: how urgent the case is (routine | high | urgent | critical).
 *  - requested_by / requested_at: who raised the request and when.
 *  - decline_reason / declined_by / declined_at: set when the desk turns a
 *    request down (status "declined").
 *
 * Permissions: doctors raise requests through the existing Admission module,
 * so roles that consult (view on my-appointments) are given admission
 * view + add if they have no admission permissions yet.
 */

/** Matches permissionGranted() in lib/authz.ts — handles array and object shapes. */
function hasAction(permissions: Record<string, unknown>, module: string, action: string): boolean {
  const entry = permissions[module];
  if (Array.isArray(entry)) return entry.includes(action);
  if (entry && typeof entry === "object") {
    return (entry as Record<string, unknown>)[action] === true;
  }
  return false;
}

const hasView = (permissions: Record<string, unknown>, module: string) =>
  hasAction(permissions, module, "view");

async function migrate() {
  console.log("Relaxing ward/bed/admitted_at to allow un-allocated requests...");
  await db.execute(sql`ALTER TABLE admissions ALTER COLUMN ward_id DROP NOT NULL`);
  await db.execute(sql`ALTER TABLE admissions ALTER COLUMN bed_id DROP NOT NULL`);
  await db.execute(sql`ALTER TABLE admissions ALTER COLUMN admitted_at DROP NOT NULL`);
  await db.execute(sql`ALTER TABLE admissions ALTER COLUMN admitted_at DROP DEFAULT`);

  console.log("Adding request columns...");
  await db.execute(sql`ALTER TABLE admissions ADD COLUMN IF NOT EXISTS severity TEXT NOT NULL DEFAULT 'routine'`);
  await db.execute(sql`ALTER TABLE admissions ADD COLUMN IF NOT EXISTS requested_by INTEGER REFERENCES users(id)`);
  await db.execute(sql`ALTER TABLE admissions ADD COLUMN IF NOT EXISTS requested_at TIMESTAMPTZ`);
  await db.execute(sql`ALTER TABLE admissions ADD COLUMN IF NOT EXISTS decline_reason TEXT`);
  await db.execute(sql`ALTER TABLE admissions ADD COLUMN IF NOT EXISTS declined_by INTEGER REFERENCES users(id)`);
  await db.execute(sql`ALTER TABLE admissions ADD COLUMN IF NOT EXISTS declined_at TIMESTAMPTZ`);

  // The queue view is "requests for this org, most urgent first", so keep the
  // existing (organisation_id, status) index company with a requested_at one.
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS admissions_org_status_requested_idx
      ON admissions (organisation_id, status, requested_at)
  `);

  console.log("Granting Admission access to consulting roles...");
  const allRoles = await db
    .select({
      id: roles.id,
      name: roles.name,
      organisationId: roles.organisationId,
      permissions: roles.permissions,
    })
    .from(roles);

  let updated = 0;
  for (const role of allRoles) {
    const permissions = (role.permissions ?? {}) as Record<string, unknown>;

    // Only roles that actually consult — raising a request is part of closing
    // out an appointment.
    if (!hasView(permissions, "my-appointments")) continue;
    // Already able to raise requests; leave it exactly as the administrator set it.
    if (hasAction(permissions, "admission", "add")) continue;

    const usesArrayShape = Object.values(permissions).some((v) => Array.isArray(v));
    const existing = permissions.admission;
    let value: unknown;
    if (usesArrayShape) {
      const current = Array.isArray(existing) ? existing : [];
      value = Array.from(new Set([...current, "view", "add"]));
    } else {
      // Keep any edit/delete/print the role already had; only turn on the two
      // actions the request flow needs.
      const current = (existing && typeof existing === "object" ? existing : {}) as Record<string, unknown>;
      value = { edit: false, delete: false, print: false, ...current, view: true, add: true };
    }

    await db
      .update(roles)
      .set({ permissions: { ...permissions, admission: value }, updatedAt: new Date() })
      .where(eq(roles.id, role.id));

    updated++;
    console.log(`  granted admission view+add: role #${role.id} "${role.name}" (org ${role.organisationId})`);
  }

  console.log(`\nMigration completed successfully. ${updated} role(s) updated.`);
  process.exit(0);
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});

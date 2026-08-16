import "dotenv/config";
import { db } from "./index";
import { roles } from "./schema";
import { eq } from "drizzle-orm";

/**
 * Backfills the new "patient-history" module permission onto existing roles.
 *
 * The patient clinical record page (/patients/:id/history) used to be guarded
 * by the Patients ("dashboard") module, so roles without Patients view — most
 * notably Doctor, which reaches the page from My Appointments — hit "Access
 * Denied". The page now has its own module so it can be ticked per role, but
 * roles created before this change have no such key in their permissions JSON
 * and would still be denied. This script adds it.
 *
 * Grant rule: any role that can already see patients clinically — view on
 * dashboard, appointments, my-appointments, all-appointments, or admission —
 * gets view + print. Everyone else (patients, lab, radiology, finance,
 * pharmacy, inventory) gets the key with everything off, so it shows up in the
 * roles matrix unticked and an admin can enable it deliberately.
 *
 * Idempotent: roles that already carry a "patient-history" key are left alone.
 */

const MODULE_KEY = "patient-history";

// Holding view on any of these means the role already works with patients
// clinically, so it keeps the access it had before the module was split out.
const CLINICAL_MODULES = [
  "dashboard",
  "appointments",
  "my-appointments",
  "all-appointments",
  "admission",
];

/** Matches permissionGranted() in lib/authz.ts — handles array and object shapes. */
function hasView(permissions: Record<string, unknown>, module: string): boolean {
  const entry = permissions[module];
  if (Array.isArray(entry)) return entry.includes("view");
  if (entry && typeof entry === "object") {
    return (entry as Record<string, unknown>).view === true;
  }
  return false;
}

async function migrate() {
  const allRoles = await db
    .select({
      id: roles.id,
      name: roles.name,
      organisationId: roles.organisationId,
      permissions: roles.permissions,
    })
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

    // Match the shape the rest of the role already uses so the Roles UI and
    // permissionGranted() both read it the same way.
    const usesArrayShape = Object.values(permissions).some((v) => Array.isArray(v));
    const value = usesArrayShape
      ? isClinical
        ? ["view", "print"]
        : []
      : {
          view: isClinical,
          add: false,
          edit: false,
          delete: false,
          print: isClinical,
        };

    await db
      .update(roles)
      .set({
        permissions: { ...permissions, [MODULE_KEY]: value },
        updatedAt: new Date(),
      })
      .where(eq(roles.id, role.id));

    if (isClinical) granted++;
    else added++;

    console.log(
      `  ${isClinical ? "granted" : "added (off)"}: role #${role.id} "${role.name}" (org ${role.organisationId})`,
    );
  }

  console.log(
    `\nDone. ${granted} role(s) granted patient-history view, ${added} added unticked, ${skipped} already had the key.`,
  );
  process.exit(0);
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});

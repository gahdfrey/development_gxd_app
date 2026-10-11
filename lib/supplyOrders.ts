/**
 * Who sees which supply orders (safe on client and server).
 *
 * Roles holding Supply Orders view (the supply team: inventory managers,
 * superadmins…) see every department's orders and can filter by department.
 * Everyone else sees only their own department's orders — enforced in
 * GET /api/inventory/orders; the UI uses the same rule to decide what to show.
 * Tick or untick "Supply Orders → View" on a role in Roles to change it.
 */
export const ALL_DEPARTMENTS_PERMISSION: [module: string, action: string] = ["supply-orders", "view"];

/** Same shape handling as permissionGranted() in lib/authz.ts. */
export function canViewAllDepartmentOrders(permissions: Record<string, unknown> | null | undefined): boolean {
  const [module, action] = ALL_DEPARTMENTS_PERMISSION;
  const entry = permissions?.[module];
  if (Array.isArray(entry)) return entry.includes(action);
  if (entry && typeof entry === "object") return (entry as Record<string, unknown>)[action] === true;
  return false;
}

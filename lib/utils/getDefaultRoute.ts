/**
 * Determines the default route for a user based on their permissions.
 * Checks permissions in priority order and returns the first accessible route.
 *
 * @param permissions - User's permission object from the API
 * @returns The first accessible route path
 */
export function getDefaultRoute(permissions: any): string {
  // If no permissions object, default to dashboard
  if (!permissions || typeof permissions !== "object") {
    return "/dashboard";
  }

  // Priority order of routes to check.
  // Dashboard is first so superadmin (all permissions) always lands there.
  // Specialised modules follow so role-specific users land on their own section.
  const routes = [
    { path: "/dashboard", module: "analytics" },
    { path: "/patients", module: "dashboard" },
    { path: "/my-appointments", module: "my-appointments" },
    { path: "/my-history", module: "my-history" },
    { path: "/appointments", module: "appointments" },
    { path: "/laboratory", module: "laboratory" },
    { path: "/radiology", module: "radiography" },
    { path: "/finance", module: "finance" },
    { path: "/pharmacy", module: "pharmacy" },
    { path: "/product-inventory", module: "products" },
    { path: "/users", module: "users" },
    { path: "/roles", module: "roles" },
  ];

  // Find first route user has view permission for
  for (const route of routes) {
    const modulePermissions = permissions[route.module];

    // Check if user has view permission for this module
    if (modulePermissions?.view === true) {
      return route.path;
    }
  }

  // Fallback to dashboard if no permissions found
  return "/dashboard";
}

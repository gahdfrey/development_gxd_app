export const APP_MODULES = [
  { key: "dashboard", label: "Dashboard" },
  { key: "appointments", label: "Appointments" },
  { key: "my-appointments", label: "My Appointments" },
  { key: "all-appointments", label: "All Appointments" },
  { key: "users", label: "Users" },
  { key: "roles", label: "Roles" },
  { key: "setup", label: "Setup" },
  { key: "finance", label: "Finance" },
  { key: "laboratory", label: "Laboratory" },
  { key: "radiography", label: "Radiography" },
];

export const APP_PERMISSIONS = [
  { key: "view", label: "View" },
  { key: "add", label: "Add" },
  { key: "edit", label: "Edit" },
  { key: "delete", label: "Delete" },
  { key: "print", label: "Print" },
];

// Helper to get default permissions (view: true, others: false)
export const getDefaultPermissions = () => {
  const permissions: Record<string, Record<string, boolean>> = {};

  APP_MODULES.forEach((module) => {
    permissions[module.key] = {};
    APP_PERMISSIONS.forEach((perm) => {
      permissions[module.key][perm.key] = perm.key === "view";
    });
  });

  return permissions;
};

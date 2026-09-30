export const APP_MODULES = [
  { key: "dashboard", label: "Patients" },
  { key: "patient-history", label: "Patient History" },
  { key: "analytics", label: "Analytics" },
  { key: "appointments", label: "Appointments" },
  { key: "my-appointments", label: "My Appointments" },
  { key: "all-appointments", label: "All Appointments" },
  { key: "admission", label: "Admission" },
  { key: "users", label: "Users" },
  { key: "data-requests", label: "Data Requests" },
  { key: "roles", label: "Roles" },
  { key: "setup", label: "Setup" },
  { key: "finance", label: "Finance" },
  { key: "laboratory", label: "Laboratory" },
  { key: "radiography", label: "Radiography" },
  { key: "my-history", label: "My History" },
  { key: "supply-orders", label: "Supply Orders" },
  { key: "products", label: "Products" },
  { key: "orders", label: "Orders" },
  { key: "pharmacy", label: "Pharmacy" },
  { key: "billing", label: "Billing Plans" },
];

// How urgently the patient needs a bed, picked by the requesting doctor and
// used to triage the admission queue. Order is least → most urgent; `rank`
// drives the sort so the most urgent requests surface first.
export const ADMISSION_SEVERITIES = [
  { key: "routine", label: "Routine", rank: 0 },
  { key: "high", label: "High", rank: 1 },
  { key: "urgent", label: "Urgent", rank: 2 },
  { key: "critical", label: "Critical", rank: 3 },
] as const;

export const ADMISSION_SEVERITY_KEYS = ADMISSION_SEVERITIES.map((s) => s.key);

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

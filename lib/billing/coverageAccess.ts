import type { PermissionCheck } from "@/lib/authz";

// Front desk (Patients module, key "dashboard") and Finance both manage
// enrollee records; clinicians who can open a patient's record can view them.
export const COVERAGE_VIEW: PermissionCheck[] = [
  ["dashboard", "view"],
  ["patients", "view"],
  ["finance", "view"],
  ["patient-history", "view"],
];
export const COVERAGE_EDIT: PermissionCheck[] = [
  ["dashboard", "edit"],
  ["patients", "edit"],
  ["finance", "edit"],
];
// Logging an eligibility check is routine desk work at registration or billing.
export const ELIGIBILITY_LOG: PermissionCheck[] = [
  ["dashboard", "edit"],
  ["dashboard", "add"],
  ["patients", "edit"],
  ["finance", "edit"],
  ["finance", "add"],
];

import type { PermissionCheck } from "@/lib/authz";

// Anyone who can open a patient's record (front desk, clinicians, nurses,
// pharmacy, admissions) can see allergies / conditions / weight — they are
// safety information.
export const CLINICAL_VIEW: PermissionCheck[] = [
  ["patients", "view"],
  ["dashboard", "view"],
  ["patient-history", "view"],
  ["my-appointments", "view"],
  ["appointments", "view"],
  ["admission", "view"],
  ["pharmacy", "view"],
];

// Recording them is clinical/registration work.
export const CLINICAL_EDIT: PermissionCheck[] = [
  ["patients", "edit"],
  ["dashboard", "edit"],
  ["patient-history", "edit"],
  ["my-appointments", "add"],
  ["my-appointments", "edit"],
  ["appointments", "edit"],
  ["admission", "edit"],
  ["pharmacy", "edit"],
];

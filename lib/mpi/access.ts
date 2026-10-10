import type { PermissionCheck } from "@/lib/authz";

// Records management: seeing and merging duplicate patient records.
export const MPI_VIEW: PermissionCheck[] = [["dashboard", "view"], ["patients", "view"]];
// Merging moves a person's whole history — restricted to staff who may
// delete patient records (records officers / admins).
export const MPI_MERGE: PermissionCheck[] = [["dashboard", "delete"], ["patients", "delete"]];
export const MPI_EDIT: PermissionCheck[] = [["dashboard", "edit"], ["patients", "edit"]];

export const IDENTIFIER_SYSTEMS = ["legacy_mrn", "birth_certificate", "passport", "nhia", "insurance", "voters_card", "drivers_licence", "other"];

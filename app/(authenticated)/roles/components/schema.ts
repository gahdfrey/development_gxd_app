export type ModulePermissions = Record<string, boolean>;
export type Permissions = Record<string, ModulePermissions>;

export interface RoleFormData {
  name: string;
  description: string | null;
  permissions: Permissions;
}

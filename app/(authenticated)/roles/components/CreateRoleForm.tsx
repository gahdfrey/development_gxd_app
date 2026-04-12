"use client";

import { useForm } from "react-hook-form";
import {
  APP_MODULES,
  APP_PERMISSIONS,
  getDefaultPermissions,
} from "@/lib/constants";
import ModulePermissionMatrix from "../../users/components/ModulePermissionMatrix";
import { RoleFormData } from "./schema";

interface CreateRoleFormProps {
  onSubmit: (data: RoleFormData) => Promise<void>;
  onCancel: () => void;
}

export default function CreateRoleForm({
  onSubmit,
  onCancel,
}: CreateRoleFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RoleFormData>({
    defaultValues: {
      name: "",
      description: "",
      permissions: getDefaultPermissions(),
    },
  });

  const permissions = watch("permissions");

  const onFormSubmit = async (data: RoleFormData) => {
    await onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Role Name
        </label>
        <input
          type="text"
          {...register("name", { required: "Role name is required" })}
          className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${
            errors.name ? "border-red-500" : "border-gray-300"
          }`}
        />
        {errors.name && (
          <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Description
        </label>
        <textarea
          {...register("description")}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      <ModulePermissionMatrix
        permissions={permissions}
        onChange={(newPermissions) => setValue("permissions", newPermissions)}
      />

      <div className="flex justify-end gap-3 pt-4 border-t">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {isSubmitting ? "Creating..." : "Create Role"}
        </button>
      </div>
    </form>
  );
}

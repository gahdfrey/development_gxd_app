"use client";

import { useState, useEffect } from "react";

import {
  APP_MODULES,
  APP_PERMISSIONS,
  getDefaultPermissions,
} from "@/lib/constants";

// Default permissions structure with View enabled for all modules
const DEFAULT_PERMISSIONS = getDefaultPermissions();

interface ModulePermissions {
  [module: string]: {
    [permission: string]: boolean;
  };
}

interface ModulePermissionMatrixProps {
  permissions: ModulePermissions;
  onChange: (permissions: ModulePermissions) => void;
}

export default function ModulePermissionMatrix({
  permissions,
  onChange,
}: ModulePermissionMatrixProps) {
  const [localPermissions, setLocalPermissions] = useState<ModulePermissions>(
    permissions || {}
  );

  // Update local state when permissions prop changes
  useEffect(() => {
    if (permissions && Object.keys(permissions).length > 0) {
      // Merge incoming permissions with defaults to ensure all modules are present
      const mergedPermissions = { ...DEFAULT_PERMISSIONS };
      Object.keys(permissions).forEach((moduleKey) => {
        if (mergedPermissions[moduleKey]) {
          mergedPermissions[moduleKey] = {
            ...mergedPermissions[moduleKey],
            ...permissions[moduleKey],
          };
        }
      });
      setLocalPermissions(mergedPermissions);
    } else if (Object.keys(localPermissions).length === 0) {
      // No permissions provided and local is empty - use defaults
      setLocalPermissions(DEFAULT_PERMISSIONS);
      onChange(DEFAULT_PERMISSIONS);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [permissions]); // onChange intentionally omitted to prevent stale closures

  const handleCheckboxChange = (module: string, permission: string) => {
    const updatedPermissions = {
      ...localPermissions,
      [module]: {
        ...localPermissions[module],
        [permission]: !localPermissions[module]?.[permission],
      },
    };
    setLocalPermissions(updatedPermissions);
    onChange(updatedPermissions);
  };

  return (
    <div className="mt-6">
      <label className="block text-sm font-semibold text-gray-700 mb-3">
        Module Permissions
      </label>
      <div className="border border-gray-300 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Module
                </th>
                {APP_PERMISSIONS.map((perm) => (
                  <th
                    key={perm.key}
                    className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider"
                  >
                    {perm.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {APP_MODULES.map((module) => (
                <tr
                  key={module.key}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {module.label}
                  </td>
                  {APP_PERMISSIONS.map((perm) => (
                    <td
                      key={perm.key}
                      className="px-6 py-4 whitespace-nowrap text-center"
                    >
                      <input
                        type="checkbox"
                        checked={
                          localPermissions[module.key]?.[perm.key] || false
                        }
                        onChange={() =>
                          handleCheckboxChange(module.key, perm.key)
                        }
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <p className="mt-2 text-xs text-gray-500">
        By default, all modules have "View" permission enabled. Uncheck to
        restrict access.
      </p>
    </div>
  );
}

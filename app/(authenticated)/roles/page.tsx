"use client";

import { useState, useMemo } from "react";
import { createColumnHelper } from "@tanstack/react-table";
import useSWR, { mutate } from "swr";
import { fetcher } from "@/lib/fetcher";
import Table from "@/app/components/ui/Table";
import Modal from "@/app/components/ui/Modal";
import CreateRoleForm from "./components/CreateRoleForm";
import EditRoleForm from "./components/EditRoleForm";
import {
  PencilSquareIcon,
  TrashIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";
import { useToast } from "@/app/contexts/ToastContext";
import { Role } from "@/lib/db/schema";

export default function RolesPage() {
  const {
    data: roles = [],
    error,
    isLoading,
  } = useSWR<Role[]>("/api/roles", fetcher);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const { showToast } = useToast();

  const handleCreateRole = async (data: any) => {
    const response = await fetch("/api/roles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      showToast(error.error || "Failed to create role", "error");
      throw new Error(error.error || "Failed to create role");
    }

    mutate("/api/roles");
    setIsCreateModalOpen(false);
    showToast("Role created successfully", "success");
  };

  const handleUpdateRole = async (data: any) => {
    if (!selectedRole) return;

    const response = await fetch(`/api/roles/${selectedRole.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      showToast(error.error || "Failed to update role", "error");
      throw new Error(error.error || "Failed to update role");
    }

    // Refresh everything
    await mutate("/api/roles");
    await mutate(`/api/roles/${selectedRole.id}`); // Invalidate specific role cache
    await mutate("/api/wai"); // Refresh session/sidebar permissions

    setIsEditModalOpen(false);
    setSelectedRole(null);
    showToast("Role updated successfully", "success");
  };

  const handleDeleteRole = async () => {
    if (!selectedRole) return;

    const response = await fetch(`/api/roles/${selectedRole.id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const error = await response.json();
      showToast(error.error || "Failed to delete role", "error");
      return;
    }

    mutate("/api/roles");
    setIsDeleteModalOpen(false);
    setSelectedRole(null);
    showToast("Role deleted successfully", "success");
  };

  const columnHelper = createColumnHelper<Role>();

  const columns = useMemo(
    () => [
      columnHelper.accessor("name", {
        header: "Role Name",
        cell: (info) => info.getValue(),
      }),
      columnHelper.accessor("description", {
        header: "Description",
        cell: (info) => info.getValue() || "N/A",
      }),
      columnHelper.accessor("createdAt", {
        header: "Created Date",
        cell: (info) => {
          const date = info.getValue();
          return date ? new Date(date).toLocaleDateString() : "N/A";
        },
      }),
      columnHelper.display({
        id: "actions",
        header: "Actions",
        cell: (props) => (
          <div className="flex gap-2">
            <button
              onClick={() => {
                setSelectedRole(props.row.original);
                setIsEditModalOpen(true);
              }}
              className="p-1 text-yellow-600 hover:text-yellow-800 transition-colors"
              title="Edit Permissions"
            >
              <PencilSquareIcon className="w-5 h-5" />
            </button>
            <button
              onClick={() => {
                setSelectedRole(props.row.original);
                setIsDeleteModalOpen(true);
              }}
              className="p-1 text-red-600 hover:text-red-800 transition-colors"
              title="Delete Role"
            >
              <TrashIcon className="w-5 h-5" />
            </button>
          </div>
        ),
      }),
    ],
    []
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Roles</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage users roles and permissions
          </p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
        >
          <PlusIcon className="w-5 h-5" />
          Create Role
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <Table data={roles} columns={columns} />
      )}

      {/* Create Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create New Role"
      >
        <CreateRoleForm
          onSubmit={handleCreateRole}
          onCancel={() => setIsCreateModalOpen(false)}
        />
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedRole(null);
        }}
        title="Edit Role & Permissions"
      >
        {selectedRole && (
          <EditRoleForm
            roleId={selectedRole.id}
            initialData={selectedRole}
            onSubmit={handleUpdateRole}
            onCancel={() => {
              setIsEditModalOpen(false);
              setSelectedRole(null);
            }}
          />
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSelectedRole(null);
        }}
        title="Delete Role"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Are you sure you want to delete role{" "}
            <strong>{selectedRole?.name}</strong>? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => {
                setIsDeleteModalOpen(false);
                setSelectedRole(null);
              }}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteRole}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              Delete
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

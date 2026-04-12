"use client";

import { useState, useEffect, useMemo } from "react";
import { createColumnHelper } from "@tanstack/react-table";
import { User } from "@/lib/db/schema";
import { UserFormData } from "./components/schema";
import Table from "@/app/components/ui/Table";
import CreateUserModal from "./components/CreateUserModal";
import EditUserModal from "./components/EditUserModal";
import ViewUserModal from "./components/ViewUserModal";
import DeleteUserModal from "./components/DeleteUserModal";
import {
  PencilSquareIcon,
  TrashIcon,
  EyeIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";
import { useToast } from "@/app/contexts/ToastContext";
import PermissionDenied from "@/app/components/ui/PermissionDenied";
import useSWR, { mutate } from "swr";
import { fetcher } from "@/lib/fetcher";

type UserWithRole = User & { roleName: string | null };

export default function UsersPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithRole | null>(null);

  const { showToast } = useToast();

  const {
    data: users = [],
    error,
    isLoading,
  } = useSWR<UserWithRole[]>(
    `/api/users${debouncedSearch ? `?search=${encodeURIComponent(debouncedSearch)}` : ""}`,
    fetcher,
  );

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleCreateUser = async (data: UserFormData) => {
    const response = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const err = await response.json();
      showToast(err.error || "Failed to create user", "error");
      throw new Error(err.error || "Failed to create user");
    }

    mutate("/api/users");
    setIsCreateModalOpen(false);
    showToast("User created successfully", "success");
  };

  const handleUpdateUser = async (data: UserFormData) => {
    if (!selectedUser) return;

    const response = await fetch(`/api/users/${selectedUser.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const err = await response.json();
      showToast(err.error || "Failed to update user", "error");
      throw new Error(err.error || "Failed to update user");
    }

    await mutate("/api/users");
    await mutate("/api/roles");
    await mutate("/api/wai");
    setIsEditModalOpen(false);
    setSelectedUser(null);
    showToast("User updated successfully", "success");
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    const response = await fetch(`/api/users/${selectedUser.id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      showToast("Failed to delete user", "error");
      return;
    }

    mutate("/api/users");
    setIsDeleteModalOpen(false);
    setSelectedUser(null);
    showToast("User deleted successfully", "success");
  };

  const closeEdit = () => { setIsEditModalOpen(false); setSelectedUser(null); };
  const closeView = () => { setIsViewModalOpen(false); setSelectedUser(null); };
  const closeDelete = () => { setIsDeleteModalOpen(false); setSelectedUser(null); };

  const columnHelper = createColumnHelper<UserWithRole>();

  const columns = useMemo(
    () => [
      columnHelper.accessor("firstname", { header: "First Name", cell: (info) => info.getValue() }),
      columnHelper.accessor("lastname",  { header: "Last Name",  cell: (info) => info.getValue() }),
      columnHelper.accessor("username",  { header: "Username",   cell: (info) => info.getValue() }),
      columnHelper.accessor("email",     { header: "Email",      cell: (info) => info.getValue() }),
      columnHelper.accessor("roleName",  { header: "Role",       cell: (info) => info.getValue() || "N/A" }),
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
              onClick={() => { setSelectedUser(props.row.original); setIsViewModalOpen(true); }}
              className="p-1 text-blue-600 hover:text-blue-800 transition-colors"
              title="View"
            >
              <EyeIcon className="w-5 h-5" />
            </button>
            <button
              onClick={async () => {
                setSelectedUser(props.row.original);
                await mutate("/api/roles", undefined, { revalidate: true });
                setIsEditModalOpen(true);
              }}
              className="p-1 text-yellow-600 hover:text-yellow-800 transition-colors"
              title="Edit"
            >
              <PencilSquareIcon className="w-5 h-5" />
            </button>
            <button
              onClick={() => { setSelectedUser(props.row.original); setIsDeleteModalOpen(true); }}
              className="p-1 text-red-600 hover:text-red-800 transition-colors"
              title="Delete"
            >
              <TrashIcon className="w-5 h-5" />
            </button>
          </div>
        ),
      }),
    ],
    [],
  );

  if (error && (error.message?.includes("Forbidden") || error.message?.includes("permission"))) {
    return <PermissionDenied moduleName="Users" />;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Users</h1>
        <div className="flex items-center gap-3">
          <div className="relative">
            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
            />
            <svg className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
          >
            <PlusIcon className="w-5 h-5" />
            Create User
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <Table data={users} columns={columns} />
      )}

      <CreateUserModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateUser}
      />

      <EditUserModal
        isOpen={isEditModalOpen}
        onClose={closeEdit}
        user={selectedUser}
        onSubmit={handleUpdateUser}
      />

      <ViewUserModal
        isOpen={isViewModalOpen}
        onClose={closeView}
        userId={selectedUser?.id}
      />

      <DeleteUserModal
        isOpen={isDeleteModalOpen}
        onClose={closeDelete}
        username={selectedUser?.username}
        onDelete={handleDeleteUser}
      />
    </div>
  );
}

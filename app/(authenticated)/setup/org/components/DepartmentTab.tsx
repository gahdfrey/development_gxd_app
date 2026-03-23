"use client";

import { useState, useMemo } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { createColumnHelper } from "@tanstack/react-table";
import { PencilSquareIcon, TrashIcon, PlusIcon } from "@heroicons/react/24/outline";
import Table from "@/app/components/ui/Table";
import Modal from "@/app/components/ui/Modal";
import DepartmentFormModal from "./DepartmentFormModal";
import type { Department } from "@/lib/db/schema";

export default function DepartmentTab() {
  const { data: departments, error, mutate } = useSWR<Department[]>(
    "/api/departments",
    fetcher,
  );

  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editing, setEditing] = useState<Department | null>(null);
  const [deleting, setDeleting] = useState<Department | null>(null);

  const openCreate = () => {
    setEditing(null);
    setIsFormModalOpen(true);
  };

  const openEdit = (dept: Department) => {
    setEditing(dept);
    setIsFormModalOpen(true);
  };

  const openDelete = (dept: Department) => {
    setDeleting(dept);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleting) return;

    try {
      const res = await fetch(`/api/departments/${deleting.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        mutate();
        setIsDeleteModalOpen(false);
        setDeleting(null);
      } else {
        const data = await res.json();
        alert(data.error || "Failed to delete department");
      }
    } catch {
      alert("Failed to delete department");
    }
  };

  const columnHelper = createColumnHelper<Department>();

  const columns = useMemo(
    () => [
      columnHelper.accessor("id", {
        header: "ID",
        cell: (info) => (
          <span className="font-medium">#{info.getValue()}</span>
        ),
      }),
      columnHelper.accessor("name", {
        header: "Department Name",
        cell: (info) => (
          <span className="font-semibold">{info.getValue()}</span>
        ),
      }),
      columnHelper.accessor("createdAt", {
        header: "Created At",
        cell: (info) => (
          <span className="text-gray-500">
            {new Date(info.getValue()).toLocaleDateString()}
          </span>
        ),
      }),
      columnHelper.display({
        id: "actions",
        header: "Actions",
        cell: (props) => (
          <div className="flex gap-2">
            <button
              onClick={() => openEdit(props.row.original)}
              className="p-1 text-yellow-600 hover:text-yellow-800 transition-colors"
              title="Edit"
            >
              <PencilSquareIcon className="w-5 h-5" />
            </button>
            <button
              onClick={() => openDelete(props.row.original)}
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

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
        Failed to load departments. Please try again.
      </div>
    );
  }

  return (
    <>
      <div className="flex justify-end mb-4">
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
        >
          <PlusIcon className="w-5 h-5" />
          Create Department
        </button>
      </div>

      {!departments ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : departments.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <p className="text-gray-500 mb-4">
            No departments yet. Create your first one!
          </p>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <PlusIcon className="w-5 h-5" />
            Create Department
          </button>
        </div>
      ) : (
        <Table data={departments} columns={columns} />
      )}

      <DepartmentFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        editing={editing}
        onSuccess={() => mutate()}
      />

      {/* Delete Confirmation */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setDeleting(null);
        }}
        title="Delete Department"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Are you sure you want to delete{" "}
            <strong>{deleting?.name}</strong>? This cannot be undone.
          </p>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => {
                setIsDeleteModalOpen(false);
                setDeleting(null);
              }}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteConfirm}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
            >
              Delete
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}

"use client";

import { useState, useMemo } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { createColumnHelper } from "@tanstack/react-table";
import { PencilSquareIcon, TrashIcon, PlusIcon } from "@heroicons/react/24/outline";
import Table from "@/app/components/ui/Table";
import Modal from "@/app/components/ui/Modal";
import SearchableSelect, { type SearchableSelectOption } from "@/app/components/ui/SearchableSelect";
import type { Department } from "@/lib/db/schema";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TestRow {
  id: number;
  name: string;
  price: number;
  departmentId: number;
  departmentName: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// ---------------------------------------------------------------------------
// Tab switcher
// ---------------------------------------------------------------------------

type ActiveTab = "department" | "test";

const tabs: { key: ActiveTab; label: string }[] = [
  { key: "department", label: "Department" },
  { key: "test", label: "Test" },
];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function OrgSetupPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("department");

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Organisation Setup</h1>
        <p className="text-gray-600 text-sm mt-1">
          Manage departments and lab tests
        </p>
      </div>

      {/* Tab Bar */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex gap-6">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === "department" ? <DepartmentTab /> : <TestTab />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Department Tab
// ---------------------------------------------------------------------------

function DepartmentTab() {
  const { data: departments, error, mutate } = useSWR<Department[]>("/api/departments", fetcher);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editing, setEditing] = useState<Department | null>(null);
  const [selected, setSelected] = useState<Department | null>(null);
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const openModal = (dept?: Department) => {
    setEditing(dept ?? null);
    setName(dept?.name ?? "");
    setErrorMessage("");
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditing(null);
    setName("");
    setErrorMessage("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const url = editing ? `/api/departments/${editing.id}` : "/api/departments";
      const method = editing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error || "An error occurred");
        return;
      }

      mutate();
      closeModal();
    } catch {
      setErrorMessage("Failed to save department");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selected) return;

    try {
      const res = await fetch(`/api/departments/${selected.id}`, { method: "DELETE" });

      if (res.ok) {
        mutate();
        setIsDeleteModalOpen(false);
        setSelected(null);
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
        cell: (info) => <span className="font-medium">#{info.getValue()}</span>,
      }),
      columnHelper.accessor("name", {
        header: "Department Name",
        cell: (info) => <span className="font-semibold">{info.getValue()}</span>,
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
              onClick={() => openModal(props.row.original)}
              className="p-1 text-yellow-600 hover:text-yellow-800 transition-colors"
              title="Edit"
            >
              <PencilSquareIcon className="w-5 h-5" />
            </button>
            <button
              onClick={() => {
                setSelected(props.row.original);
                setIsDeleteModalOpen(true);
              }}
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
          onClick={() => openModal()}
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
          <p className="text-gray-500 mb-4">No departments yet. Create your first one!</p>
          <button
            onClick={() => openModal()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <PlusIcon className="w-5 h-5" />
            Create Department
          </button>
        </div>
      ) : (
        <Table data={departments} columns={columns} />
      )}

      {/* Create / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editing ? "Edit Department" : "Create Department"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {errorMessage && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
              {errorMessage}
            </div>
          )}
          <div>
            <label
              htmlFor="dept-name"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Department Name <span className="text-red-500">*</span>
            </label>
            <input
              id="dept-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. Haematology"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={closeModal}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Saving..." : editing ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSelected(null);
        }}
        title="Delete Department"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Are you sure you want to delete <strong>{selected?.name}</strong>?
            This cannot be undone.
          </p>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => {
                setIsDeleteModalOpen(false);
                setSelected(null);
              }}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
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

// ---------------------------------------------------------------------------
// Test Tab
// ---------------------------------------------------------------------------

function TestTab() {
  const { data: tests, error, mutate } = useSWR<TestRow[]>("/api/tests", fetcher);
  const { data: departments } = useSWR<Department[]>("/api/departments", fetcher);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editing, setEditing] = useState<TestRow | null>(null);
  const [selected, setSelected] = useState<TestRow | null>(null);
  const [testName, setTestName] = useState("");
  const [price, setPrice] = useState("");
  const [selectedDept, setSelectedDept] = useState<SearchableSelectOption | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const deptOptions: SearchableSelectOption[] = (departments ?? []).map((d) => ({
    id: d.id,
    label: d.name,
  }));

  const openModal = (test?: TestRow) => {
    if (test) {
      setEditing(test);
      setTestName(test.name);
      setPrice(String(test.price));
      setSelectedDept(deptOptions.find((o) => o.id === test.departmentId) ?? null);
    } else {
      setEditing(null);
      setTestName("");
      setPrice("");
      setSelectedDept(null);
    }
    setErrorMessage("");
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditing(null);
    setTestName("");
    setPrice("");
    setSelectedDept(null);
    setErrorMessage("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage("");

    if (!selectedDept) {
      setErrorMessage("Please select a department");
      setIsSubmitting(false);
      return;
    }

    try {
      const url = editing ? `/api/tests/${editing.id}` : "/api/tests";
      const method = editing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: testName,
          price: parseInt(price),
          departmentId: selectedDept.id,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error || "An error occurred");
        return;
      }

      mutate();
      closeModal();
    } catch {
      setErrorMessage("Failed to save test");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selected) return;

    try {
      const res = await fetch(`/api/tests/${selected.id}`, { method: "DELETE" });

      if (res.ok) {
        mutate();
        setIsDeleteModalOpen(false);
        setSelected(null);
      } else {
        const data = await res.json();
        alert(data.error || "Failed to delete test");
      }
    } catch {
      alert("Failed to delete test");
    }
  };

  const columnHelper = createColumnHelper<TestRow>();

  const columns = useMemo(
    () => [
      columnHelper.accessor("id", {
        header: "ID",
        cell: (info) => <span className="font-medium">#{info.getValue()}</span>,
      }),
      columnHelper.accessor("name", {
        header: "Test Name",
        cell: (info) => <span className="font-semibold">{info.getValue()}</span>,
      }),
      columnHelper.accessor("departmentName", {
        header: "Department",
        cell: (info) => (
          <span className="text-gray-700">{info.getValue() ?? "—"}</span>
        ),
      }),
      columnHelper.accessor("price", {
        header: "Price (₦)",
        cell: (info) => (
          <span className="font-medium text-gray-900">
            ₦{info.getValue().toLocaleString()}
          </span>
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
              onClick={() => openModal(props.row.original)}
              className="p-1 text-yellow-600 hover:text-yellow-800 transition-colors"
              title="Edit"
            >
              <PencilSquareIcon className="w-5 h-5" />
            </button>
            <button
              onClick={() => {
                setSelected(props.row.original);
                setIsDeleteModalOpen(true);
              }}
              className="p-1 text-red-600 hover:text-red-800 transition-colors"
              title="Delete"
            >
              <TrashIcon className="w-5 h-5" />
            </button>
          </div>
        ),
      }),
    ],
    [deptOptions],
  );

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
        Failed to load tests. Please try again.
      </div>
    );
  }

  return (
    <>
      <div className="flex justify-end mb-4">
        <button
          onClick={() => openModal()}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
        >
          <PlusIcon className="w-5 h-5" />
          Create Test
        </button>
      </div>

      {!tests ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : tests.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <p className="text-gray-500 mb-4">No tests yet. Create your first one!</p>
          <button
            onClick={() => openModal()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <PlusIcon className="w-5 h-5" />
            Create Test
          </button>
        </div>
      ) : (
        <Table data={tests} columns={columns} />
      )}

      {/* Create / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editing ? "Edit Test" : "Create Test"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {errorMessage && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
              {errorMessage}
            </div>
          )}

          <div>
            <label
              htmlFor="test-name"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Test Name <span className="text-red-500">*</span>
            </label>
            <input
              id="test-name"
              type="text"
              value={testName}
              onChange={(e) => setTestName(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. Full Blood Count"
            />
          </div>

          <SearchableSelect
            label="Department"
            options={deptOptions}
            value={selectedDept}
            onChange={setSelectedDept}
            placeholder={
              !departments
                ? "Loading departments..."
                : deptOptions.length === 0
                ? "No departments — create one first"
                : "Search department..."
            }
            disabled={!departments || deptOptions.length === 0}
          />

          <div>
            <label
              htmlFor="test-price"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Price (₦) <span className="text-red-500">*</span>
            </label>
            <input
              id="test-price"
              type="number"
              min={1}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. 5000"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={closeModal}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Saving..." : editing ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSelected(null);
        }}
        title="Delete Test"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Are you sure you want to delete <strong>{selected?.name}</strong>?
            This cannot be undone.
          </p>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => {
                setIsDeleteModalOpen(false);
                setSelected(null);
              }}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
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

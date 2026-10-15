"use client";

import { useState, useMemo } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { HMO } from "@/lib/db/schema";
import Table from "@/app/components/ui/Table";
import Modal from "@/app/components/ui/Modal";
import { createColumnHelper } from "@tanstack/react-table";
import {
  PencilSquareIcon,
  TrashIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";
import { PAYER_TYPE_LABEL } from "../../finance/components/billing";

const EMPTY_FORM = {
  name: "",
  description: "",
  payerType: "hmo",
  code: "",
  contactPerson: "",
  phone: "",
  email: "",
  claimSubmissionDays: "",
};

const columnHelper = createColumnHelper<HMO>();

export default function HMOSetupPage() {
  const { data: hmos, error, mutate } = useSWR<HMO[]>("/api/hmo", fetcher);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingHMO, setEditingHMO] = useState<HMO | null>(null);
  const [selectedHMO, setSelectedHMO] = useState<HMO | null>(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleOpenModal = (hmo?: HMO) => {
    if (hmo) {
      setEditingHMO(hmo);
      setFormData({
        name: hmo.name,
        description: hmo.description || "",
        payerType: hmo.payerType,
        code: hmo.code || "",
        contactPerson: hmo.contactPerson || "",
        phone: hmo.phone || "",
        email: hmo.email || "",
        claimSubmissionDays: hmo.claimSubmissionDays != null ? String(hmo.claimSubmissionDays) : "",
      });
    } else {
      setEditingHMO(null);
      setFormData(EMPTY_FORM);
    }
    setErrorMessage("");
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingHMO(null);
    setFormData(EMPTY_FORM);
    setErrorMessage("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const url = editingHMO ? `/api/hmo/${editingHMO.id}` : "/api/hmo";
      const method = editingHMO ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrorMessage(data.error || "An error occurred");
        setIsSubmitting(false);
        return;
      }

      mutate();
      handleCloseModal();
    } catch {
      setErrorMessage("Failed to save HMO");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteHMO = async () => {
    if (!selectedHMO) return;

    try {
      const response = await fetch(`/api/hmo/${selectedHMO.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        mutate();
        setIsDeleteModalOpen(false);
        setSelectedHMO(null);
      } else {
        const data = await response.json();
        alert(data.error || "Failed to delete HMO");
      }
    } catch {
      alert("Failed to delete HMO");
    }
  };


  const columns = useMemo(
    () => [
      columnHelper.accessor("name", {
        header: "HMO / Payer",
        cell: (info) => (
          <div>
            <span className="font-semibold">{info.getValue()}</span>
            {info.row.original.code && (
              <span className="ml-2 text-xs font-medium text-gray-500">{info.row.original.code}</span>
            )}
            {info.row.original.description && (
              <span className="block text-xs text-gray-500">{info.row.original.description}</span>
            )}
          </div>
        ),
      }),
      columnHelper.accessor("payerType", {
        header: "Type",
        cell: (info) => <span className="text-gray-700">{PAYER_TYPE_LABEL[info.getValue()] ?? info.getValue()}</span>,
      }),
      columnHelper.display({
        id: "contact",
        header: "Contact",
        cell: (props) => {
          const h = props.row.original;
          if (!h.contactPerson && !h.phone && !h.email) return <span className="text-gray-400">—</span>;
          return (
            <div className="text-sm text-gray-700">
              {h.contactPerson && <span className="block">{h.contactPerson}</span>}
              {(h.phone || h.email) && (
                <span className="block text-xs text-gray-500">{[h.phone, h.email].filter(Boolean).join(" · ")}</span>
              )}
            </div>
          );
        },
      }),
      columnHelper.accessor("claimSubmissionDays", {
        header: "Claim window",
        cell: (info) => {
          const days = info.getValue();
          return <span className="text-gray-600">{days != null ? `${days} days` : "—"}</span>;
        },
      }),
      columnHelper.accessor("createdAt", {
        header: "Created At",
        cell: (info) => {
          const date = new Date(info.getValue());
          return (
            <span className="text-gray-500">{date.toLocaleDateString()}</span>
          );
        },
      }),
      columnHelper.display({
        id: "actions",
        header: "Actions",
        cell: (props) => (
          <div className="flex gap-2">
            <button
              onClick={() => handleOpenModal(props.row.original)}
              className="p-1 text-yellow-600 hover:text-yellow-800 transition-colors"
              title="Edit"
            >
              <PencilSquareIcon className="w-5 h-5" />
            </button>
            <button
              onClick={() => {
                setSelectedHMO(props.row.original);
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
    []
  );

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          Failed to load HMOs. Please try again.
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">HMO Setup</h1>
          <p className="text-gray-600 text-sm mt-1">
            The HMOs and schemes this hospital has contracts with. Each organisation keeps its own list.
          </p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
        >
          <PlusIcon className="w-5 h-5" />
          Create HMO
        </button>
      </div>

      {!hmos ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : hmos.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <p className="text-gray-500 mb-4">
            No HMOs found. Create your first one!
          </p>
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors mx-auto"
          >
            <PlusIcon className="w-5 h-5" />
            Create HMO
          </button>
        </div>
      ) : (
        <Table data={hmos} columns={columns} />
      )}

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingHMO ? "Edit HMO" : "Create New HMO"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {errorMessage && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
              {errorMessage}
            </div>
          )}

          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              HMO Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter HMO name"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="payerType" className="block text-sm font-medium text-gray-700 mb-1">
                Payer type
              </label>
              <select
                id="payerType"
                value={formData.payerType}
                onChange={(e) => setFormData({ ...formData, payerType: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {Object.entries(PAYER_TYPE_LABEL).map(([k, label]) => (
                  <option key={k} value={k}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-1">
                Short code <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                type="text"
                id="code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. LWH"
              />
            </div>
            <div>
              <label htmlFor="contactPerson" className="block text-sm font-medium text-gray-700 mb-1">
                Contact person <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                type="text"
                id="contactPerson"
                value={formData.contactPerson}
                onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Provider relations officer"
              />
            </div>
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                Authorization / call-centre phone <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                type="tel"
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                type="email"
                id="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label htmlFor="claimSubmissionDays" className="block text-sm font-medium text-gray-700 mb-1">
                Claim submission window (days) <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                type="number"
                id="claimSubmissionDays"
                min={1}
                max={365}
                value={formData.claimSubmissionDays}
                onChange={(e) => setFormData({ ...formData, claimSubmissionDays: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. 30"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="description"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Description
            </label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter HMO description (optional)"
            />
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={handleCloseModal}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting
                ? "Saving..."
                : editingHMO
                ? "Update HMO"
                : "Create HMO"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSelectedHMO(null);
        }}
        title="Delete HMO"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Are you sure you want to delete HMO{" "}
            <strong>{selectedHMO?.name}</strong>? Patients still enrolled with it must have their coverage ended
            first. Past bills and claims keep the HMO&apos;s name.
          </p>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => {
                setIsDeleteModalOpen(false);
                setSelectedHMO(null);
              }}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteHMO}
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

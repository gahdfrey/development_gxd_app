"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { createColumnHelper } from "@tanstack/react-table";
import { ArrowUpTrayIcon, MagnifyingGlassIcon, PencilSquareIcon, PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import { fetcher } from "@/lib/fetcher";
import Table from "@/app/components/ui/Table";
import Modal from "@/app/components/ui/Modal";
import ReferrerFormModal from "./ReferrerFormModal";
import ReferrerBulkUploadModal from "./ReferrerBulkUploadModal";
import type { ReferrerRow } from "./types";

const columnHelper = createColumnHelper<ReferrerRow>();

/** Setup → Referrers: people/facilities who refer patients in for tests. */
export default function ReferrersTab() {
  const { data: referrers, error, mutate } = useSWR<ReferrerRow[]>("/api/referrers", fetcher);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [editing, setEditing] = useState<ReferrerRow | null>(null);
  const [deleting, setDeleting] = useState<ReferrerRow | null>(null);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!referrers) return [];
    const q = search.trim().toLowerCase();
    if (!q) return referrers;
    return referrers.filter((r) =>
      [r.code, r.name, r.accountName, r.accountNumber, r.bank, r.whatsappNumber]
        .some((v) => (v ?? "").toLowerCase().includes(q)),
    );
  }, [referrers, search]);

  const openCreate = () => {
    setEditing(null);
    setIsFormOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleting) return;
    try {
      const res = await fetch(`/api/referrers/${deleting.id}`, { method: "DELETE" });
      if (res.ok) {
        mutate();
        setDeleting(null);
      } else {
        const data = await res.json();
        alert(data.error || "Failed to delete referrer");
      }
    } catch {
      alert("Failed to delete referrer");
    }
  };

  const columns = useMemo(
    () => [
      columnHelper.accessor("code", {
        header: "Referrer ID",
        cell: (info) => <span className="font-mono text-xs font-semibold text-blue-700">{info.getValue() ?? "—"}</span>,
      }),
      columnHelper.accessor("name", {
        header: "Name",
        cell: (info) => <span className="font-semibold">{info.getValue()}</span>,
      }),
      columnHelper.accessor("accountName", {
        header: "Account Name",
        cell: (info) => <span className="text-gray-700">{info.getValue()}</span>,
      }),
      columnHelper.accessor("accountNumber", {
        header: "Account No.",
        cell: (info) => <span className="font-mono text-gray-700">{info.getValue()}</span>,
      }),
      columnHelper.accessor("bank", {
        header: "Bank",
        cell: (info) => <span className="text-gray-700">{info.getValue()}</span>,
      }),
      columnHelper.accessor("whatsappNumber", {
        header: "WhatsApp",
        cell: (info) => <span className="text-gray-700">{info.getValue()}</span>,
      }),
      columnHelper.display({
        id: "actions",
        header: "Actions",
        cell: (props) => (
          <div className="flex gap-2">
            <button
              onClick={() => {
                setEditing(props.row.original);
                setIsFormOpen(true);
              }}
              className="p-1 text-yellow-600 hover:text-yellow-800 transition-colors"
              title="Edit"
            >
              <PencilSquareIcon className="w-5 h-5" />
            </button>
            <button
              onClick={() => setDeleting(props.row.original)}
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
        Failed to load referrers. Please try again.
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="relative flex-1 min-w-56 max-w-sm">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by name, ID, bank or number…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setIsBulkOpen(true)}
            className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
          >
            <ArrowUpTrayIcon className="w-5 h-5" />
            Bulk Upload
          </button>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
          >
            <PlusIcon className="w-5 h-5" />
            Create Referrer
          </button>
        </div>
      </div>

      {!referrers ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : referrers.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <p className="text-gray-500 mb-4">No referrers yet. Create one or upload a CSV.</p>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <PlusIcon className="w-5 h-5" />
            Create Referrer
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-8 text-center text-gray-500">
          No referrers match &quot;{search}&quot;.
        </div>
      ) : (
        <Table data={filtered} columns={columns} />
      )}

      <ReferrerFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        editing={editing}
        onSuccess={() => mutate()}
      />

      <ReferrerBulkUploadModal isOpen={isBulkOpen} onClose={() => setIsBulkOpen(false)} onSuccess={() => mutate()} />

      <Modal isOpen={!!deleting} onClose={() => setDeleting(null)} title="Delete Referrer">
        <div className="space-y-4">
          <p className="text-gray-600">
            Are you sure you want to delete <strong>{deleting?.name}</strong> ({deleting?.code})? Patients they already
            referred keep their referral history, but they can no longer be picked for new patients.
          </p>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setDeleting(null)}
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

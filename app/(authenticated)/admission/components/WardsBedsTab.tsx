"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { PlusIcon, PencilSquareIcon, TrashIcon } from "@heroicons/react/24/outline";
import Modal from "@/app/components/ui/Modal";
import WardFormModal from "./WardFormModal";
import BedFormModal from "./BedFormModal";
import type { Ward, Bed } from "./types";

const STATUS_BADGE: Record<string, string> = {
  available: "bg-green-100 text-green-700",
  occupied: "bg-red-100 text-red-700",
  maintenance: "bg-yellow-100 text-yellow-700",
};

export default function WardsBedsTab() {
  const { data: wards, error: wardsError, mutate: mutateWards } = useSWR<Ward[]>("/api/wards", fetcher);
  const [selectedWardId, setSelectedWardId] = useState<number | null>(null);

  useEffect(() => {
    if (!selectedWardId && wards && wards.length > 0) setSelectedWardId(wards[0].id);
  }, [wards, selectedWardId]);

  const { data: beds, mutate: mutateBeds } = useSWR<Bed[]>(
    selectedWardId ? `/api/beds?wardId=${selectedWardId}` : null,
    fetcher,
  );

  const [isWardFormOpen, setIsWardFormOpen] = useState(false);
  const [editingWard, setEditingWard] = useState<Ward | null>(null);
  const [deletingWard, setDeletingWard] = useState<Ward | null>(null);

  const [isBedFormOpen, setIsBedFormOpen] = useState(false);
  const [editingBed, setEditingBed] = useState<Bed | null>(null);
  const [deletingBed, setDeletingBed] = useState<Bed | null>(null);

  const handleDeleteWard = async () => {
    if (!deletingWard) return;
    const res = await fetch(`/api/wards/${deletingWard.id}`, { method: "DELETE" });
    if (res.ok) {
      if (selectedWardId === deletingWard.id) setSelectedWardId(null);
      mutateWards();
      setDeletingWard(null);
    } else {
      const data = await res.json();
      alert(data.error || "Failed to delete ward");
    }
  };

  const handleDeleteBed = async () => {
    if (!deletingBed) return;
    const res = await fetch(`/api/beds/${deletingBed.id}`, { method: "DELETE" });
    if (res.ok) {
      mutateBeds();
      setDeletingBed(null);
    } else {
      const data = await res.json();
      alert(data.error || "Failed to delete bed");
    }
  };

  if (wardsError) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
        Failed to load wards. Please try again.
      </div>
    );
  }

  const selectedWard = wards?.find((w) => w.id === selectedWardId) ?? null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Wards list */}
      <div className="md:col-span-1">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-800">Wards</h2>
          <button
            onClick={() => { setEditingWard(null); setIsWardFormOpen(true); }}
            className="flex items-center gap-1 text-sm px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <PlusIcon className="w-4 h-4" /> New Ward
          </button>
        </div>

        {!wards ? (
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
          </div>
        ) : wards.length === 0 ? (
          <p className="text-gray-500 text-sm bg-white rounded-lg shadow-sm p-4">No wards yet. Create your first one.</p>
        ) : (
          <ul className="space-y-1">
            {wards.map((w) => (
              <li key={w.id}>
                <div
                  onClick={() => setSelectedWardId(w.id)}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                    selectedWardId === w.id ? "bg-blue-50 border border-blue-200" : "hover:bg-gray-50 border border-transparent"
                  }`}
                >
                  <div>
                    <span className="font-medium text-gray-800">{w.name}</span>
                    {w.departmentName && <span className="block text-xs text-gray-500">{w.departmentName}</span>}
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); setEditingWard(w); setIsWardFormOpen(true); }}
                      className="p-1 text-yellow-600 hover:text-yellow-800"
                      title="Edit"
                    >
                      <PencilSquareIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeletingWard(w); }}
                      className="p-1 text-red-600 hover:text-red-800"
                      title="Delete"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Beds for selected ward */}
      <div className="md:col-span-2">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-800">
            {selectedWard ? `Beds — ${selectedWard.name}` : "Beds"}
          </h2>
          {selectedWard && (
            <button
              onClick={() => { setEditingBed(null); setIsBedFormOpen(true); }}
              className="flex items-center gap-1 text-sm px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <PlusIcon className="w-4 h-4" /> Add Bed
            </button>
          )}
        </div>

        {!selectedWard ? (
          <p className="text-gray-500 text-sm bg-white rounded-lg shadow-sm p-4">Select a ward to see its beds.</p>
        ) : !beds ? (
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
          </div>
        ) : beds.length === 0 ? (
          <p className="text-gray-500 text-sm bg-white rounded-lg shadow-sm p-4">No beds in this ward yet.</p>
        ) : (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Bed</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {beds.map((b) => (
                  <tr key={b.id}>
                    <td className="px-4 py-2 text-sm font-medium text-gray-800">Bed {b.bedNumber}</td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${STATUS_BADGE[b.status]}`}>
                        {b.status}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex gap-2">
                        <button
                          onClick={() => { setEditingBed(b); setIsBedFormOpen(true); }}
                          className="p-1 text-yellow-600 hover:text-yellow-800"
                          title="Edit"
                        >
                          <PencilSquareIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeletingBed(b)}
                          className="p-1 text-red-600 hover:text-red-800"
                          title="Delete"
                          disabled={b.status === "occupied"}
                        >
                          <TrashIcon className={`w-4 h-4 ${b.status === "occupied" ? "opacity-30 cursor-not-allowed" : ""}`} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <WardFormModal
        isOpen={isWardFormOpen}
        onClose={() => setIsWardFormOpen(false)}
        editing={editingWard}
        onSuccess={() => mutateWards()}
      />

      {selectedWardId && (
        <BedFormModal
          isOpen={isBedFormOpen}
          onClose={() => setIsBedFormOpen(false)}
          wardId={selectedWardId}
          editing={editingBed}
          onSuccess={() => mutateBeds()}
        />
      )}

      <Modal isOpen={!!deletingWard} onClose={() => setDeletingWard(null)} title="Delete Ward">
        <div className="space-y-4">
          <p className="text-gray-600">
            Are you sure you want to delete <strong>{deletingWard?.name}</strong>? This cannot be undone.
          </p>
          <div className="flex justify-end gap-3">
            <button onClick={() => setDeletingWard(null)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
              Cancel
            </button>
            <button onClick={handleDeleteWard} className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700">
              Delete
            </button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={!!deletingBed} onClose={() => setDeletingBed(null)} title="Delete Bed">
        <div className="space-y-4">
          <p className="text-gray-600">
            Are you sure you want to delete <strong>Bed {deletingBed?.bedNumber}</strong>? This cannot be undone.
          </p>
          <div className="flex justify-end gap-3">
            <button onClick={() => setDeletingBed(null)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
              Cancel
            </button>
            <button onClick={handleDeleteBed} className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700">
              Delete
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

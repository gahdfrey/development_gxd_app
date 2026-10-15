"use client";

import { useEffect, useState } from "react";
import Modal from "@/app/components/ui/Modal";
import type { ReferrerRow } from "./types";
import { NIGERIAN_BANKS } from "./referrerCsv";

interface ReferrerFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editing: ReferrerRow | null;
  onSuccess: () => void;
}

const EMPTY = { name: "", accountName: "", accountNumber: "", bank: "", whatsappNumber: "" };

const inputClass =
  "w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500";

export default function ReferrerFormModal({ isOpen, onClose, editing, onSuccess }: ReferrerFormModalProps) {
  const [form, setForm] = useState(EMPTY);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    setForm(
      editing
        ? {
            name: editing.name,
            accountName: editing.accountName,
            accountNumber: editing.accountNumber,
            bank: editing.bank,
            whatsappNumber: editing.whatsappNumber,
          }
        : EMPTY,
    );
    setErrorMessage("");
  }, [isOpen, editing]);

  const set = (key: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage("");
    try {
      const res = await fetch(editing ? `/api/referrers/${editing.id}` : "/api/referrers", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || "An error occurred");
        return;
      }
      onSuccess();
      onClose();
    } catch {
      setErrorMessage("Failed to save referrer");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editing ? `Edit Referrer ${editing.code ?? ""}` : "Create Referrer"}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMessage && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">{errorMessage}</div>
        )}

        <div>
          <label htmlFor="ref-name" className="block text-sm font-medium text-gray-700 mb-1">
            Name <span className="text-red-500">*</span>
          </label>
          <input id="ref-name" value={form.name} onChange={set("name")} required className={inputClass} placeholder="e.g. Dr. Adaeze Okafor" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="ref-account-name" className="block text-sm font-medium text-gray-700 mb-1">
              Account name <span className="text-red-500">*</span>
            </label>
            <input id="ref-account-name" value={form.accountName} onChange={set("accountName")} required className={inputClass} />
          </div>
          <div>
            <label htmlFor="ref-account-number" className="block text-sm font-medium text-gray-700 mb-1">
              Account number <span className="text-red-500">*</span>
            </label>
            <input
              id="ref-account-number"
              value={form.accountNumber}
              onChange={set("accountNumber")}
              required
              inputMode="numeric"
              pattern="\d{10}"
              maxLength={10}
              title="10-digit account number"
              className={inputClass}
              placeholder="10 digits"
            />
          </div>
          <div>
            <label htmlFor="ref-bank" className="block text-sm font-medium text-gray-700 mb-1">
              Bank <span className="text-red-500">*</span>
            </label>
            <input id="ref-bank" list="ref-bank-list" value={form.bank} onChange={set("bank")} required className={inputClass} placeholder="Start typing…" />
            <datalist id="ref-bank-list">
              {NIGERIAN_BANKS.map((b) => (
                <option key={b} value={b} />
              ))}
            </datalist>
          </div>
          <div>
            <label htmlFor="ref-whatsapp" className="block text-sm font-medium text-gray-700 mb-1">
              WhatsApp number <span className="text-red-500">*</span>
            </label>
            <input
              id="ref-whatsapp"
              type="tel"
              value={form.whatsappNumber}
              onChange={set("whatsappNumber")}
              required
              className={inputClass}
              placeholder="e.g. 08031234567"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
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
  );
}

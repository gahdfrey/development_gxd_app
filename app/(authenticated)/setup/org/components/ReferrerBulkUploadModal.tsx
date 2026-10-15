"use client";

import { useRef, useState } from "react";
import { ArrowDownTrayIcon, ArrowUpTrayIcon } from "@heroicons/react/24/outline";
import Modal from "@/app/components/ui/Modal";
import { downloadReferrersTemplate, parseReferrersCsv, type ReferrerCsvRow } from "./referrerCsv";

interface ReferrerBulkUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface ImportResult {
  created: number;
  errors: { row: number; error: string }[];
}

export default function ReferrerBulkUploadModal({ isOpen, onClose, onSuccess }: ReferrerBulkUploadModalProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<ReferrerCsvRow[]>([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [result, setResult] = useState<ImportResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const reset = () => {
    setFileName("");
    setRows([]);
    setErrorMessage("");
    setResult(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleClose = () => {
    if (isSubmitting) return;
    reset();
    onClose();
  };

  const handleFile = async (file: File | undefined) => {
    reset();
    if (!file) return;
    setFileName(file.name);
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setErrorMessage("Please upload a .csv file. In Excel, use File → Save As → CSV.");
      return;
    }
    const parsed = parseReferrersCsv(await file.text());
    if (parsed.error) {
      setErrorMessage(parsed.error);
      return;
    }
    setRows(parsed.rows);
  };

  const handleImport = async () => {
    setIsSubmitting(true);
    setErrorMessage("");
    try {
      const res = await fetch("/api/referrers/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || "Import failed");
        return;
      }
      setResult(data);
      if (data.created > 0) onSuccess();
    } catch {
      setErrorMessage("Import failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Bulk Upload Referrers" size="large">
      <div className="space-y-4">
        <div className="rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900">
          <p>
            Upload a CSV with the columns <strong>name, account name, account number, bank, whatsapp number</strong>.
            Each referrer gets a unique ID automatically.
          </p>
          <p className="mt-1 text-blue-800">
            Tip: format the account number column as <em>Text</em> in Excel so leading zeros aren&apos;t dropped.
          </p>
          <button
            type="button"
            onClick={downloadReferrersTemplate}
            className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-blue-700 hover:text-blue-900"
          >
            <ArrowDownTrayIcon className="h-4 w-4" /> Download template
          </button>
        </div>

        {!result && (
          <label className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 px-4 py-8 text-center cursor-pointer hover:border-blue-400 hover:bg-gray-50">
            <ArrowUpTrayIcon className="h-8 w-8 text-gray-400" />
            <span className="text-sm font-medium text-gray-700">{fileName || "Choose a CSV file"}</span>
            <span className="text-xs text-gray-500">{rows.length > 0 ? `${rows.length} referrer(s) found` : "Click to browse"}</span>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="sr-only"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
          </label>
        )}

        {errorMessage && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">{errorMessage}</div>
        )}

        {rows.length > 0 && !result && (
          <div className="max-h-72 overflow-auto rounded-lg border border-gray-200">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 sticky top-0">
                <tr className="text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  <th className="px-3 py-2">#</th>
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">Account name</th>
                  <th className="px-3 py-2">Account no.</th>
                  <th className="px-3 py-2">Bank</th>
                  <th className="px-3 py-2">WhatsApp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((r, i) => (
                  <tr key={i}>
                    <td className="px-3 py-1.5 text-gray-400">{i + 1}</td>
                    <td className="px-3 py-1.5 font-medium text-gray-900">{r.name}</td>
                    <td className="px-3 py-1.5 text-gray-700">{r.accountName}</td>
                    <td className="px-3 py-1.5 text-gray-700 font-mono">{r.accountNumber}</td>
                    <td className="px-3 py-1.5 text-gray-700">{r.bank}</td>
                    <td className="px-3 py-1.5 text-gray-700">{r.whatsappNumber}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {result && (
          <div className="space-y-3">
            <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
              {result.created} referrer(s) created.
              {result.errors.length > 0 && ` ${result.errors.length} row(s) skipped.`}
            </div>
            {result.errors.length > 0 && (
              <ul className="max-h-56 overflow-auto rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 space-y-1">
                {result.errors.map((e) => (
                  <li key={e.row}>
                    <strong>Row {e.row}:</strong> {e.error}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          {result ? (
            <>
              <button
                type="button"
                onClick={reset}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Upload another file
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                Done
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={handleClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleImport}
                disabled={isSubmitting || rows.length === 0}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? "Importing..." : `Import ${rows.length || ""} referrer(s)`}
              </button>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}

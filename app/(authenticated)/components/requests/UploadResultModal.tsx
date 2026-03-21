"use client";

import { useRef, useState } from "react";
import Modal from "@/app/components/ui/Modal";
import { type RequestRow } from "./RequestsTable";
import { DocumentArrowUpIcon, XCircleIcon } from "@heroicons/react/24/outline";

interface UploadResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  row: RequestRow | null;
  onSuccess?: () => void;
}

const ACCEPT = ".pdf,.jpg,.jpeg,.png,.gif,.webp,.bmp,.tiff,.doc,.docx";

export default function UploadResultModal({
  isOpen,
  onClose,
  row,
  onSuccess,
}: UploadResultModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  const patientName =
    `${row?.patientFirstname ?? ""} ${row?.patientLastname ?? ""}`.trim() || "—";

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setFileError(null);
    if (file && file.size > 20 * 1024 * 1024) {
      setFileError("File must be smaller than 20 MB.");
      setSelectedFile(null);
      return;
    }
    setSelectedFile(file);
  };

  const clearFile = () => {
    setSelectedFile(null);
    setFileError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleClose = () => {
    setSelectedFile(null);
    setMessage("");
    setError(null);
    setFileError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    onClose();
  };

  const handleSubmit = async () => {
    if (!row) return;
    setError(null);
    setFileError(null);

    if (!selectedFile) {
      setFileError("Please select a file to upload.");
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("message", message);

      const res = await fetch(`/api/requests/${row.id}/result`, {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        onSuccess?.();
        handleClose();
      } else {
        const data = await res.json();
        setError(data.error ?? "Failed to upload result.");
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Upload Result">
      <div className="space-y-5">
        {/* Patient Info — read-only */}
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Request Details
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Patient</p>
              <p className="text-sm font-medium text-gray-900">{patientName}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Department</p>
              <p className="text-sm font-medium text-gray-900">
                {row?.departmentName ?? "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Test</p>
              <p className="text-sm font-medium text-gray-900">
                {row?.testName ?? "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Price</p>
              <p className="text-sm font-medium text-gray-900">
                {row?.testPrice != null
                  ? `₦${row.testPrice.toLocaleString()}`
                  : "—"}
              </p>
            </div>
          </div>
        </div>

        {/* File Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Result File <span className="text-red-500">*</span>
          </label>

          {selectedFile ? (
            <div className="flex items-center justify-between gap-3 border border-green-300 bg-green-50 rounded-xl px-4 py-3">
              <div className="flex items-center gap-2 min-w-0">
                <DocumentArrowUpIcon className="h-5 w-5 text-green-600 shrink-0" />
                <span className="text-sm text-green-800 font-medium truncate">
                  {selectedFile.name}
                </span>
                <span className="text-xs text-green-600 shrink-0">
                  ({(selectedFile.size / 1024).toFixed(1)} KB)
                </span>
              </div>
              <button
                type="button"
                onClick={clearFile}
                className="text-green-500 hover:text-red-500 transition-colors shrink-0"
              >
                <XCircleIcon className="h-5 w-5" />
              </button>
            </div>
          ) : (
            <div
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer hover:bg-gray-50 transition-colors ${
                fileError ? "border-red-400 bg-red-50" : "border-gray-300"
              }`}
              onClick={() => fileInputRef.current?.click()}
            >
              <DocumentArrowUpIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600">
                Click to select a file, or drag and drop
              </p>
              <p className="text-xs text-gray-400 mt-1">
                PDF, JPG, PNG, GIF, WEBP, BMP, TIFF, DOC, DOCX — max 20 MB
              </p>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPT}
            className="hidden"
            onChange={handleFileChange}
          />

          {fileError && (
            <p className="mt-1.5 text-xs text-red-600">{fileError}</p>
          )}
        </div>

        {/* Optional Message */}
        <div>
          <label
            htmlFor="result-message"
            className="block text-sm font-medium text-gray-700 mb-1.5"
          >
            Notes / Message{" "}
            <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <textarea
            id="result-message"
            rows={3}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Add any notes or remarks about this result…"
            className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          />
        </div>

        {/* Global error */}
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-1">
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Uploading…" : "Upload Result"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

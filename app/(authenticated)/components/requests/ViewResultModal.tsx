"use client";

import useSWR from "swr";
import {
  XMarkIcon,
  ArrowDownTrayIcon,
  DocumentArrowDownIcon,
  ChatBubbleLeftEllipsisIcon,
  ExclamationCircleIcon,
} from "@heroicons/react/24/outline";
import { getBlobUrl } from "@/lib/appointmentUtils";
import { fetcher } from "@/lib/fetcher";
import type { RequestRow } from "./RequestsTable";

interface ResultEntry {
  id: number;
  requestId: number;
  fileName: string;
  filePath: string;
  fileType: string;
  message: string | null;
  createdAt: string;
  uploadedByFirstname: string | null;
  uploadedByLastname: string | null;
}

interface ViewResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  row: RequestRow | null;
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function isImageType(fileType: string): boolean {
  return fileType.startsWith("image/");
}

/** Renders a single uploaded file inline (image / PDF / download fallback). */
function ResultFile({ result }: { result: ResultEntry }) {
  const isImage = isImageType(result.fileType);
  const isPdf = result.fileType === "application/pdf";

  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden">
      {/* File header */}
      <div className="flex items-start justify-between gap-3 px-3.5 py-2.5 bg-gray-50 border-b border-gray-100">
        <div className="flex items-center gap-2.5 min-w-0">
          <DocumentArrowDownIcon className="h-5 w-5 text-blue-500 shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">{result.fileName}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {result.uploadedByFirstname && (
                <>
                  Uploaded by{" "}
                  <span className="font-medium text-gray-600">
                    {result.uploadedByFirstname} {result.uploadedByLastname}
                  </span>{" · "}
                </>
              )}
              {formatDateTime(result.createdAt)}
            </p>
          </div>
        </div>
        <a
          href={getBlobUrl(result.filePath, true)}
          download={result.fileName}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex shrink-0 items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowDownTrayIcon className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Download</span>
        </a>
      </div>

      {/* Optional message from the uploader */}
      {result.message && (
        <div className="px-3.5 py-2.5 bg-blue-50 border-b border-blue-100 flex items-start gap-2">
          <ChatBubbleLeftEllipsisIcon className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
          <p className="text-sm text-blue-800 italic">&ldquo;{result.message}&rdquo;</p>
        </div>
      )}

      {/* File preview */}
      <div className="bg-gray-50 flex items-center justify-center min-h-[240px]">
        {isImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={getBlobUrl(result.filePath)}
            alt={result.fileName}
            className="max-w-full max-h-[60vh] object-contain p-3"
          />
        ) : isPdf ? (
          <iframe
            src={getBlobUrl(result.filePath)}
            title={result.fileName}
            className="w-full border-0"
            style={{ height: "60vh", minHeight: "300px" }}
          />
        ) : (
          <div className="text-center p-10 space-y-3">
            <DocumentArrowDownIcon className="h-12 w-12 text-gray-300 mx-auto" />
            <p className="text-gray-500 text-sm">Preview not available for this file type.</p>
            <a
              href={getBlobUrl(result.filePath, true)}
              download={result.fileName}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              <ArrowDownTrayIcon className="h-4 w-4" />
              Download File
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ViewResultModal({ isOpen, onClose, row }: ViewResultModalProps) {
  // Only fetch while the modal is open for a specific request (null key = idle).
  const { data, isLoading, error } = useSWR<ResultEntry[]>(
    isOpen && row ? `/api/requests/${row.id}/result` : null,
    fetcher,
  );
  const results = data ?? [];

  if (!isOpen || !row) return null;

  const patientName =
    `${row.patientFirstname ?? ""} ${row.patientLastname ?? ""}`.trim() || "Patient";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full sm:max-w-3xl bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        style={{ maxHeight: "92dvh" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center pt-3 pb-1 sm:hidden shrink-0">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-4 sm:px-5 py-3 sm:py-4 border-b border-gray-100 shrink-0">
          <div className="min-w-0">
            <p className="text-sm font-bold text-gray-900 truncate">
              {row.testName ?? "Result"}
            </p>
            <p className="text-xs text-gray-500 mt-0.5 truncate">
              {patientName}
              {row.departmentName ? ` · ${row.departmentName}` : ""}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors shrink-0"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto p-4 sm:p-5 space-y-3 min-h-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-48">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : error ? (
            <div className="flex items-center gap-2.5 text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <ExclamationCircleIcon className="h-5 w-5 shrink-0" />
              <p className="text-sm font-medium">Could not load the result. Please try again.</p>
            </div>
          ) : results.length === 0 ? (
            <div className="text-center py-12 text-gray-500 text-sm">
              No result files found for this request.
            </div>
          ) : (
            results.map((result) => <ResultFile key={result.id} result={result} />)
          )}
        </div>
      </div>
    </div>
  );
}

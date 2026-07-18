"use client";

import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import {
  UserCircleIcon,
  PhoneIcon,
  CalendarDaysIcon,
  BeakerIcon,
  DocumentCheckIcon,
  CurrencyDollarIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  DocumentArrowDownIcon,
  ArrowDownTrayIcon,
  XMarkIcon,
  ExclamationCircleIcon,
  ChatBubbleLeftEllipsisIcon,
  LockClosedIcon,
  ShieldExclamationIcon,
  ShieldCheckIcon,
  ClipboardDocumentListIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";
import { useMemo, useState } from "react";
import { getBlobUrl } from "@/lib/appointmentUtils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PatientHistory {
  patient: {
    id: number;
    firstname: string;
    lastname: string;
    gender: string;
    dob: string;
    phone: string;
    countryCode: string;
    insuranceType: string;
    hmoId: number | null;
    hmoName: string | null;
    policyNumber: string | null;
    maidenName: string | null;
    nextOfKinFirstname: string | null;
    nextOfKinLastname: string | null;
    nextOfKinRelationship: string | null;
    nextOfKinAddress: string | null;
    nextOfKinPhone: string | null;
    nextOfKinEmail: string | null;
    createdAt: string;
  };
  stats: {
    completedVisits: number;
    totalRequests: number;
    paidRequests: number;
    resultsReceived: number;
  };
  timeline: TimelineEntry[];
  unlinkedRequests: RequestEntry[];
}

interface TimelineEntry {
  appointment: {
    id: number;
    appointmentDate: string;
    appointmentTime: string;
    status: string;
    visitType: string;
    notes: string | null;
    createdAt: string;
    doctorFirstname: string | null;
    doctorLastname: string | null;
  };
  visit: {
    durationMinutes: number;
    hasDoctorNotes: boolean;
    startTime: string;
    endTime: string;
    diagnoses?: DiagnosisEntry[];
  } | null;
  requests: RequestEntry[];
  prescriptions: PrescriptionEntry[];
}

interface DiagnosisEntry {
  icdCode: string | null;
  icdTitle: string | null;
  clinicalText: string | null;
  diagnosisType: string;
}

interface PrescriptionEntry {
  id: number;
  appointmentId: number | null;
  productName: string | null;
  dosage: string;
  paymentStatus: string;
  status: string;
  createdAt: string;
}

interface RequestEntry {
  id: number;
  appointmentId: number | null;
  status: string;
  paymentStatus: string;
  createdAt: string;
  testName: string | null;
  testPrice: number | null;
  departmentName: string | null;
  requestedByFirstname: string | null;
  requestedByLastname: string | null;
  results: ResultEntry[];
}

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

type TabKey = "visits" | "results" | "prescriptions" | "privacy";

interface DataRequestRow {
  id: number;
  type: string;
  status: string;
  details: string;
  resolutionNote: string | null;
  createdAt: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatAge(dob: string): string {
  const today = new Date();
  const birth = new Date(dob);
  let years = today.getFullYear() - birth.getFullYear();
  let months = today.getMonth() - birth.getMonth();
  let days = today.getDate() - birth.getDate();
  if (days < 0) {
    months--;
    days += new Date(today.getFullYear(), today.getMonth(), 0).getDate();
  }
  if (months < 0) {
    years--;
    months += 12;
  }
  if (years >= 1) return `${years} ${years === 1 ? "yr" : "yrs"}`;
  if (months >= 1) return `${months} ${months === 1 ? "mo" : "mos"}`;
  return `${days} ${days === 1 ? "day" : "days"}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatTime(timeStr: string): string {
  const [h, m] = timeStr.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, "0")} ${ampm}`;
}

function getInitials(firstname: string, lastname: string): string {
  return `${firstname[0] ?? ""}${lastname[0] ?? ""}`.toUpperCase();
}

function capitalise(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/** Flat, professional status pill — soft fill + hairline ring, no borders. */
function pillClasses(kind: string): string {
  switch (kind) {
    case "completed":
    case "paid":
    case "dispatched":
      return "bg-emerald-50 text-emerald-700 ring-emerald-200";
    case "scheduled":
    case "result":
      return "bg-blue-50 text-blue-700 ring-blue-200";
    case "cancelled":
    case "not_paid":
      return "bg-red-50 text-red-700 ring-red-200";
    case "no-show":
    case "pending":
      return "bg-amber-50 text-amber-700 ring-amber-200";
    default:
      return "bg-slate-100 text-slate-600 ring-slate-200";
  }
}

function Pill({ kind, children }: { kind: string; children: React.ReactNode }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${pillClasses(kind)}`}
    >
      {children}
    </span>
  );
}

function isImageType(fileType: string): boolean {
  return fileType.startsWith("image/");
}

// ─── Sensitive Data Popup ─────────────────────────────────────────────────────

function SensitiveDataModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full sm:max-w-sm bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>
        <div className="p-6 text-center space-y-4">
          <div className="mx-auto w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center">
            <ShieldExclamationIcon className="h-8 w-8 text-amber-600" />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900 mb-2">
              Sensitive Data
            </h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              You are requesting to see sensitive data. Contact your admin to
              update your access.
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-full px-4 py-3 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 active:bg-blue-800 transition-colors"
          >
            OK, Got It
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Result Viewer Modal ──────────────────────────────────────────────────────

function ResultViewerModal({
  result,
  onClose,
}: {
  result: ResultEntry;
  onClose: () => void;
}) {
  const isImage = isImageType(result.fileType);
  const isPdf = result.fileType === "application/pdf";

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
          <div className="flex items-center gap-2.5 min-w-0">
            <DocumentArrowDownIcon className="h-5 w-5 text-blue-500 shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">
                {result.fileName}
              </p>
              <p className="text-xs text-gray-400 mt-0.5 hidden sm:block">
                Uploaded by{" "}
                <span className="font-medium text-gray-600">
                  {result.uploadedByFirstname} {result.uploadedByLastname}
                </span>{" "}
                · {formatDateTime(result.createdAt)}
              </p>
              <p className="text-xs text-gray-400 mt-0.5 sm:hidden">
                {formatDateTime(result.createdAt)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <a
              href={getBlobUrl(result.filePath, true)}
              download={result.fileName}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 rounded-lg transition-colors"
            >
              <ArrowDownTrayIcon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Download</span>
            </a>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 active:bg-gray-200 rounded-lg transition-colors"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Optional message */}
        {result.message && (
          <div className="px-4 sm:px-5 py-3 bg-blue-50 border-b border-blue-100 flex items-start gap-2.5 shrink-0">
            <ChatBubbleLeftEllipsisIcon className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
            <p className="text-sm text-blue-800 italic">
              &ldquo;{result.message}&rdquo;
            </p>
          </div>
        )}

        {/* File viewer */}
        <div className="flex-1 overflow-auto bg-gray-50 flex items-center justify-center min-h-0">
          {isImage ? (
            <img
              src={getBlobUrl(result.filePath)}
              alt={result.fileName}
              className="max-w-full max-h-full object-contain p-3 sm:p-4"
            />
          ) : isPdf ? (
            <iframe
              src={getBlobUrl(result.filePath)}
              title={result.fileName}
              className="w-full h-full border-0"
              style={{ minHeight: "300px" }}
            />
          ) : (
            <div className="text-center p-8 sm:p-12 space-y-4">
              <DocumentArrowDownIcon className="h-12 sm:h-14 w-12 sm:w-14 text-gray-300 mx-auto" />
              <p className="text-gray-500 text-sm">
                Preview not available for this file type.
              </p>
              <a
                href={getBlobUrl(result.filePath, true)}
                download={result.fileName}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                <ArrowDownTrayIcon className="h-4 w-4" />
                Download File
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Result Card ──────────────────────────────────────────────────────────────

function ResultCard({ result }: { result: ResultEntry }) {
  const [viewing, setViewing] = useState(false);
  const isImage = isImageType(result.fileType);

  return (
    <>
      <button
        onClick={() => setViewing(true)}
        className="w-full text-left bg-white border border-gray-200 rounded-xl p-3 space-y-2 hover:border-blue-300 active:bg-blue-50/40 transition-colors group"
      >
        <div className="flex items-start gap-2.5">
          <DocumentArrowDownIcon className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-blue-600 group-hover:text-blue-800 truncate">
              {result.fileName}
            </p>
            {result.message && (
              <p className="text-xs text-gray-600 mt-0.5 italic truncate">
                &ldquo;{result.message}&rdquo;
              </p>
            )}
            <p className="text-xs text-gray-400 mt-1">
              {formatDateTime(result.createdAt)}
            </p>
          </div>
          <span className="text-xs text-blue-500 group-hover:text-blue-700 font-medium shrink-0 mt-0.5">
            View
          </span>
        </div>
        {isImage && (
          <img
            src={getBlobUrl(result.filePath)}
            alt={result.fileName}
            className="w-full max-h-32 object-contain rounded-lg border border-gray-100 mt-1 pointer-events-none"
          />
        )}
      </button>
      {viewing && (
        <ResultViewerModal result={result} onClose={() => setViewing(false)} />
      )}
    </>
  );
}

// ─── Request Card (shared by Visits + Test Results tabs) ─────────────────────

function RequestCard({
  request,
  showDate = false,
}: {
  request: RequestEntry;
  showDate?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const isPaid = request.paymentStatus === "paid";
  const hasResults = request.results.length > 0;

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => hasResults && setExpanded((v) => !v)}
        className={`w-full px-3 sm:px-4 py-3 text-left ${hasResults ? "hover:bg-gray-50/80 transition-colors" : "cursor-default"}`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2.5 min-w-0">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 mt-0.5">
              <BeakerIcon className="h-4 w-4 text-slate-500" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">
                {request.testName ?? "—"}
              </p>
              <p className="text-xs text-gray-500">
                {request.departmentName ?? "—"}
                {showDate && <> · {formatDate(request.createdAt)}</>}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {request.testPrice != null && (
              <span className="text-sm font-semibold text-gray-700 hidden sm:inline">
                ₦{request.testPrice.toLocaleString()}
              </span>
            )}
            {hasResults &&
              (expanded ? (
                <ChevronUpIcon className="h-4 w-4 text-gray-400" />
              ) : (
                <ChevronDownIcon className="h-4 w-4 text-gray-400" />
              ))}
          </div>
        </div>

        <div className="flex items-center gap-2 mt-2.5 flex-wrap">
          {request.testPrice != null && (
            <span className="text-xs font-semibold text-gray-600 sm:hidden">
              ₦{request.testPrice.toLocaleString()}
            </span>
          )}
          <Pill kind={isPaid ? "paid" : "not_paid"}>
            {isPaid ? "Paid" : "Not Paid"}
          </Pill>
          {hasResults ? (
            <Pill kind="result">
              {request.results.length} result
              {request.results.length !== 1 ? "s" : ""}
            </Pill>
          ) : (
            <Pill
              kind={request.status === "completed" ? "completed" : "pending"}
            >
              {capitalise(request.status)}
            </Pill>
          )}
        </div>
      </button>

      {expanded && hasResults && (
        <div className="border-t border-gray-100 bg-gray-50/60 p-3 space-y-2">
          {request.results.map((result) => (
            <ResultCard key={result.id} result={result} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Visit Card ───────────────────────────────────────────────────────────────

function VisitCard({ entry }: { entry: TimelineEntry }) {
  const { appointment, visit, requests, prescriptions } = entry;
  const [sensitiveModalOpen, setSensitiveModalOpen] = useState(false);

  const doctorName =
    appointment.doctorFirstname && appointment.doctorLastname
      ? `Dr. ${appointment.doctorFirstname} ${appointment.doctorLastname}`
      : "Unknown Doctor";

  return (
    <>
      <div className="relative pl-6 sm:pl-8">
        {/* Timeline dot */}
        <div className="absolute left-0 top-5 h-3 w-3 rounded-full border-2 border-blue-600 bg-white" />

        <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-200 overflow-hidden mb-1">
          {/* Card header */}
          <div className="px-3 sm:px-5 py-3 sm:py-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                <CalendarDaysIcon className="h-4 w-4 text-gray-400 shrink-0" />
                {formatDate(appointment.appointmentDate)}
                <span className="font-normal text-gray-400">
                  {formatTime(appointment.appointmentTime)}
                </span>
              </div>
              <p className="mt-1 text-xs sm:text-sm text-gray-500">
                {doctorName}
                {visit && (
                  <span className="text-gray-400">
                    {" "}
                    · {visit.durationMinutes} min
                  </span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <Pill kind="default">{capitalise(appointment.visitType)}</Pill>
              <Pill kind={appointment.status}>
                {capitalise(appointment.status)}
              </Pill>
            </div>
          </div>

          <div className="px-3 sm:px-5 py-3 sm:py-4 space-y-4">
            {/* Appointment notes */}
            {appointment.notes && (
              <div>
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
                  Appointment Notes
                </p>
                <p className="text-sm text-gray-600 italic">
                  &ldquo;{appointment.notes}&rdquo;
                </p>
              </div>
            )}

            {/* Diagnoses — coded conditions are part of the patient's own record */}
            {visit?.diagnoses && visit.diagnoses.length > 0 && (
              <div>
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  Diagnoses
                </p>
                <ul className="space-y-1.5">
                  {visit.diagnoses.map((d, i) => (
                    <li
                      key={i}
                      className="flex items-center gap-2.5 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2"
                    >
                      {d.icdCode && (
                        <span className="shrink-0 rounded bg-slate-900 px-2 py-0.5 font-mono text-[11px] font-bold text-white">
                          {d.icdCode}
                        </span>
                      )}
                      <span className="flex-1 text-sm text-gray-800">
                        {d.icdTitle || d.clinicalText}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Doctor notes — locked for patients */}
            {visit?.hasDoctorNotes && (
              <div>
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
                  Consultation Notes
                </p>
                <button
                  onClick={() => setSensitiveModalOpen(true)}
                  className="flex items-center gap-2 w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700 hover:bg-amber-100 active:bg-amber-200 transition-colors"
                >
                  <LockClosedIcon className="h-4 w-4 shrink-0" />
                  <span className="font-medium text-left leading-tight">
                    Consultation notes are restricted
                  </span>
                  <span className="text-xs text-amber-400 ml-auto shrink-0 hidden sm:inline">
                    Tap to learn more
                  </span>
                </button>
              </div>
            )}

            {/* Requests */}
            {requests.length > 0 && (
              <div>
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  Tests Requested ({requests.length})
                </p>
                <div className="space-y-2">
                  {requests.map((req) => (
                    <RequestCard key={req.id} request={req} />
                  ))}
                </div>
              </div>
            )}

            {/* Prescriptions */}
            {prescriptions && prescriptions.length > 0 && (
              <div>
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  Medications Prescribed ({prescriptions.length})
                </p>
                <div className="space-y-2">
                  {prescriptions.map((rx) => (
                    <div
                      key={rx.id}
                      className="flex items-start justify-between gap-3 px-3 py-2.5 rounded-xl bg-white border border-gray-200"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900">
                          {rx.productName ?? "—"}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {rx.dosage}
                        </p>
                      </div>
                      <Pill kind={rx.status}>{capitalise(rx.status)}</Pill>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {sensitiveModalOpen && (
        <SensitiveDataModal onClose={() => setSensitiveModalOpen(false)} />
      )}
    </>
  );
}

// ─── Empty state ─────────────────────────────────────────────────────────────

function EmptyState({
  icon: Icon,
  message,
}: {
  icon: React.ElementType;
  message: string;
}) {
  return (
    <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-200 p-10 sm:p-14 text-center">
      <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-50">
        <Icon className="h-6 w-6 text-gray-300" />
      </span>
      <p className="text-gray-500 text-sm">{message}</p>
    </div>
  );
}

// ─── Privacy & Data Rights (GDPR Art. 15/16/17/20) ───────────────────────────

function PrivacyPanel({ history }: { history: PatientHistory }) {
  const { data: requests, mutate: mutateRequests } = useSWR<DataRequestRow[]>(
    "/api/data-requests",
    fetcher,
  );
  const [type, setType] = useState<"rectification" | "erasure">("rectification");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  const downloadData = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      note: "Personal health data export provided under your right of data portability (GDPR Art. 20).",
      ...history,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `my-health-data-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!details.trim()) {
      setFeedback({ ok: false, text: "Please describe your request." });
      return;
    }
    setSubmitting(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/data-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, details }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Failed to submit request");
      setDetails("");
      setFeedback({
        ok: true,
        text: "Your request has been submitted. Our team will review and respond.",
      });
      mutateRequests();
    } catch (err) {
      setFeedback({
        ok: false,
        text: err instanceof Error ? err.message : "Failed to submit request",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const REQUEST_LABEL: Record<string, string> = {
    rectification: "Correction",
    erasure: "Deletion",
  };

  return (
    <div className="space-y-5">
      {/* Download my data */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50">
            <ArrowDownTrayIcon className="h-5 w-5 text-blue-600" />
          </span>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-gray-900">Download my data</h3>
            <p className="mt-1 text-sm text-gray-500">
              Get a copy of your complete health record — profile, visits,
              diagnoses, test results, and prescriptions — in a structured file
              you can keep or share with another provider.
            </p>
            <div className="mt-3 flex flex-wrap gap-2.5">
              <button
                onClick={downloadData}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
              >
                <ArrowDownTrayIcon className="h-4 w-4" />
                Download (JSON)
              </button>
              <a
                href={`/api/patients/${history.patient.id}/fhir`}
                className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <ArrowDownTrayIcon className="h-4 w-4" />
                Download (FHIR R4)
              </a>
            </div>
            <p className="mt-2 text-xs text-gray-400">
              FHIR is the international standard for sharing health records
              between systems.
            </p>
          </div>
        </div>
      </div>

      {/* Submit a data request */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
        <h3 className="text-sm font-bold text-gray-900">
          Request a correction or deletion
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          Ask us to correct information that&apos;s wrong, or to delete your
          personal data. We&apos;ll review your request and get back to you.
        </p>

        {feedback && (
          <p
            className={`mt-3 rounded-lg px-3 py-2 text-sm ${
              feedback.ok
                ? "bg-emerald-50 text-emerald-700"
                : "bg-red-50 text-red-600"
            }`}
          >
            {feedback.text}
          </p>
        )}

        <form onSubmit={submit} className="mt-4 space-y-3">
          <div className="flex flex-wrap gap-2">
            {(["rectification", "erasure"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={`rounded-lg px-3.5 py-2 text-sm font-semibold ring-1 transition-colors ${
                  type === t
                    ? "bg-blue-50 text-blue-700 ring-blue-200"
                    : "bg-white text-gray-600 ring-gray-200 hover:bg-gray-50"
                }`}
              >
                {t === "rectification" ? "Correct my information" : "Delete my data"}
              </button>
            ))}
          </div>
          <textarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            rows={4}
            placeholder={
              type === "rectification"
                ? "Tell us what's incorrect and what it should be…"
                : "Tell us what you'd like deleted and why…"
            }
            className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50/60 px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10"
          />
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60 transition-colors"
          >
            {submitting ? "Submitting…" : "Submit request"}
          </button>
        </form>
      </div>

      {/* Existing requests */}
      {requests && requests.length > 0 && (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
          <h3 className="text-sm font-bold text-gray-900 mb-3">Your requests</h3>
          <ul className="space-y-2.5">
            {requests.map((r) => (
              <li
                key={r.id}
                className="rounded-xl border border-gray-100 bg-gray-50/60 px-4 py-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-semibold text-gray-800">
                    {REQUEST_LABEL[r.type] ?? r.type} request
                  </span>
                  <Pill kind={r.status === "resolved" ? "completed" : r.status === "rejected" ? "cancelled" : "pending"}>
                    {capitalise(r.status)}
                  </Pill>
                </div>
                <p className="mt-1 text-sm text-gray-600">{r.details}</p>
                {r.resolutionNote && (
                  <p className="mt-1.5 text-xs text-gray-500">
                    <span className="font-semibold">Response:</span>{" "}
                    {r.resolutionNote}
                  </p>
                )}
                <p className="mt-1 text-xs text-gray-400">
                  {formatDate(r.createdAt)}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MyHistoryPage() {
  const { data, isLoading, error } = useSWR<PatientHistory>(
    "/api/my-history",
    fetcher,
  );

  const [activeTab, setActiveTab] = useState<TabKey>("visits");
  const [nokExpanded, setNokExpanded] = useState(false);
  const [timelinePage, setTimelinePage] = useState(1);

  // Flatten every request (visit-linked + unlinked) for the Test Results tab.
  const allRequests = useMemo(() => {
    if (!data) return [] as RequestEntry[];
    return [
      ...data.timeline.flatMap((t) => t.requests),
      ...data.unlinkedRequests,
    ].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [data]);

  // Flatten prescriptions for the Prescriptions tab.
  const allPrescriptions = useMemo(() => {
    if (!data) return [] as PrescriptionEntry[];
    return data.timeline
      .flatMap((t) => t.prescriptions ?? [])
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
  }, [data]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-3 sm:p-6 max-w-4xl mx-auto">
        <div className="flex items-center gap-3 text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3 sm:px-5 sm:py-4">
          <ExclamationCircleIcon className="h-5 w-5 shrink-0" />
          <p className="text-sm font-medium">
            Failed to load your history. Please try again.
          </p>
        </div>
      </div>
    );
  }

  const TIMELINE_PAGE_SIZE = 5;
  const { patient, stats, timeline } = data;
  const timelinePageCount = Math.ceil(timeline.length / TIMELINE_PAGE_SIZE);
  const pagedTimeline = timeline.slice(
    (timelinePage - 1) * TIMELINE_PAGE_SIZE,
    timelinePage * TIMELINE_PAGE_SIZE,
  );
  const fullName = `${patient.firstname} ${patient.lastname}`;
  const hasNok = patient.nextOfKinFirstname || patient.nextOfKinLastname;

  const insuranceLabel =
    patient.insuranceType === "hmo"
      ? `HMO${patient.hmoName ? ` — ${patient.hmoName}` : ""}`
      : capitalise(patient.insuranceType);

  const tabs: { key: TabKey; label: string; count: number }[] = [
    { key: "visits", label: "Visits", count: timeline.length },
    { key: "results", label: "Test Results", count: allRequests.length },
    {
      key: "prescriptions",
      label: "Prescriptions",
      count: allPrescriptions.length,
    },
    { key: "privacy", label: "Privacy & My Data", count: 0 },
  ];

  return (
    <div className="p-3 sm:p-6 max-w-5xl mx-auto space-y-4 sm:space-y-5">
      {/* ── Patient Header ─────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-200 overflow-hidden">
        {/* Solid colored identity band */}
        <div className="bg-blue-600 px-4 sm:px-6 py-4 sm:py-5">
          <div className="flex items-center gap-3.5 sm:gap-5">
            <div className="flex h-14 w-14 sm:h-16 sm:w-16 shrink-0 items-center justify-center rounded-2xl bg-white shadow-sm">
              <span className="text-lg sm:text-xl font-bold text-blue-600">
                {getInitials(patient.firstname, patient.lastname)}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg sm:text-2xl font-bold tracking-tight text-white truncate">
                {fullName}
              </h1>
              <p className="text-xs sm:text-sm text-blue-100 mt-0.5">
                {capitalise(patient.gender)} · {formatAge(patient.dob)} old
              </p>
            </div>
            <div className="text-right shrink-0 hidden sm:block">
              <p className="text-[11px] font-medium uppercase tracking-wider text-blue-200">
                Registered
              </p>
              <p className="text-sm font-semibold text-white mt-0.5">
                {formatDate(patient.createdAt)}
              </p>
            </div>
          </div>
        </div>

        <div className="px-4 sm:px-6 py-4 sm:py-5">
          {/* Details row */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
            <div className="flex items-start gap-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50">
                <PhoneIcon className="h-4 w-4 text-blue-600" />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wider text-gray-400">
                  Phone
                </p>
                <p className="text-xs sm:text-sm font-semibold text-gray-800 truncate mt-0.5">
                  {patient.countryCode} {patient.phone}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50">
                <ShieldCheckIcon className="h-4 w-4 text-emerald-600" />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wider text-gray-400">
                  Insurance
                </p>
                <p className="text-xs sm:text-sm font-semibold text-gray-800 truncate mt-0.5">
                  {insuranceLabel}
                </p>
                {patient.policyNumber && (
                  <p className="text-xs text-gray-400 truncate font-mono">
                    {patient.policyNumber}
                  </p>
                )}
              </div>
            </div>
            {patient.maidenName && (
              <div className="flex items-start gap-2.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-50">
                  <UserCircleIcon className="h-4 w-4 text-violet-600" />
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-gray-400">
                    Maiden Name
                  </p>
                  <p className="text-xs sm:text-sm font-semibold text-gray-800 truncate mt-0.5">
                    {patient.maidenName}
                  </p>
                </div>
              </div>
            )}
            <div className="flex items-start gap-2.5 sm:hidden">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-50">
                <ClockIcon className="h-4 w-4 text-amber-600" />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wider text-gray-400">
                  Registered
                </p>
                <p className="text-xs font-semibold text-gray-800 mt-0.5">
                  {formatDate(patient.createdAt)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Next of Kin accordion */}
        {hasNok && (
          <div className="border-t border-gray-100">
            <button
              onClick={() => setNokExpanded((v) => !v)}
              className="w-full flex items-center justify-between px-4 sm:px-6 py-2.5 sm:py-3 text-sm font-medium text-gray-600 hover:bg-gray-50 active:bg-gray-100 transition-colors"
            >
              <span>Next of Kin</span>
              {nokExpanded ? (
                <ChevronUpIcon className="h-4 w-4" />
              ) : (
                <ChevronDownIcon className="h-4 w-4" />
              )}
            </button>
            {nokExpanded && (
              <div className="px-4 sm:px-6 py-3 pb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 bg-gray-50/60">
                {(patient.nextOfKinFirstname || patient.nextOfKinLastname) && (
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-wider text-gray-400">
                      Name
                    </p>
                    <p className="text-xs sm:text-sm text-gray-800 mt-0.5">
                      {patient.nextOfKinFirstname} {patient.nextOfKinLastname}
                    </p>
                  </div>
                )}
                {patient.nextOfKinRelationship && (
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-wider text-gray-400">
                      Relationship
                    </p>
                    <p className="text-xs sm:text-sm text-gray-800 mt-0.5">
                      {patient.nextOfKinRelationship}
                    </p>
                  </div>
                )}
                {patient.nextOfKinPhone && (
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-wider text-gray-400">
                      Phone
                    </p>
                    <p className="text-xs sm:text-sm text-gray-800 mt-0.5">
                      {patient.nextOfKinPhone}
                    </p>
                  </div>
                )}
                {patient.nextOfKinEmail && (
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-wider text-gray-400">
                      Email
                    </p>
                    <p className="text-xs sm:text-sm text-gray-800 truncate mt-0.5">
                      {patient.nextOfKinEmail}
                    </p>
                  </div>
                )}
                {patient.nextOfKinAddress && (
                  <div className="col-span-2">
                    <p className="text-[11px] font-medium uppercase tracking-wider text-gray-400">
                      Address
                    </p>
                    <p className="text-xs sm:text-sm text-gray-800 mt-0.5">
                      {patient.nextOfKinAddress}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Stats ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3 sm:grid-cols-4">
        {[
          {
            icon: CalendarDaysIcon,
            label: "Completed Visits",
            value: stats.completedVisits,
            chip: "bg-blue-50 text-blue-600",
            accent: "border-t-blue-500",
            num: "text-blue-600",
          },
          {
            icon: BeakerIcon,
            label: "Tests Requested",
            value: stats.totalRequests,
            chip: "bg-violet-50 text-violet-600",
            accent: "border-t-violet-500",
            num: "text-violet-600",
          },
          {
            icon: CurrencyDollarIcon,
            label: "Paid Requests",
            value: stats.paidRequests,
            chip: "bg-emerald-50 text-emerald-600",
            accent: "border-t-emerald-500",
            num: "text-emerald-600",
          },
          {
            icon: DocumentCheckIcon,
            label: "Results Received",
            value: stats.resultsReceived,
            chip: "bg-amber-50 text-amber-600",
            accent: "border-t-amber-500",
            num: "text-amber-600",
          },
        ].map((s) => (
          <div
            key={s.label}
            className={`bg-white rounded-xl sm:rounded-2xl border border-gray-200 border-t-[3px] ${s.accent} p-3.5 sm:p-5`}
          >
            <div className="flex items-center justify-between">
              <p
                className={`text-2xl sm:text-3xl font-bold tracking-tight ${s.num}`}
              >
                {s.value}
              </p>
              <span
                className={`flex h-9 w-9 items-center justify-center rounded-lg ${s.chip}`}
              >
                <s.icon className="h-5 w-5" />
              </span>
            </div>
            <p className="text-xs sm:text-sm text-gray-500 mt-2">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── Tabs ───────────────────────────────────────────────────────── */}
      <div className="border-b border-gray-200">
        <nav
          className="-mb-px flex gap-1 overflow-x-auto"
          aria-label="History sections"
        >
          {tabs.map((tab) => {
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                aria-current={active ? "page" : undefined}
                className={`inline-flex shrink-0 items-center gap-2 border-b-2 px-3.5 sm:px-4 py-2.5 text-sm font-semibold transition-colors ${
                  active
                    ? "border-blue-600 text-blue-700"
                    : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                }`}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                      active
                        ? "bg-blue-50 text-blue-700"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* ── Tab: Visits ────────────────────────────────────────────────── */}
      {activeTab === "visits" &&
        (timeline.length === 0 ? (
          <EmptyState
            icon={CalendarDaysIcon}
            message="No appointment history found."
          />
        ) : (
          <>
            <div className="relative">
              <div className="absolute left-[5px] sm:left-[5.5px] top-5 bottom-5 w-px bg-gray-200" />
              <div className="space-y-4 sm:space-y-5">
                {pagedTimeline.map((entry) => (
                  <VisitCard key={entry.appointment.id} entry={entry} />
                ))}
              </div>
            </div>

            {timelinePageCount > 1 && (
              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={() => {
                    setTimelinePage((p) => Math.max(1, p - 1));
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  disabled={timelinePage === 1}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 active:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeftIcon className="h-4 w-4" />
                  Previous
                </button>
                <span className="text-xs sm:text-sm text-gray-500">
                  Page{" "}
                  <span className="font-semibold text-gray-800">
                    {timelinePage}
                  </span>{" "}
                  of{" "}
                  <span className="font-semibold text-gray-800">
                    {timelinePageCount}
                  </span>
                </span>
                <button
                  onClick={() => {
                    setTimelinePage((p) => Math.min(timelinePageCount, p + 1));
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  disabled={timelinePage === timelinePageCount}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 active:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                  <ChevronRightIcon className="h-4 w-4" />
                </button>
              </div>
            )}
          </>
        ))}

      {/* ── Tab: Test Results ──────────────────────────────────────────── */}
      {activeTab === "results" &&
        (allRequests.length === 0 ? (
          <EmptyState
            icon={BeakerIcon}
            message="No tests have been requested yet."
          />
        ) : (
          <div className="space-y-2">
            {allRequests.map((req) => (
              <RequestCard key={req.id} request={req} showDate />
            ))}
          </div>
        ))}

      {/* ── Tab: Prescriptions ─────────────────────────────────────────── */}
      {activeTab === "prescriptions" &&
        (allPrescriptions.length === 0 ? (
          <EmptyState
            icon={ClipboardDocumentListIcon}
            message="No medications have been prescribed yet."
          />
        ) : (
          <div className="space-y-2">
            {allPrescriptions.map((rx) => (
              <div
                key={rx.id}
                className="flex items-start justify-between gap-3 bg-white border border-gray-200 rounded-xl px-4 py-3"
              >
                <div className="flex items-start gap-2.5 min-w-0">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 mt-0.5">
                    <ClipboardDocumentListIcon className="h-4 w-4 text-slate-500" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {rx.productName ?? "—"}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">{rx.dosage}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {formatDate(rx.createdAt)}
                    </p>
                  </div>
                </div>
                <Pill kind={rx.status}>{capitalise(rx.status)}</Pill>
              </div>
            ))}
          </div>
        ))}

      {/* ── Tab: Privacy & My Data ─────────────────────────────────────── */}
      {activeTab === "privacy" && <PrivacyPanel history={data} />}

      {/* Bottom safe-area padding for mobile */}
      <div className="h-4 sm:h-0" />
    </div>
  );
}

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
} from "@heroicons/react/24/outline";
import { useState } from "react";
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

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatAge(dob: string): string {
  const today = new Date();
  const birth = new Date(dob);
  let years = today.getFullYear() - birth.getFullYear();
  let months = today.getMonth() - birth.getMonth();
  let days = today.getDate() - birth.getDate();
  if (days < 0) { months--; days += new Date(today.getFullYear(), today.getMonth(), 0).getDate(); }
  if (months < 0) { years--; months += 12; }
  if (years >= 1) return `${years} ${years === 1 ? "yr" : "yrs"} old`;
  if (months >= 1) return `${months} ${months === 1 ? "mo" : "mos"} old`;
  return `${days} ${days === 1 ? "day" : "days"} old`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
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

function getVisitTypeColor(visitType: string): string {
  switch (visitType.toLowerCase()) {
    case "new visit": case "first visit after discharge": return "bg-blue-100 text-blue-800 border-blue-300";
    case "follow up": return "bg-purple-100 text-purple-800 border-purple-300";
    case "review": return "bg-orange-100 text-orange-800 border-orange-300";
    case "drug refill": return "bg-teal-100 text-teal-800 border-teal-300";
    default: return "bg-gray-100 text-gray-700 border-gray-300";
  }
}

function getStatusColor(status: string): string {
  switch (status) {
    case "completed": return "bg-green-100 text-green-800 border-green-300";
    case "scheduled": return "bg-blue-100 text-blue-800 border-blue-300";
    case "cancelled": return "bg-red-100 text-red-800 border-red-300";
    case "no-show": return "bg-yellow-100 text-yellow-800 border-yellow-300";
    default: return "bg-gray-100 text-gray-700 border-gray-300";
  }
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
        {/* Mobile drag handle */}
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

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, color }: {
  icon: React.ElementType;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-200 shadow-sm p-3 sm:p-5 flex items-center gap-3 sm:gap-4">
      <div className={`p-2 sm:p-3 rounded-lg sm:rounded-xl shrink-0 ${color}`}>
        <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
      </div>
      <div className="min-w-0">
        <p className="text-xl sm:text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-xs sm:text-sm text-gray-500 leading-tight">{label}</p>
      </div>
    </div>
  );
}

// ─── Result Viewer Modal ──────────────────────────────────────────────────────

function ResultViewerModal({ result, onClose }: { result: ResultEntry; onClose: () => void }) {
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
        {/* Mobile drag handle */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden shrink-0">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-4 sm:px-5 py-3 sm:py-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <DocumentArrowDownIcon className="h-5 w-5 text-blue-500 shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{result.fileName}</p>
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
            <p className="text-sm text-blue-800 italic">&ldquo;{result.message}&rdquo;</p>
          </div>
        )}

        {/* File viewer */}
        <div className="flex-1 overflow-auto bg-gray-50 flex items-center justify-center min-h-0">
          {isImage ? (
            <img src={getBlobUrl(result.filePath)} alt={result.fileName} className="max-w-full max-h-full object-contain p-3 sm:p-4" />
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
              <p className="text-gray-500 text-sm">Preview not available for this file type.</p>
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
        className="w-full text-left bg-white border border-gray-200 rounded-xl p-3 space-y-2 hover:border-blue-300 hover:bg-blue-50/30 active:bg-blue-50/50 transition-colors group"
      >
        <div className="flex items-start gap-2.5">
          <DocumentArrowDownIcon className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-blue-600 group-hover:text-blue-800 truncate">{result.fileName}</p>
            {result.message && (
              <p className="text-xs text-gray-600 mt-0.5 italic truncate">&ldquo;{result.message}&rdquo;</p>
            )}
            <p className="text-xs text-gray-400 mt-1">{formatDateTime(result.createdAt)}</p>
          </div>
          <span className="text-xs text-blue-500 group-hover:text-blue-700 font-medium shrink-0 mt-0.5">View</span>
        </div>
        {isImage && (
          <img
            src={getBlobUrl(result.filePath)}
            alt={result.fileName}
            className="w-full max-h-32 object-contain rounded-lg border border-gray-100 mt-1 pointer-events-none"
          />
        )}
      </button>
      {viewing && <ResultViewerModal result={result} onClose={() => setViewing(false)} />}
    </>
  );
}

// ─── Request Card ─────────────────────────────────────────────────────────────

function RequestCard({ request }: { request: RequestEntry }) {
  const [expanded, setExpanded] = useState(false);
  const isPaid = request.paymentStatus === "paid";
  const hasResults = request.results.length > 0;

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <div className="bg-gray-50 px-3 sm:px-4 py-3">
        {/* Top row: test name + chevron */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2 min-w-0">
            <BeakerIcon className="h-4 w-4 text-gray-500 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{request.testName ?? "—"}</p>
              <p className="text-xs text-gray-500">{request.departmentName ?? "—"}</p>
            </div>
          </div>
          {hasResults && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="p-1 text-gray-400 hover:text-gray-600 shrink-0"
            >
              {expanded ? <ChevronUpIcon className="h-4 w-4" /> : <ChevronDownIcon className="h-4 w-4" />}
            </button>
          )}
        </div>

        {/* Bottom row: price + badges */}
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          {request.testPrice != null && (
            <span className="text-sm font-semibold text-gray-700">
              ₦{request.testPrice.toLocaleString()}
            </span>
          )}
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${
              isPaid
                ? "bg-green-100 text-green-800 border-green-300"
                : "bg-red-100 text-red-800 border-red-300"
            }`}
          >
            {isPaid ? "Paid" : "Not Paid"}
          </span>
          {hasResults && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-300">
              Result Sent
            </span>
          )}
        </div>
      </div>

      {expanded && hasResults && (
        <div className="p-3 space-y-2">
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
        <div className="absolute left-0 top-4 h-3 w-3 sm:h-3.5 sm:w-3.5 rounded-full border-2 border-blue-500 bg-white" />

        <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-200 shadow-sm overflow-hidden mb-1">
          {/* Card header */}
          <div className="px-3 sm:px-5 py-3 sm:py-4 border-b border-gray-100">
            {/* Badges row */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span
                className={`inline-flex items-center px-2 sm:px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getVisitTypeColor(appointment.visitType)}`}
              >
                {capitalise(appointment.visitType)}
              </span>
              <span
                className={`inline-flex items-center px-2 sm:px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getStatusColor(appointment.status)}`}
              >
                {capitalise(appointment.status)}
              </span>
            </div>

            {/* Date + doctor info */}
            <div className="mt-2 space-y-0.5">
              <div className="flex items-center gap-1.5 text-xs sm:text-sm text-gray-600">
                <CalendarDaysIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                <span>{formatDate(appointment.appointmentDate)} · {formatTime(appointment.appointmentTime)}</span>
              </div>
              <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600 flex-wrap">
                <span className="font-medium text-gray-800">{doctorName}</span>
                {visit && (
                  <span className="text-gray-400">{visit.durationMinutes} min</span>
                )}
              </div>
            </div>
          </div>

          <div className="px-3 sm:px-5 py-3 sm:py-4 space-y-3 sm:space-y-4">
            {/* Appointment notes */}
            {appointment.notes && (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
                  Appointment Notes
                </p>
                <p className="text-sm text-gray-600 italic">"{appointment.notes}"</p>
              </div>
            )}

            {/* Diagnoses — coded conditions are part of the patient's own record */}
            {visit?.diagnoses && visit.diagnoses.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                  Diagnoses
                </p>
                <ul className="space-y-1.5">
                  {visit.diagnoses.map((d, i) => (
                    <li
                      key={i}
                      className="flex items-center gap-2.5 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2"
                    >
                      {d.icdCode && (
                        <span className="shrink-0 rounded bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-700">
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
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
                  Consultation Notes
                </p>
                <button
                  onClick={() => setSensitiveModalOpen(true)}
                  className="flex items-center gap-2 w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700 hover:bg-amber-100 active:bg-amber-200 transition-colors"
                >
                  <LockClosedIcon className="h-4 w-4 shrink-0" />
                  <span className="font-medium text-left leading-tight">Consultation notes are restricted</span>
                  <span className="text-xs text-amber-400 ml-auto shrink-0 hidden sm:inline">Tap to learn more</span>
                </button>
              </div>
            )}

            {/* Requests */}
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                Lab Requests ({requests.length})
              </p>
              {requests.length === 0 ? (
                <p className="text-sm text-gray-400 italic">No requests raised in this visit.</p>
              ) : (
                <div className="space-y-2">
                  {requests.map((req) => (
                    <RequestCard key={req.id} request={req} />
                  ))}
                </div>
              )}
            </div>

            {/* Prescriptions */}
            {prescriptions && prescriptions.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                  Medications Prescribed ({prescriptions.length})
                </p>
                <div className="space-y-2">
                  {prescriptions.map((rx) => (
                    <div key={rx.id} className="flex items-start justify-between gap-3 px-3 py-2.5 rounded-lg bg-green-50 border border-green-100">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900">{rx.productName ?? "—"}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{rx.dosage}</p>
                      </div>
                      <span className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${
                        rx.status === "dispatched" ? "bg-green-100 text-green-800 border-green-300" :
                        rx.status === "cancelled" ? "bg-red-100 text-red-800 border-red-300" :
                        "bg-yellow-100 text-yellow-800 border-yellow-300"
                      }`}>
                        {rx.status.charAt(0).toUpperCase() + rx.status.slice(1)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {sensitiveModalOpen && <SensitiveDataModal onClose={() => setSensitiveModalOpen(false)} />}
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MyHistoryPage() {
  const { data, isLoading, error } = useSWR<PatientHistory>(
    "/api/my-history",
    fetcher,
  );

  const [nokExpanded, setNokExpanded] = useState(false);
  const [timelinePage, setTimelinePage] = useState(1);

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
          <p className="text-sm font-medium">Failed to load your history. Please try again.</p>
        </div>
      </div>
    );
  }

  const TIMELINE_PAGE_SIZE = 5;
  const { patient, stats, timeline, unlinkedRequests } = data;
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

  return (
    <div className="p-3 sm:p-6 max-w-5xl mx-auto space-y-4 sm:space-y-6">

      {/* ── Patient Header ─────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Gradient banner */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-500 px-4 sm:px-6 pt-5 pb-7 sm:pt-6 sm:pb-8" />

        <div className="px-4 sm:px-6 pb-4 sm:pb-6 -mt-5 sm:-mt-6">
          {/* Avatar + name row */}
          <div className="flex items-end gap-3 sm:gap-5">
            <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-xl sm:rounded-2xl bg-white border-4 border-white shadow-md flex items-center justify-center shrink-0">
              <span className="text-lg sm:text-2xl font-bold text-blue-600">
                {getInitials(patient.firstname, patient.lastname)}
              </span>
            </div>
            <div className="flex-1 min-w-0 pt-2">
              <h1 className="text-lg sm:text-2xl font-bold text-gray-900 truncate mt-4">{fullName}</h1>
              <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                {capitalise(patient.gender)} · {formatAge(patient.dob)}
              </p>
              <p className="text-xs text-gray-400 mt-0.5 sm:hidden">
                Registered {formatDate(patient.createdAt)}
              </p>
            </div>
            <div className="text-xs text-gray-400 shrink-0 hidden sm:block">
              Registered {formatDate(patient.createdAt)}
            </div>
          </div>

          {/* Details row */}
          <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-3 lg:grid-cols-4">
            <div className="flex items-start gap-2">
              <PhoneIcon className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-gray-400">Phone</p>
                <p className="text-xs sm:text-sm font-medium text-gray-800 truncate">
                  {patient.countryCode} {patient.phone}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <DocumentCheckIcon className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-gray-400">Insurance</p>
                <p className="text-xs sm:text-sm font-medium text-gray-800 truncate">{insuranceLabel}</p>
                {patient.policyNumber && (
                  <p className="text-xs text-gray-400 truncate">Policy: {patient.policyNumber}</p>
                )}
              </div>
            </div>
            {patient.maidenName && (
              <div className="flex items-start gap-2">
                <div className="min-w-0">
                  <p className="text-xs text-gray-400">Maiden Name</p>
                  <p className="text-xs sm:text-sm font-medium text-gray-800 truncate">{patient.maidenName}</p>
                </div>
              </div>
            )}
          </div>

          {/* Next of Kin accordion */}
          {hasNok && (
            <div className="mt-3 sm:mt-4 border border-gray-100 rounded-xl overflow-hidden">
              <button
                onClick={() => setNokExpanded((v) => !v)}
                className="w-full flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 bg-gray-50 text-sm font-medium text-gray-600 hover:bg-gray-100 active:bg-gray-200 transition-colors"
              >
                <span>Next of Kin</span>
                {nokExpanded ? <ChevronUpIcon className="h-4 w-4" /> : <ChevronDownIcon className="h-4 w-4" />}
              </button>
              {nokExpanded && (
                <div className="px-3 sm:px-4 py-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {(patient.nextOfKinFirstname || patient.nextOfKinLastname) && (
                    <div>
                      <p className="text-xs text-gray-400">Name</p>
                      <p className="text-xs sm:text-sm text-gray-800">
                        {patient.nextOfKinFirstname} {patient.nextOfKinLastname}
                      </p>
                    </div>
                  )}
                  {patient.nextOfKinRelationship && (
                    <div>
                      <p className="text-xs text-gray-400">Relationship</p>
                      <p className="text-xs sm:text-sm text-gray-800">{patient.nextOfKinRelationship}</p>
                    </div>
                  )}
                  {patient.nextOfKinPhone && (
                    <div>
                      <p className="text-xs text-gray-400">Phone</p>
                      <p className="text-xs sm:text-sm text-gray-800">{patient.nextOfKinPhone}</p>
                    </div>
                  )}
                  {patient.nextOfKinEmail && (
                    <div>
                      <p className="text-xs text-gray-400">Email</p>
                      <p className="text-xs sm:text-sm text-gray-800 truncate">{patient.nextOfKinEmail}</p>
                    </div>
                  )}
                  {patient.nextOfKinAddress && (
                    <div className="col-span-2">
                      <p className="text-xs text-gray-400">Address</p>
                      <p className="text-xs sm:text-sm text-gray-800">{patient.nextOfKinAddress}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Stats ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-2 sm:gap-4 sm:grid-cols-4">
        <StatCard icon={CalendarDaysIcon} label="Completed Visits"  value={stats.completedVisits}  color="bg-blue-50 text-blue-600" />
        <StatCard icon={BeakerIcon}        label="Lab Requests"       value={stats.totalRequests}    color="bg-purple-50 text-purple-600" />
        <StatCard icon={CurrencyDollarIcon} label="Paid Requests"     value={stats.paidRequests}     color="bg-green-50 text-green-600" />
        <StatCard icon={DocumentCheckIcon} label="Results Received"   value={stats.resultsReceived}  color="bg-orange-50 text-orange-600" />
      </div>

      {/* ── Visit Timeline ─────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <h2 className="text-base sm:text-lg font-bold text-gray-900">Visit History</h2>
          {timeline.length > 0 && (
            <span className="text-xs sm:text-sm text-gray-400">
              {timeline.length} visit{timeline.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        {timeline.length === 0 ? (
          <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-200 p-8 sm:p-12 text-center">
            <UserCircleIcon className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">No appointment history found.</p>
          </div>
        ) : (
          <>
            <div className="relative">
              {/* Vertical timeline line */}
              <div className="absolute left-1 sm:left-1.5 top-4 bottom-4 w-px bg-blue-200" />
              <div className="space-y-4 sm:space-y-6">
                {pagedTimeline.map((entry) => (
                  <VisitCard key={entry.appointment.id} entry={entry} />
                ))}
              </div>
            </div>

            {/* Pagination controls */}
            {timelinePageCount > 1 && (
              <div className="flex items-center justify-between mt-5 sm:mt-6 pt-4 border-t border-gray-100">
                <button
                  onClick={() => {
                    setTimelinePage((p) => Math.max(1, p - 1));
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  disabled={timelinePage === 1}
                  className="inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-2 text-xs sm:text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 active:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeftIcon className="h-4 w-4" />
                  Previous
                </button>
                <span className="text-xs sm:text-sm text-gray-500">
                  Page{" "}
                  <span className="font-semibold text-gray-800">{timelinePage}</span>
                  {" "}of{" "}
                  <span className="font-semibold text-gray-800">{timelinePageCount}</span>
                </span>
                <button
                  onClick={() => {
                    setTimelinePage((p) => Math.min(timelinePageCount, p + 1));
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  disabled={timelinePage === timelinePageCount}
                  className="inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-2 text-xs sm:text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 active:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                  <ChevronRightIcon className="h-4 w-4" />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Unlinked Requests ──────────────────────────────────────────── */}
      {unlinkedRequests.length > 0 && (
        <div>
          <h2 className="text-base sm:text-lg font-bold text-gray-900 mb-1">Other Requests</h2>
          <p className="text-xs sm:text-sm text-gray-500 mb-3 sm:mb-4">
            Requests raised outside of a tracked appointment.
          </p>
          <div className="space-y-2">
            {unlinkedRequests.map((req) => (
              <RequestCard key={req.id} request={req} />
            ))}
          </div>
        </div>
      )}

      {/* Bottom safe-area padding for mobile */}
      <div className="h-4 sm:h-0" />
    </div>
  );
}

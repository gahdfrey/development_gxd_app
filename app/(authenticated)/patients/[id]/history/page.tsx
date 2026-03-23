"use client";

import { use } from "react";
import Link from "next/link";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import {
  UserCircleIcon,
  PhoneIcon,
  CalendarDaysIcon,
  BeakerIcon,
  DocumentCheckIcon,
  CurrencyDollarIcon,
  ClipboardDocumentListIcon,
  ArrowLeftIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  DocumentArrowDownIcon,
  ArrowDownTrayIcon,
  XMarkIcon,
  ExclamationCircleIcon,
  ChatBubbleLeftEllipsisIcon,
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
    doctorNotes: string | null;
    startTime: string;
    endTime: string;
  } | null;
  requests: RequestEntry[];
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
  if (years >= 1) return `${years} ${years === 1 ? "year" : "years"} old`;
  if (months >= 1) return `${months} ${months === 1 ? "month" : "months"} old`;
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

// ─── Sub-components ──────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, color }: {
  icon: React.ElementType;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 flex items-center gap-4">
      <div className={`p-3 rounded-xl ${color}`}>
        <Icon className="h-6 w-6" />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-sm text-gray-500">{label}</p>
      </div>
    </div>
  );
}

// ─── Result Viewer Modal ─────────────────────────────────────────────────────

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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <DocumentArrowDownIcon className="h-5 w-5 text-blue-500 shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">
                {result.fileName}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                Uploaded by{" "}
                <span className="font-medium text-gray-600">
                  {result.uploadedByFirstname} {result.uploadedByLastname}
                </span>{" "}
                · {formatDateTime(result.createdAt)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <a
              href={getBlobUrl(result.filePath, true)}
              download={result.fileName}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <ArrowDownTrayIcon className="h-3.5 w-3.5" />
              Download
            </a>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Optional message */}
        {result.message && (
          <div className="px-5 py-3 bg-blue-50 border-b border-blue-100 flex items-start gap-2.5 shrink-0">
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
              className="max-w-full max-h-full object-contain p-4"
            />
          ) : isPdf ? (
            <iframe
              src={getBlobUrl(result.filePath)}
              title={result.fileName}
              className="w-full h-full min-h-[500px] border-0"
            />
          ) : (
            <div className="text-center p-12 space-y-4">
              <DocumentArrowDownIcon className="h-14 w-14 text-gray-300 mx-auto" />
              <p className="text-gray-500 text-sm">
                Preview not available for this file type.
              </p>
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
    </div>
  );
}

// ─── Result Card (clickable) ──────────────────────────────────────────────────

function ResultCard({ result }: { result: ResultEntry }) {
  const [viewing, setViewing] = useState(false);
  const isImage = isImageType(result.fileType);

  return (
    <>
      <button
        onClick={() => setViewing(true)}
        className="w-full text-left bg-white border border-gray-200 rounded-xl p-3 space-y-2 hover:border-blue-300 hover:bg-blue-50/30 transition-colors group"
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
              Uploaded by{" "}
              <span className="text-gray-600 font-medium">
                {result.uploadedByFirstname} {result.uploadedByLastname}
              </span>{" "}
              · {formatDateTime(result.createdAt)}
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

function RequestCard({ request }: { request: RequestEntry }) {
  const [expanded, setExpanded] = useState(false);
  const isPaid = request.paymentStatus === "paid";
  const hasResults = request.results.length > 0;

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <div className="bg-gray-50 px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <BeakerIcon className="h-4 w-4 text-gray-500 shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">
              {request.testName ?? "—"}
            </p>
            <p className="text-xs text-gray-500">{request.departmentName ?? "—"}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {request.testPrice != null && (
            <span className="text-sm font-medium text-gray-700">
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
          {hasResults && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="p-1 text-gray-400 hover:text-gray-600"
            >
              {expanded ? (
                <ChevronUpIcon className="h-4 w-4" />
              ) : (
                <ChevronDownIcon className="h-4 w-4" />
              )}
            </button>
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

function VisitCard({ entry }: { entry: TimelineEntry }) {
  const { appointment, visit, requests } = entry;
  const [notesExpanded, setNotesExpanded] = useState(false);

  const doctorName =
    appointment.doctorFirstname && appointment.doctorLastname
      ? `Dr. ${appointment.doctorFirstname} ${appointment.doctorLastname}`
      : "Unknown Doctor";

  return (
    <div className="relative pl-8">
      {/* Timeline dot */}
      <div className="absolute left-0 top-4 h-3.5 w-3.5 rounded-full border-2 border-blue-500 bg-white" />

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden mb-1">
        {/* Card header */}
        <div className="px-5 py-4 border-b border-gray-100 flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getVisitTypeColor(
                  appointment.visitType,
                )}`}
              >
                {capitalise(appointment.visitType)}
              </span>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getStatusColor(
                  appointment.status,
                )}`}
              >
                {capitalise(appointment.status)}
              </span>
            </div>
            <div className="mt-1.5 flex items-center gap-3 text-sm text-gray-600 flex-wrap">
              <span className="flex items-center gap-1">
                <CalendarDaysIcon className="h-4 w-4" />
                {formatDate(appointment.appointmentDate)} · {formatTime(appointment.appointmentTime)}
              </span>
              <span className="flex items-center gap-1 font-medium text-gray-800">
                {doctorName}
              </span>
              {visit && (
                <span className="text-gray-400">
                  {visit.durationMinutes} min consultation
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Appointment notes */}
          {appointment.notes && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
                Appointment Notes
              </p>
              <p className="text-sm text-gray-600 italic">"{appointment.notes}"</p>
            </div>
          )}

          {/* Doctor consultation notes */}
          {visit?.doctorNotes && (
            <div>
              <button
                className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide hover:text-gray-700 mb-1"
                onClick={() => setNotesExpanded((v) => !v)}
              >
                <ClipboardDocumentListIcon className="h-4 w-4" />
                Consultation Notes
                {notesExpanded ? (
                  <ChevronUpIcon className="h-3.5 w-3.5" />
                ) : (
                  <ChevronDownIcon className="h-3.5 w-3.5" />
                )}
              </button>
              {notesExpanded && (
                <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-sm text-gray-700 whitespace-pre-wrap">
                  {visit.doctorNotes}
                </div>
              )}
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
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PatientHistoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data, isLoading, error } = useSWR<PatientHistory>(
    `/api/patients/${id}/history`,
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
      <div className="p-6 max-w-4xl mx-auto">
        <div className="flex items-center gap-3 text-red-600 bg-red-50 border border-red-200 rounded-xl px-5 py-4">
          <ExclamationCircleIcon className="h-5 w-5 shrink-0" />
          <p className="text-sm font-medium">Failed to load patient history. Please try again.</p>
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
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Back navigation */}
      <Link
        href="/my-appointments"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
      >
        <ArrowLeftIcon className="h-4 w-4" />
        Back to My Appointments
      </Link>

      {/* ── Patient Header ─────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-blue-500 px-6 pt-6 pb-8" />
        <div className="px-6 pb-6 -mt-6">
          <div className="flex items-end gap-5 flex-wrap">
            {/* Avatar */}
            <div className="h-20 w-20 rounded-2xl bg-white border-4 border-white shadow-md flex items-center justify-center shrink-0">
              <span className="text-2xl font-bold text-blue-600">
                {getInitials(patient.firstname, patient.lastname)}
              </span>
            </div>
            <div className="flex-1 min-w-0 pt-2">
              <h1 className="text-2xl font-bold text-gray-900">{fullName}</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                {capitalise(patient.gender)} · {formatAge(patient.dob)} · DOB: {patient.dob}
              </p>
            </div>
            <div className="text-xs text-gray-400">
              Registered {formatDate(patient.createdAt)}
            </div>
          </div>

          {/* Details row */}
          <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            <div className="flex items-start gap-2.5">
              <PhoneIcon className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-gray-400">Phone</p>
                <p className="text-sm font-medium text-gray-800">
                  {patient.countryCode} {patient.phone}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <DocumentCheckIcon className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-gray-400">Insurance</p>
                <p className="text-sm font-medium text-gray-800">{insuranceLabel}</p>
                {patient.policyNumber && (
                  <p className="text-xs text-gray-400">Policy: {patient.policyNumber}</p>
                )}
              </div>
            </div>
            {patient.maidenName && (
              <div>
                <p className="text-xs text-gray-400">Maiden Name</p>
                <p className="text-sm font-medium text-gray-800">{patient.maidenName}</p>
              </div>
            )}
          </div>

          {/* Next of Kin accordion */}
          {hasNok && (
            <div className="mt-4 border border-gray-100 rounded-xl overflow-hidden">
              <button
                onClick={() => setNokExpanded((v) => !v)}
                className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <span>Next of Kin</span>
                {nokExpanded ? (
                  <ChevronUpIcon className="h-4 w-4" />
                ) : (
                  <ChevronDownIcon className="h-4 w-4" />
                )}
              </button>
              {nokExpanded && (
                <div className="px-4 py-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {(patient.nextOfKinFirstname || patient.nextOfKinLastname) && (
                    <div>
                      <p className="text-xs text-gray-400">Name</p>
                      <p className="text-sm text-gray-800">
                        {patient.nextOfKinFirstname} {patient.nextOfKinLastname}
                      </p>
                    </div>
                  )}
                  {patient.nextOfKinRelationship && (
                    <div>
                      <p className="text-xs text-gray-400">Relationship</p>
                      <p className="text-sm text-gray-800">{patient.nextOfKinRelationship}</p>
                    </div>
                  )}
                  {patient.nextOfKinPhone && (
                    <div>
                      <p className="text-xs text-gray-400">Phone</p>
                      <p className="text-sm text-gray-800">{patient.nextOfKinPhone}</p>
                    </div>
                  )}
                  {patient.nextOfKinEmail && (
                    <div>
                      <p className="text-xs text-gray-400">Email</p>
                      <p className="text-sm text-gray-800">{patient.nextOfKinEmail}</p>
                    </div>
                  )}
                  {patient.nextOfKinAddress && (
                    <div className="col-span-2">
                      <p className="text-xs text-gray-400">Address</p>
                      <p className="text-sm text-gray-800">{patient.nextOfKinAddress}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Stats ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          icon={CalendarDaysIcon}
          label="Completed Visits"
          value={stats.completedVisits}
          color="bg-blue-50 text-blue-600"
        />
        <StatCard
          icon={BeakerIcon}
          label="Lab Requests"
          value={stats.totalRequests}
          color="bg-purple-50 text-purple-600"
        />
        <StatCard
          icon={CurrencyDollarIcon}
          label="Paid Requests"
          value={stats.paidRequests}
          color="bg-green-50 text-green-600"
        />
        <StatCard
          icon={DocumentCheckIcon}
          label="Results Received"
          value={stats.resultsReceived}
          color="bg-orange-50 text-orange-600"
        />
      </div>

      {/* ── Visit Timeline ─────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">Visit History</h2>
          {timeline.length > 0 && (
            <span className="text-sm text-gray-400">
              {timeline.length} visit{timeline.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        {timeline.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
            <UserCircleIcon className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No appointment history found for this patient.</p>
          </div>
        ) : (
          <>
            <div className="relative">
              {/* Vertical timeline line */}
              <div className="absolute left-1.5 top-4 bottom-4 w-px bg-blue-200" />
              <div className="space-y-6">
                {pagedTimeline.map((entry) => (
                  <VisitCard key={entry.appointment.id} entry={entry} />
                ))}
              </div>
            </div>

            {/* Pagination controls */}
            {timelinePageCount > 1 && (
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100">
                <button
                  onClick={() => {
                    setTimelinePage((p) => Math.max(1, p - 1));
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  disabled={timelinePage === 1}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeftIcon className="h-4 w-4" />
                  Previous
                </button>
                <span className="text-sm text-gray-500">
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
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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
          <h2 className="text-lg font-bold text-gray-900 mb-1">Other Requests</h2>
          <p className="text-sm text-gray-500 mb-4">
            Requests raised outside of a tracked appointment.
          </p>
          <div className="space-y-2">
            {unlinkedRequests.map((req) => (
              <RequestCard key={req.id} request={req} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

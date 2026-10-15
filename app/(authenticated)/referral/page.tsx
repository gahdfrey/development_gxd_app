"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { createColumnHelper } from "@tanstack/react-table";
import { BanknotesIcon, EyeIcon, MagnifyingGlassIcon, UserGroupIcon, UsersIcon } from "@heroicons/react/24/outline";
import { fetcher } from "@/lib/fetcher";
import { ALL_TIME, withDateRange, type DateRange } from "@/lib/dateRange";
import Table from "@/app/components/ui/Table";
import DateRangeFilter from "../components/DateRangeFilter";
import { useCan } from "../components/vaccination/shared";
import ReferrerStatementModal from "./components/ReferrerStatementModal";
import { PAYMENT_PILL, formatDate, naira, type ReferredPatientRow, type ReferrerSummaryRow } from "./components/types";

type Tab = "patients" | "referrers";

const patientCol = createColumnHelper<ReferredPatientRow>();
const referrerCol = createColumnHelper<ReferrerSummaryRow>();

/**
 * Referral module: patients who were referred in (By patient) and the
 * referrers with what each is owed (By referrer → View → PDF statement).
 */
export default function ReferralPage() {
  const [tab, setTab] = useState<Tab>("patients");
  const [range, setRange] = useState<DateRange>(ALL_TIME);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [viewingReferrer, setViewingReferrer] = useState<number | null>(null);
  const can = useCan();

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const patientsKey = withDateRange(`/api/referrals/patients${search ? `?search=${encodeURIComponent(search)}` : ""}`, range);
  const { data: patientRows, error: patientsError } = useSWR<ReferredPatientRow[]>(tab === "patients" ? patientsKey : null, fetcher);
  // Always loaded: drives the summary cards on both tabs.
  const { data: referrerRows, error: referrersError } = useSWR<ReferrerSummaryRow[]>(
    withDateRange("/api/referrals/referrers", range),
    fetcher,
  );

  const filteredReferrers = useMemo(() => {
    if (!referrerRows) return undefined;
    const q = search.toLowerCase();
    if (!q) return referrerRows;
    return referrerRows.filter((r) =>
      [r.name, r.code, r.bank, r.accountNumber, r.whatsappNumber].some((v) => (v ?? "").toLowerCase().includes(q)),
    );
  }, [referrerRows, search]);

  const totals = useMemo(() => {
    const rows = referrerRows ?? [];
    return {
      referrers: rows.filter((r) => !r.deletedAt).length,
      patients: rows.reduce((s, r) => s + r.patientCount, 0),
      amount: rows.reduce((s, r) => s + r.totalAmount, 0),
      owed: rows.reduce((s, r) => s + r.amountOwed, 0),
      pending: rows.reduce((s, r) => s + r.pendingAmount, 0),
    };
  }, [referrerRows]);

  const patientColumns = useMemo(
    () => [
      patientCol.accessor((r) => `${r.firstname} ${r.lastname}`, {
        id: "patient",
        header: "Patient",
        cell: (info) => (
          <div>
            <Link href={`/patients/${info.row.original.patientId}/history`} className="font-semibold text-gray-900 hover:text-blue-700">
              {info.getValue()}
            </Link>
            <p className="text-xs text-gray-500">{info.row.original.mrn}</p>
          </div>
        ),
      }),
      patientCol.accessor("registeredAt", {
        header: "Registered",
        cell: (info) => <span className="text-gray-700">{formatDate(info.getValue())}</span>,
      }),
      patientCol.accessor("referrerName", {
        header: "Referred by",
        cell: (info) => (
          <div>
            <p className="text-gray-900">{info.getValue()}</p>
            <p className="font-mono text-xs text-blue-700">{info.row.original.referrerCode}</p>
          </div>
        ),
      }),
      patientCol.accessor("tests", {
        header: "Tests",
        cell: (info) => <span className="text-gray-700">{info.getValue()}</span>,
      }),
      patientCol.accessor("totalAmount", {
        header: "Amount",
        cell: (info) => <span className="font-medium text-gray-900">{naira(info.getValue())}</span>,
      }),
      patientCol.accessor("paidCount", {
        header: "Payment",
        cell: (info) => {
          const { paidCount, testCount } = info.row.original;
          const [key, label] =
            paidCount === testCount ? ["paid", "Paid"] : paidCount > 0 ? ["not_paid", `Part paid (${paidCount}/${testCount})`] : ["not_paid", "Not paid"];
          return (
            <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${PAYMENT_PILL[key]}`}>{label}</span>
          );
        },
      }),
      patientCol.accessor("amountOwed", {
        header: "Amount owed",
        cell: (info) => (
          <div>
            <p className="font-semibold text-blue-700">{naira(info.getValue())}</p>
            {info.row.original.pendingAmount > 0 && (
              <p className="text-xs text-amber-700">+{naira(info.row.original.pendingAmount)} pending payment</p>
            )}
          </div>
        ),
      }),
    ],
    [],
  );

  const referrerColumns = useMemo(
    () => [
      referrerCol.accessor("name", {
        header: "Referrer",
        cell: (info) => (
          <div>
            <p className="font-semibold text-gray-900">
              {info.getValue()}
              {info.row.original.deletedAt && (
                <span className="ml-2 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600">Deleted</span>
              )}
            </p>
            <p className="font-mono text-xs text-blue-700">{info.row.original.code}</p>
          </div>
        ),
      }),
      referrerCol.accessor("bank", {
        header: "Bank details",
        cell: (info) => (
          <div className="text-gray-700">
            <p>{info.getValue()}</p>
            <p className="font-mono text-xs text-gray-500">{info.row.original.accountNumber}</p>
          </div>
        ),
      }),
      referrerCol.accessor("whatsappNumber", {
        header: "WhatsApp",
        cell: (info) => <span className="text-gray-700">{info.getValue()}</span>,
      }),
      referrerCol.accessor("patientCount", {
        header: "Patients",
        cell: (info) => <span className="font-medium text-gray-900">{info.getValue()}</span>,
      }),
      referrerCol.accessor("totalAmount", {
        header: "Total amount",
        cell: (info) => <span className="text-gray-900">{naira(info.getValue())}</span>,
      }),
      referrerCol.accessor("amountOwed", {
        header: "Amount owed",
        cell: (info) => <span className="font-semibold text-blue-700">{naira(info.getValue())}</span>,
      }),
      referrerCol.accessor("pendingAmount", {
        header: "Pending payment",
        cell: (info) => <span className="text-amber-700">{naira(info.getValue())}</span>,
      }),
      referrerCol.display({
        id: "actions",
        header: "",
        cell: (props) => (
          <button
            onClick={() => setViewingReferrer(props.row.original.id)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
          >
            <EyeIcon className="h-4 w-4" /> View
          </button>
        ),
      }),
    ],
    [],
  );

  const loadError = tab === "patients" ? patientsError : referrersError;
  const rows = tab === "patients" ? patientRows : filteredReferrers;

  return (
    <div className="p-3 sm:p-6 max-w-7xl mx-auto space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Referral</h1>
          <p className="mt-1 text-sm text-gray-600">Referred patients, and what each referrer is owed. A referrer is only owed once the patient pays for the test.</p>
        </div>
        <DateRangeFilter value={range} onChange={setRange} />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SummaryCard icon={UserGroupIcon} color="bg-blue-600" label="Active referrers" value={String(totals.referrers)} />
        <SummaryCard icon={UsersIcon} color="bg-indigo-600" label="Referred patients" value={String(totals.patients)} />
        <SummaryCard icon={BanknotesIcon} color="bg-emerald-600" label="Total billed" value={naira(totals.amount)} />
        <SummaryCard
          icon={BanknotesIcon}
          color="bg-amber-500"
          label="Owed to referrers"
          value={naira(totals.owed)}
          hint={totals.pending > 0 ? `+${naira(totals.pending)} pending payment` : "From paid tests only"}
        />
      </div>

      <div className="flex flex-col gap-3 border-b border-gray-200 sm:flex-row sm:items-end sm:justify-between">
        <nav className="-mb-px flex gap-6">
          {([
            { key: "patients", label: "By patient" },
            { key: "referrers", label: "By referrer" },
          ] as const).map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                tab === t.key
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
        <div className="relative mb-3 w-full sm:max-w-xs">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={tab === "patients" ? "Search patient, MRN or referrer…" : "Search referrer…"}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {loadError ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
          Failed to load referrals. Please try again.
        </div>
      ) : !rows ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : rows.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-8 text-center text-gray-500">
          {tab === "patients"
            ? "No referred patients yet. Tick “Referred by” when registering a patient."
            : "No referrers yet. Add them in Setup → Organisation → Referrers."}
        </div>
      ) : tab === "patients" ? (
        <Table data={patientRows!} columns={patientColumns} />
      ) : (
        <Table data={filteredReferrers!} columns={referrerColumns} />
      )}

      <ReferrerStatementModal
        referrerId={viewingReferrer}
        initialRange={range}
        canDownload={can("referral", "print")}
        onClose={() => setViewingReferrer(null)}
      />
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  color,
  label,
  value,
  hint,
}: {
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className={`rounded-lg p-2.5 ${color}`}>
        <Icon className="h-5 w-5 text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
        <p className="truncate text-lg font-bold text-gray-900">{value}</p>
        {hint && <p className="truncate text-xs text-gray-500">{hint}</p>}
      </div>
    </div>
  );
}

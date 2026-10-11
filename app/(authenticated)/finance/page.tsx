"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import useSWR, { mutate as globalMutate } from "swr";
import { fetcher } from "@/lib/fetcher";
import RequestsTable, {
  type RequestRow,
} from "../components/requests/RequestsTable";
import {
  CheckCircleIcon,
  LockClosedIcon,
  MagnifyingGlassIcon,
  BeakerIcon,
  CurrencyDollarIcon,
  WalletIcon,
  BuildingOfficeIcon,
  TagIcon,
  ShieldCheckIcon,
  DocumentTextIcon,
  HomeModernIcon,
  BanknotesIcon,
} from "@heroicons/react/24/outline";
import BillingCell from "./components/BillingCell";
import SettleBillModal, { type DeskPayment } from "./components/SettleBillModal";
import ShiftsTab from "./components/ShiftsTab";
import { MyShiftCard, CURRENT_SHIFT_KEY } from "./components/MyShift";
import { DESK_CHANNELS } from "@/lib/billing/deskChannels";
import HmoBillingTab from "./components/HmoBillingTab";
import AuthorizationsTab from "./components/AuthorizationsTab";
import ClaimsTab from "./components/ClaimsTab";
import AdmissionBillsTab from "./components/AdmissionBillsTab";
import VaccinationBillsTab, { VACCINATION_BILLS_KEY } from "./components/VaccinationBillsTab";
import type { BillingSummary, SettleTarget } from "./components/billing";

interface PrescriptionRow {
  id: number;
  patientId: number;
  patientFirstname: string | null;
  patientLastname: string | null;
  patientDob: string | null;
  requestedByFirstname: string | null;
  requestedByLastname: string | null;
  productName: string | null;
  productPrice: number | null;
  paymentStatus: string;
  status: string;
  createdAt: string;
  billing?: BillingSummary | null;
}

function formatAge(dob: string): string {
  const today = new Date();
  const birth = new Date(dob);
  let years = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) years--;
  return `${years}y`;
}

interface PaymentRow {
  id: number;
  patientFirstname: string | null;
  patientLastname: string | null;
  amount: number;
  currency: string;
  status: string;
  method: string;
  channel: string | null;
  purpose: string;
  gatewayProvider: string | null;
  createdAt: string;
}

const TABS = [
  { key: "lab", label: "Lab Requests", icon: BeakerIcon },
  {
    key: "prescriptions",
    label: "Drug Prescriptions",
    icon: CurrencyDollarIcon,
  },
  { key: "inpatient", label: "Inpatient bills", icon: HomeModernIcon },
  { key: "vaccinations", label: "Vaccinations", icon: ShieldCheckIcon },
  { key: "payments", label: "Payments", icon: WalletIcon },
  { key: "shifts", label: "Shifts", icon: BanknotesIcon },
  { key: "authorizations", label: "Authorizations", icon: ShieldCheckIcon },
  { key: "claims", label: "Claims", icon: DocumentTextIcon },
  { key: "hmo", label: "HMO Billing", icon: BuildingOfficeIcon },
] as const;
type TabKey = (typeof TABS)[number]["key"];

const PURPOSE_LABEL: Record<string, string> = {
  bill: "Bill payment",
  wallet_topup: "Wallet top-up",
  subscription_charge: "Subscription charge",
};

const METHOD_LABEL: Record<string, string> = {
  gateway: "Card / Online",
  wallet: "Wallet",
  bank_transfer: "Bank Transfer",
  plan: "Plan Coverage",
  desk: "Desk",
};

export default function FinancePage() {
  const [activeTab, setActiveTab] = useState<TabKey>("lab");

  // ── Lab Requests ──────────────────────────────────────────────────────────
  const {
    data: requestsData,
    isLoading: reqLoading,
    mutate: mutatReqs,
  } = useSWR<RequestRow[]>("/api/requests?withBilling=1", fetcher);
  const [updatingReqId, setUpdatingReqId] = useState<number | null>(null);
  const [patientSearch, setPatientSearch] = useState("");
  const [doctorSearch, setDoctorSearch] = useState("");

  const filteredRequests = useMemo(() => {
    const rows = requestsData ?? [];
    const patient = patientSearch.trim().toLowerCase();
    const doctor = doctorSearch.trim().toLowerCase();
    return rows.filter((row) => {
      const patientName =
        `${row.patientFirstname ?? ""} ${row.patientLastname ?? ""}`.toLowerCase();
      const doctorName =
        `${row.requestedByFirstname ?? ""} ${row.requestedByLastname ?? ""}`.toLowerCase();
      return (
        (!patient || patientName.includes(patient)) &&
        (!doctor || doctorName.includes(doctor))
      );
    });
  }, [requestsData, patientSearch, doctorSearch]);

  // ── Prescriptions ─────────────────────────────────────────────────────────
  const {
    data: prescrData,
    isLoading: prescrLoading,
    mutate: mutatePrescrip,
  } = useSWR<PrescriptionRow[]>("/api/prescriptions?withBilling=1", fetcher);
  const [updatingPrescrId, setUpdatingPrescrId] = useState<number | null>(null);
  const [prescrSearch, setPrescrSearch] = useState("");

  const filteredPrescriptions = useMemo(() => {
    const rows = prescrData ?? [];
    const q = prescrSearch.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        `${r.patientFirstname ?? ""} ${r.patientLastname ?? ""}`
          .toLowerCase()
          .includes(q) ||
        `${r.requestedByFirstname ?? ""} ${r.requestedByLastname ?? ""}`
          .toLowerCase()
          .includes(q),
    );
  }, [prescrData, prescrSearch]);

  // ── Settling an item (both tabs) ────────────────────────────────────────
  // Opens SettleBillModal, which shows the HMO/patient split and captures
  // the HMO authorization code before the one-way "paid" flip.
  const [settleTarget, setSettleTarget] = useState<SettleTarget | null>(null);
  const [isSettling, setIsSettling] = useState(false);

  const handleSettle = async (authorizationCode: string, payment: DeskPayment) => {
    if (!settleTarget) return;
    const { itemType, itemId } = settleTarget;
    setIsSettling(true);
    if (itemType === "request") setUpdatingReqId(itemId);
    else setUpdatingPrescrId(itemId);
    try {
      const res = await fetch(
        `/api/${itemType === "request" ? "requests" : "prescriptions"}/${itemId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paymentStatus: "paid", authorizationCode, ...payment }),
        },
      );
      if (res.ok) {
        // Show the row as paid straight away, then re-fetch in the background.
        const markPaid = <T extends { id: number; paymentStatus: string }>(rows: T[] | undefined) =>
          rows?.map((r) => (r.id === itemId ? { ...r, paymentStatus: "paid" } : r));
        if (itemType === "request") mutatReqs(markPaid, { revalidate: true });
        else mutatePrescrip(markPaid, { revalidate: true });
        globalMutate(CURRENT_SHIFT_KEY);
        mutatePayments();
        setSettleTarget(null);
      } else {
        const body = await res.json();
        alert(body.error || "Failed to update payment status");
      }
    } catch {
      alert("Failed to update payment status");
    } finally {
      setIsSettling(false);
      setUpdatingReqId(null);
      setUpdatingPrescrId(null);
    }
  };

  // ── Payments (unified ledger: bills, wallet top-ups, subscription charges) ─
  const {
    data: paymentsData,
    isLoading: paymentsLoading,
    mutate: mutatePayments,
  } = useSWR<PaymentRow[]>("/api/payments", fetcher);
  const [confirmingPaymentId, setConfirmingPaymentId] = useState<number | null>(
    null,
  );
  const [updatingPaymentId, setUpdatingPaymentId] = useState<number | null>(
    null,
  );

  const handleConfirmBankTransfer = async (id: number) => {
    setUpdatingPaymentId(id);
    try {
      const res = await fetch(`/api/payments/${id}/confirm`, {
        method: "PATCH",
      });
      if (res.ok) mutatePayments();
      else {
        const body = await res.json();
        alert(body.error || "Failed to confirm payment");
      }
    } catch {
      alert("Failed to confirm payment");
    } finally {
      setUpdatingPaymentId(null);
      setConfirmingPaymentId(null);
    }
  };

  // Badge counts — unpaid items per tab
  const unpaidLabCount = (requestsData ?? []).filter(
    (r) => r.paymentStatus !== "paid",
  ).length;
  const unpaidPrescrCount = (prescrData ?? []).filter(
    (r) => r.paymentStatus !== "paid" && r.status !== "cancelled",
  ).length;
  const pendingPaymentsCount = (paymentsData ?? []).filter(
    (p) => p.status === "pending",
  ).length;
  // Same SWR key as the Authorizations tab's default view, so it's shared.
  const { data: pendingAuths } = useSWR<unknown[]>("/api/hmo-authorizations?status=pending", fetcher, {
    refreshInterval: 60_000,
  });
  // Same key as the tab's default (unpaid) view, so it's one request.
  const { data: vaccinationBills, mutate: mutateVaccinationBills } = useSWR<{ unpaidCourses: number }>(
    `${VACCINATION_BILLS_KEY}?status=unpaid`,
    fetcher,
  );
  const counts: Record<TabKey, number> = {
    lab: unpaidLabCount,
    prescriptions: unpaidPrescrCount,
    payments: pendingPaymentsCount,
    inpatient: 0,
    vaccinations: vaccinationBills?.unpaidCourses ?? 0,
    shifts: 0,
    authorizations: pendingAuths?.length ?? 0,
    claims: 0,
    hmo: 0,
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Finance</h1>
          <p className="text-gray-600 text-sm mt-1">
            Manage payment status for lab requests and drug prescriptions
          </p>
        </div>
        <Link
          href="/finance/price-lists"
          className="inline-flex items-center gap-2 self-start px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          <TagIcon className="h-4 w-4" />
          HMO Price Lists
        </Link>
      </div>

      <MyShiftCard onChanged={() => mutatePayments()} />

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-1 overflow-x-auto scrollbar-none">
          {TABS.map((t) => {
            const Icon = t.icon;
            const count = counts[t.key];
            const isActive = activeTab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                  isActive
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <Icon className="h-4 w-4" />
                {t.label}
                {count > 0 && (
                  <span
                    className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-semibold ${
                      isActive
                        ? "bg-blue-100 text-blue-700"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* ── Lab Requests Panel ── */}
      {activeTab === "lab" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search by patient name…"
                value={patientSearch}
                onChange={(e) => setPatientSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="relative flex-1">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search by doctor name…"
                value={doctorSearch}
                onChange={(e) => setDoctorSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          {reqLoading ? (
            <div className="flex justify-center items-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : (
            <RequestsTable
              data={filteredRequests}
              showPaymentToggle
              onSettle={(row) =>
                setSettleTarget({
                  itemType: "request",
                  itemId: row.id,
                  label: row.testName ?? "Lab test",
                  patientId: row.patientId,
                  patientName: `${row.patientFirstname ?? ""} ${row.patientLastname ?? ""}`.trim(),
                  basePrice: row.testPrice,
                  billing: row.billing ?? null,
                })
              }
              updatingId={updatingReqId}
            />
          )}
        </div>
      )}

      {/* ── Drug Prescriptions Panel ── */}
      {activeTab === "prescriptions" && (
        <div className="space-y-4">
          <div className="relative max-w-sm">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search patient or doctor…"
              value={prescrSearch}
              onChange={(e) => setPrescrSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {prescrLoading ? (
            <div className="flex justify-center items-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : filteredPrescriptions.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
              <p className="text-gray-500 text-sm">
                No drug prescriptions found.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      {[
                        "Patient",
                        "Age",
                        "Doctor",
                        "Drug",
                        "Price (₦)",
                        "Payment Status",
                        "Actions",
                      ].map((h) => (
                        <th
                          key={h}
                          className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredPrescriptions.map((row) => {
                      const isPaid = row.paymentStatus === "paid";
                      const isUpdating = updatingPrescrId === row.id;
                      return (
                        <tr
                          key={row.id}
                          className="hover:bg-gray-50/50 transition-colors"
                        >
                          <td className="px-5 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">
                            {row.patientFirstname} {row.patientLastname}
                          </td>
                          <td className="px-5 py-4 text-sm text-gray-600 whitespace-nowrap">
                            {row.patientDob ? formatAge(row.patientDob) : "—"}
                          </td>
                          <td className="px-5 py-4 text-sm text-gray-700 whitespace-nowrap">
                            Dr. {row.requestedByFirstname}{" "}
                            {row.requestedByLastname}
                          </td>
                          <td className="px-5 py-4 text-sm font-medium text-gray-800 whitespace-nowrap">
                            {row.productName ?? "—"}
                          </td>
                          {/* <td className="px-5 py-4 text-sm text-gray-600 max-w-[160px]">
                            <span className="line-clamp-2">{row.dosage}</span>
                          </td> */}
                          <td className="px-5 py-4 text-sm whitespace-nowrap">
                            <BillingCell basePrice={row.productPrice} billing={row.billing} />
                          </td>
                          <td className="px-5 py-4 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                                isPaid
                                  ? "bg-green-100 text-green-800 border border-green-300"
                                  : "bg-red-100 text-red-800 border border-red-300"
                              }`}
                            >
                              {isPaid ? "Paid" : "Not Paid"}
                            </span>
                          </td>
                          <td className="px-5 py-4 whitespace-nowrap">
                            {isPaid ? (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-green-700 bg-green-50 border border-green-200 rounded-lg cursor-default select-none">
                                <CheckCircleIcon className="h-3.5 w-3.5" />
                                Paid
                                <LockClosedIcon className="h-3 w-3 text-green-400 ml-0.5" />
                              </span>
                            ) : (
                              <button
                                onClick={() =>
                                  setSettleTarget({
                                    itemType: "prescription",
                                    itemId: row.id,
                                    label: row.productName ?? "Medication",
                                    patientId: row.patientId,
                  patientName: `${row.patientFirstname ?? ""} ${row.patientLastname ?? ""}`.trim(),
                                    basePrice: row.productPrice,
                                    billing: row.billing ?? null,
                                  })
                                }
                                disabled={isUpdating}
                                className="px-3 py-1.5 text-xs font-medium text-yellow-800 bg-yellow-50 border border-yellow-300 rounded-lg hover:bg-yellow-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                              >
                                {isUpdating ? "Updating..." : "Mark as Paid"}
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Payments Panel ── */}
      {activeTab === "payments" && (
        <div className="space-y-4">
          {paymentsLoading ? (
            <div className="flex justify-center items-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : !paymentsData || paymentsData.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
              <p className="text-gray-500 text-sm">No payments recorded yet.</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      {[
                        "Patient",
                        "Type",
                        "Method",
                        "Amount (₦)",
                        "Status",
                        "Date",
                        "Actions",
                      ].map((h) => (
                        <th
                          key={h}
                          className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {paymentsData.map((row) => {
                      const isPending = row.status === "pending";
                      const isBankTransfer = row.method === "bank_transfer";
                      const isConfirming = confirmingPaymentId === row.id;
                      const isUpdating = updatingPaymentId === row.id;
                      return (
                        <tr
                          key={row.id}
                          className="hover:bg-gray-50/50 transition-colors"
                        >
                          <td className="px-5 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">
                            {row.patientFirstname} {row.patientLastname}
                          </td>
                          <td className="px-5 py-4 text-sm text-gray-700 whitespace-nowrap">
                            {PURPOSE_LABEL[row.purpose] ?? row.purpose}
                          </td>
                          <td className="px-5 py-4 text-sm text-gray-600 whitespace-nowrap">
                            {METHOD_LABEL[row.method] ?? row.method}
                            {row.channel && ` · ${DESK_CHANNELS[row.channel as keyof typeof DESK_CHANNELS] ?? row.channel}`}
                          </td>
                          <td className="px-5 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">
                            ₦{row.amount.toLocaleString()}
                          </td>
                          <td className="px-5 py-4 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                                row.status === "success"
                                  ? "bg-green-100 text-green-800 border border-green-300"
                                  : row.status === "pending"
                                    ? "bg-yellow-100 text-yellow-800 border border-yellow-300"
                                    : "bg-red-100 text-red-800 border border-red-300"
                              }`}
                            >
                              {row.status === "success"
                                ? "Success"
                                : row.status === "pending"
                                  ? "Pending"
                                  : "Failed"}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-sm text-gray-500 whitespace-nowrap">
                            {new Date(row.createdAt).toLocaleDateString(
                              "en-GB",
                              {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              },
                            )}
                          </td>
                          <td className="px-5 py-4 whitespace-nowrap">
                            {isPending && isBankTransfer ? (
                              isConfirming ? (
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs text-gray-600 whitespace-nowrap">
                                    Received?
                                  </span>
                                  <button
                                    onClick={() =>
                                      handleConfirmBankTransfer(row.id)
                                    }
                                    disabled={isUpdating}
                                    className="px-2.5 py-1 text-xs font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50"
                                  >
                                    Yes
                                  </button>
                                  <button
                                    onClick={() => setConfirmingPaymentId(null)}
                                    disabled={isUpdating}
                                    className="px-2.5 py-1 text-xs font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                                  >
                                    No
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setConfirmingPaymentId(row.id)}
                                  disabled={isUpdating}
                                  className="px-3 py-1.5 text-xs font-medium text-yellow-800 bg-yellow-50 border border-yellow-300 rounded-lg hover:bg-yellow-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                  {isUpdating
                                    ? "Confirming..."
                                    : "Confirm Receipt"}
                                </button>
                              )
                            ) : row.status === "success" ? (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-green-700 bg-green-50 border border-green-200 rounded-lg cursor-default select-none">
                                <CheckCircleIcon className="h-3.5 w-3.5" />
                                Settled
                              </span>
                            ) : (
                              <span className="text-xs text-gray-400">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── HMO Billing Panel ── */}
      {activeTab === "inpatient" && <AdmissionBillsTab />}
      {activeTab === "vaccinations" && (
        <VaccinationBillsTab
          onChanged={() => {
            mutateVaccinationBills();
            mutatePayments();
          }}
        />
      )}
      {activeTab === "shifts" && <ShiftsTab />}
      {activeTab === "authorizations" && <AuthorizationsTab />}
      {activeTab === "claims" && <ClaimsTab />}
      {activeTab === "hmo" && <HmoBillingTab />}

      <SettleBillModal
        key={settleTarget ? `${settleTarget.itemType}:${settleTarget.itemId}` : "none"}
        target={settleTarget}
        isSubmitting={isSettling}
        onClose={() => setSettleTarget(null)}
        onConfirm={handleSettle}
        onEligibilityLogged={() => {
          mutatReqs();
          mutatePrescrip();
        }}
      />
    </div>
  );
}

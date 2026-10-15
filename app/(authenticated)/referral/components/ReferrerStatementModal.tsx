"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import { ArrowDownTrayIcon } from "@heroicons/react/24/outline";
import { fetcher } from "@/lib/fetcher";
import { withDateRange, type DateRange } from "@/lib/dateRange";
import { formatRefDiscount } from "@/lib/referrals";
import Modal from "@/app/components/ui/Modal";
import DateRangeFilter from "../../components/DateRangeFilter";
import { downloadStatementPdf } from "./statementPdf";
import { PAYMENT_LABEL, PAYMENT_PILL, formatDate, naira, type ReferrerStatement } from "./types";

interface ReferrerStatementModalProps {
  referrerId: number | null;
  initialRange: DateRange;
  canDownload: boolean;
  onClose: () => void;
}

/** "View" on the By referrer tab: every patient the referrer sent in, and what they're owed. */
export default function ReferrerStatementModal({ referrerId, initialRange, canDownload, onClose }: ReferrerStatementModalProps) {
  const [range, setRange] = useState<DateRange>(initialRange);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (referrerId) setRange(initialRange);
  }, [referrerId, initialRange]);

  const { data, error, isLoading } = useSWR<ReferrerStatement>(
    referrerId ? withDateRange(`/api/referrals/referrers/${referrerId}`, range) : null,
    fetcher,
  );

  const handleDownload = async () => {
    if (!data) return;
    setDownloading(true);
    try {
      await downloadStatementPdf(data, range);
    } finally {
      setDownloading(false);
    }
  };

  const r = data?.referrer;

  return (
    <Modal isOpen={!!referrerId} onClose={onClose} title="Referrer Statement" size="large">
      <div className="space-y-4">
        {error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">Failed to load the statement.</div>
        ) : !data || isLoading ? (
          <div className="flex justify-center items-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-lg font-bold text-gray-900">
                  {r!.name}{" "}
                  <span className="ml-1 rounded-md bg-blue-50 px-2 py-0.5 font-mono text-xs font-semibold text-blue-700 ring-1 ring-blue-200">
                    {r!.code}
                  </span>
                  {r!.deletedAt && (
                    <span className="ml-2 rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 ring-1 ring-gray-200">Deleted</span>
                  )}
                </p>
                <p className="mt-1 text-sm text-gray-600">
                  {r!.accountName} · <span className="font-mono">{r!.accountNumber}</span> · {r!.bank}
                </p>
                <p className="text-sm text-gray-600">WhatsApp: {r!.whatsappNumber}</p>
              </div>
              <div className="flex items-center gap-2">
                <DateRangeFilter value={range} onChange={setRange} />
                {canDownload && (
                  <button
                    onClick={handleDownload}
                    disabled={downloading}
                    className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    <ArrowDownTrayIcon className="h-4 w-4" />
                    {downloading ? "Preparing…" : "Download PDF"}
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              <Stat label="Patients referred" value={String(data.totals.patients)} />
              <Stat label="Tests paid" value={`${data.totals.paidTests} / ${data.totals.tests}`} />
              <Stat label="Total amount" value={naira(data.totals.amount)} />
              <Stat label="Pending payment" value={naira(data.totals.pendingAmount)} />
              <Stat label="Amount owed" value={naira(data.totals.amountOwed)} highlight />
            </div>
            <p className="text-xs text-gray-500">
              The referrer is owed the discount only on tests the patient has paid for. Unpaid tests become owed once paid; waived tests are never owed.
            </p>

            {data.lines.length === 0 ? (
              <div className="rounded-lg border border-gray-200 p-8 text-center text-sm text-gray-500">
                No referred patients in this period.
              </div>
            ) : (
              <div className="max-h-[50vh] overflow-auto rounded-lg border border-gray-200">
                <table className="min-w-full text-sm">
                  <thead className="sticky top-0 bg-gray-50">
                    <tr className="text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      <th className="px-3 py-2">Patient</th>
                      <th className="px-3 py-2">Date registered</th>
                      <th className="px-3 py-2">Test done</th>
                      <th className="px-3 py-2 text-right">Amount</th>
                      <th className="px-3 py-2">Payment</th>
                      <th className="px-3 py-2 text-right">Discount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {data.lines.map((l) => (
                      <tr key={l.id}>
                        <td className="px-3 py-2">
                          <p className="font-medium text-gray-900">{l.firstname} {l.lastname}</p>
                          <p className="text-xs text-gray-500">{l.mrn}</p>
                        </td>
                        <td className="px-3 py-2 text-gray-700">{formatDate(l.registeredAt)}</td>
                        <td className="px-3 py-2">
                          <p className="text-gray-900">{l.testName}</p>
                          <p className="text-xs text-gray-500">{l.departmentName}</p>
                        </td>
                        <td className="px-3 py-2 text-right text-gray-900">{naira(l.amount)}</td>
                        <td className="px-3 py-2">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${PAYMENT_PILL[l.paymentStatus ?? "not_paid"] ?? PAYMENT_PILL.not_paid}`}>
                            {PAYMENT_LABEL[l.paymentStatus ?? "not_paid"] ?? l.paymentStatus}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right">
                          <p className={`font-medium ${l.paymentStatus === "paid" ? "text-gray-900" : "text-gray-400 line-through"}`}>
                            {naira(l.discountAmount)}
                          </p>
                          <p className="text-xs text-gray-500">{formatRefDiscount(l.discountType, l.discountValue)}</p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="sticky bottom-0 bg-blue-50 font-semibold text-gray-900">
                    <tr>
                      <td className="px-3 py-2" colSpan={3}>Total · amount owed (paid tests)</td>
                      <td className="px-3 py-2 text-right">{naira(data.totals.amount)}</td>
                      <td />
                      <td className="px-3 py-2 text-right text-blue-700">{naira(data.totals.amountOwed)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}

function Stat({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-lg border p-3 ${highlight ? "border-blue-200 bg-blue-50" : "border-gray-200 bg-white"}`}>
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <p className={`mt-1 text-lg font-bold ${highlight ? "text-blue-700" : "text-gray-900"}`}>{value}</p>
    </div>
  );
}

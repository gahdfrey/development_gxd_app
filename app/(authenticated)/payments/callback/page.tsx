"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircleIcon, XCircleIcon, ArrowLeftIcon } from "@heroicons/react/24/outline";

type Status = "checking" | "success" | "failed";

/**
 * Where a real gateway (Paystack) redirects the patient back to after
 * hosted checkout. The mock gateway never navigates here — it verifies
 * inline from PendingPaymentTab instead.
 */
export default function PaymentCallbackPage() {
  const searchParams = useSearchParams();
  const reference = searchParams.get("reference");
  const [status, setStatus] = useState<Status>("checking");
  const [amount, setAmount] = useState<number | null>(null);

  useEffect(() => {
    if (!reference) {
      setStatus("failed");
      return;
    }
    fetch(`/api/payments/verify?reference=${encodeURIComponent(reference)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.status === "success") {
          setStatus("success");
          setAmount(data.amount ?? null);
        } else {
          setStatus("failed");
        }
      })
      .catch(() => setStatus("failed"));
  }, [reference]);

  return (
    <div className="p-6 max-w-md mx-auto">
      <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center space-y-4">
        {status === "checking" && (
          <>
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
            <p className="text-sm text-gray-500">Confirming your payment…</p>
          </>
        )}
        {status === "success" && (
          <>
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
              <CheckCircleIcon className="h-8 w-8 text-emerald-500" />
            </span>
            <h1 className="text-lg font-bold text-gray-900">Payment successful</h1>
            <p className="text-sm text-gray-500">
              {amount != null ? `₦${amount.toLocaleString()} received. ` : ""}
              Your record has been updated.
            </p>
          </>
        )}
        {status === "failed" && (
          <>
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
              <XCircleIcon className="h-8 w-8 text-red-500" />
            </span>
            <h1 className="text-lg font-bold text-gray-900">Payment not confirmed</h1>
            <p className="text-sm text-gray-500">
              We couldn't confirm this payment. If you were charged, it will
              be reconciled automatically — please check back shortly.
            </p>
          </>
        )}
        <Link
          href="/my-history"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-800"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Back to My History
        </Link>
      </div>
    </div>
  );
}

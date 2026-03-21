"use client";

import { useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import RequestsTable, { type RequestRow } from "../components/requests/RequestsTable";

export default function FinancePage() {
  const { data, isLoading, mutate } = useSWR<RequestRow[]>(
    "/api/requests",
    fetcher,
  );
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const handleMarkPaid = async (id: number) => {
    setUpdatingId(id);
    try {
      const res = await fetch(`/api/requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentStatus: "paid" }),
      });

      if (res.ok) {
        mutate();
      } else {
        const body = await res.json();
        alert(body.error || "Failed to update payment status");
      }
    } catch {
      alert("Failed to update payment status");
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Finance</h1>
        <p className="text-gray-600 text-sm mt-1">
          All lab requests — manage payment status
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : (
        <RequestsTable
          data={data ?? []}
          showPaymentToggle
          onMarkPaid={handleMarkPaid}
          updatingId={updatingId}
        />
      )}
    </div>
  );
}

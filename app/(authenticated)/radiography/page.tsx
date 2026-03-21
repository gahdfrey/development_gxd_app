"use client";

import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import RequestsTable, { type RequestRow } from "../components/requests/RequestsTable";

export default function RadiographyPage() {
  const { data, isLoading } = useSWR<RequestRow[]>(
    "/api/requests?department=radiography",
    fetcher,
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Radiography</h1>
        <p className="text-gray-600 text-sm mt-1">
          All requests assigned to the radiography department
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : (
        <RequestsTable data={data ?? []} />
      )}
    </div>
  );
}

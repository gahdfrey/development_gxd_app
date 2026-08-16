"use client";

import { useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import AdmissionsList from "./components/AdmissionsList";
import AdmissionRequestsList, { REQUESTS_KEY } from "./components/AdmissionRequestsList";
import WardsBedsTab from "./components/WardsBedsTab";
import type { AdmissionRecord } from "./components/types";

type ActiveTab = "requests" | "admissions" | "wards-beds";

const tabs: { key: ActiveTab; label: string }[] = [
  { key: "requests", label: "Requests" },
  { key: "admissions", label: "Admissions" },
  { key: "wards-beds", label: "Wards & Beds" },
];

export default function AdmissionPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("requests");

  // Same SWR key the requests tab uses, so this shares one request with it
  // rather than fetching the queue twice.
  const { data: pendingRequests } = useSWR<AdmissionRecord[]>(REQUESTS_KEY, fetcher);
  const pendingCount = pendingRequests?.length ?? 0;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Admission</h1>
        <p className="text-gray-600 text-sm mt-1">
          Review admission requests from doctors, admit, transfer, and discharge
          inpatients, and manage wards and beds
        </p>
      </div>

      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex gap-6">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 pb-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              {tab.label}
              {tab.key === "requests" && pendingCount > 0 && (
                <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full bg-blue-600 text-white text-xs font-semibold">
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === "requests" && <AdmissionRequestsList />}
      {activeTab === "admissions" && <AdmissionsList />}
      {activeTab === "wards-beds" && <WardsBedsTab />}
    </div>
  );
}

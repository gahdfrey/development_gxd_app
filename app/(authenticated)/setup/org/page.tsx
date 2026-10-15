"use client";

import { useState } from "react";
import DepartmentTab from "./components/DepartmentTab";
import TestTab from "./components/TestTab";
import ProductTab from "./components/ProductTab";
import BillingPlansTab from "./components/BillingPlansTab";
import DrugClassesTab from "./components/DrugClassesTab";
import MessagingTab from "./components/MessagingTab";
import ServiceItemsTab from "./components/ServiceItemsTab";
import VaccinesTab from "./components/VaccinesTab";
import ReferrersTab from "./components/ReferrersTab";

type ActiveTab = "department" | "test" | "product" | "services" | "vaccines" | "drug-classes" | "billing" | "messaging" | "referrers";

const tabs: { key: ActiveTab; label: string }[] = [
  { key: "department", label: "Department" },
  { key: "test", label: "Test" },
  { key: "product", label: "Products" },
  { key: "services", label: "Services" },
  { key: "vaccines", label: "Vaccines" },
  { key: "drug-classes", label: "Drug Families" },
  { key: "billing", label: "Billing Plans" },
  { key: "messaging", label: "Messaging" },
  { key: "referrers", label: "Referrers" },
];

export default function OrgSetupPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("department");

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Organisation Setup</h1>
        <p className="text-gray-600 text-sm mt-1">
          Manage departments, lab tests and products
        </p>
      </div>

      {/* Tab Bar */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex gap-6">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === "department" && <DepartmentTab />}
      {activeTab === "test" && <TestTab />}
      {activeTab === "product" && <ProductTab />}
      {activeTab === "services" && <ServiceItemsTab />}
      {activeTab === "vaccines" && <VaccinesTab />}
      {activeTab === "drug-classes" && <DrugClassesTab />}
      {activeTab === "billing" && <BillingPlansTab />}
      {activeTab === "messaging" && <MessagingTab />}
      {activeTab === "referrers" && <ReferrersTab />}
    </div>
  );
}

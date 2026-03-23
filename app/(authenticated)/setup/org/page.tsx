"use client";

import { useState } from "react";
import DepartmentTab from "./components/DepartmentTab";
import TestTab from "./components/TestTab";

type ActiveTab = "department" | "test";

const tabs: { key: ActiveTab; label: string }[] = [
  { key: "department", label: "Department" },
  { key: "test", label: "Test" },
];

export default function OrgSetupPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("department");

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Organisation Setup</h1>
        <p className="text-gray-600 text-sm mt-1">
          Manage departments and lab tests
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

      {activeTab === "department" ? <DepartmentTab /> : <TestTab />}
    </div>
  );
}

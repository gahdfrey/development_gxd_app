"use client";

import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import Link from "next/link";
import {
  UsersIcon,
  CalendarDaysIcon,
  ClipboardDocumentCheckIcon,
  BeakerIcon,
  BanknotesIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  ArrowTrendingUpIcon,
  ArrowRightIcon,
} from "@heroicons/react/24/outline";
import {
  ChartCard,
  DonutChart,
  AreaChart,
  BarChart,
  HBarList,
  PALETTE,
} from "./components/charts";

interface Slice {
  label: string;
  value: number;
  code?: string | null;
}

interface Analytics {
  totals: {
    patients: number;
    appointments: number;
    visits: number;
    requests: number;
    prescriptions: number;
    patientsThisMonth: number;
    apptsToday: number;
    revenue: number;
    pendingRequests: number;
    unpaidRequests: number;
    resultsReceived: number;
  };
  apptByStatus: { status: string; value: number }[];
  patientsByGender: { gender: string; value: number }[];
  patientsByInsurance: Slice[];
  requestsByDept: Slice[];
  rxByStatus: { status: string; value: number }[];
  topDiagnoses: Slice[];
  topMeds: Slice[];
  monthlyActivity: { month: string; appointments: number; patients: number }[];
  monthlyRevenue: { month: string; revenue: number }[];
  lowStock: { name: string; total_units: number; reorder_level: number }[];
}

const nairaShort = (v: number) =>
  v >= 1_000_000 ? `₦${(v / 1_000_000).toFixed(1)}M` : v >= 1000 ? `₦${(v / 1000).toFixed(0)}k` : `₦${v}`;

function StatTile({
  icon: Icon,
  label,
  value,
  accent,
  sub,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  accent: string;
  sub?: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5" style={{ borderTopColor: accent, borderTopWidth: 3 }}>
      <div className="flex items-center justify-between">
        <p className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">{value}</p>
        <span className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ background: `${accent}14`, color: accent }}>
          <Icon className="h-5 w-5" />
        </span>
      </div>
      <p className="mt-1.5 text-xs sm:text-sm text-gray-500">{label}</p>
      {sub && <p className="mt-0.5 text-xs font-medium" style={{ color: accent }}>{sub}</p>}
    </div>
  );
}

export default function DashboardPage() {
  const { data, isLoading, error } = useSWR<Analytics>("/api/analytics", fetcher);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-red-600">
          <ExclamationTriangleIcon className="h-5 w-5 shrink-0" />
          <p className="text-sm font-medium">
            Couldn&apos;t load analytics. You may not have dashboard access, or please try again.
          </p>
        </div>
      </div>
    );
  }

  const t = data.totals;
  const labels = data.monthlyActivity.map((m) => m.month);

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="text-sm text-gray-500 mt-1">Facility overview and reporting</p>
        </div>
        <Link
          href="/patients"
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Manage patients
          <ArrowRightIcon className="h-4 w-4" />
        </Link>
      </div>

      {/* KPI tiles */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile icon={UsersIcon} label="Total patients" value={t.patients.toLocaleString()} accent="#2563eb" sub={`+${t.patientsThisMonth} this month`} />
        <StatTile icon={CalendarDaysIcon} label="Appointments" value={t.appointments.toLocaleString()} accent="#7c3aed" sub={`${t.apptsToday} today`} />
        <StatTile icon={ClipboardDocumentCheckIcon} label="Consultations" value={t.visits.toLocaleString()} accent="#059669" />
        <StatTile icon={BanknotesIcon} label="Revenue collected" value={nairaShort(t.revenue)} accent="#d97706" />
      </div>

      {/* Operational alert row */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile icon={BeakerIcon} label="Test requests" value={t.requests.toLocaleString()} accent="#0891b2" />
        <StatTile icon={ClockIcon} label="Pending requests" value={t.pendingRequests.toLocaleString()} accent="#e11d48" />
        <StatTile icon={ExclamationTriangleIcon} label="Unpaid requests" value={t.unpaidRequests.toLocaleString()} accent="#e11d48" />
        <StatTile icon={ClipboardDocumentCheckIcon} label="Results received" value={t.resultsReceived.toLocaleString()} accent="#059669" />
      </div>

      {/* Trends */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Activity" subtitle="Appointments & new patients · last 6 months">
          <AreaChart
            labels={labels}
            series={[
              { name: "Appointments", color: "#2563eb", points: data.monthlyActivity.map((m) => m.appointments) },
              { name: "New patients", color: "#059669", points: data.monthlyActivity.map((m) => m.patients) },
            ]}
          />
        </ChartCard>
        <ChartCard title="Revenue" subtitle="Collected from paid tests & prescriptions · last 6 months">
          <BarChart
            data={data.monthlyRevenue.map((m) => ({ label: m.month, value: m.revenue }))}
            color="#d97706"
            formatValue={nairaShort}
          />
        </ChartCard>
      </div>

      {/* Breakdowns */}
      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCard title="Appointments by status">
          <DonutChart
            data={data.apptByStatus.map((s) => ({ label: s.status, value: s.value }))}
            colors={["#059669", "#2563eb", "#e11d48", "#d97706"]}
          />
        </ChartCard>
        <ChartCard title="Patients by gender">
          <DonutChart
            data={data.patientsByGender.map((s) => ({ label: s.gender, value: s.value }))}
            colors={["#2563eb", "#e11d48", "#64748b"]}
          />
        </ChartCard>
        <ChartCard title="Insurance mix">
          <DonutChart data={data.patientsByInsurance} colors={PALETTE} />
        </ChartCard>
      </div>

      {/* Clinical top-lists */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Top diagnoses" subtitle="Most recorded ICD-11 conditions">
          <HBarList data={data.topDiagnoses} color="#7c3aed" emptyText="No diagnoses recorded yet" />
        </ChartCard>
        <ChartCard title="Top medications" subtitle="Most prescribed products">
          <HBarList data={data.topMeds} color="#0891b2" emptyText="No prescriptions yet" />
        </ChartCard>
      </div>

      {/* Requests + prescriptions + low stock */}
      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCard title="Requests by department">
          <DonutChart data={data.requestsByDept} colors={["#2563eb", "#059669", "#d97706", "#7c3aed"]} />
        </ChartCard>
        <ChartCard title="Prescriptions by status">
          <DonutChart
            data={data.rxByStatus.map((s) => ({ label: s.status, value: s.value }))}
            colors={["#d97706", "#059669", "#e11d48"]}
          />
        </ChartCard>
        <ChartCard title="Low stock" subtitle="At or below reorder level">
          {data.lowStock.length === 0 ? (
            <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2.5 text-sm text-emerald-700">
              <ArrowTrendingUpIcon className="h-4 w-4" />
              All products above reorder level
            </div>
          ) : (
            <ul className="space-y-2">
              {data.lowStock.map((p, i) => (
                <li key={i} className="flex items-center justify-between gap-2 rounded-lg border border-red-100 bg-red-50/60 px-3 py-2">
                  <span className="truncate text-sm font-medium text-gray-800">{p.name}</span>
                  <span className="shrink-0 text-xs font-semibold text-red-600">
                    {p.total_units} / {p.reorder_level}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </ChartCard>
      </div>
    </div>
  );
}

"use client";

import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import DateRangeFilter from "../../components/DateRangeFilter";
import type { DateRange } from "@/lib/dateRange";

interface Department {
  id: number;
  name: string;
}

interface Props {
  range: DateRange;
  onRangeChange: (range: DateRange) => void;
  /** Department filter — only for roles that see every department. */
  showDepartment: boolean;
  departmentId: number | "";
  onDepartmentChange: (id: number | "") => void;
}

/** Supply orders: filter by the date an order was raised and (supply team) by department. */
export default function OrdersFilterBar({ range, onRangeChange, showDepartment, departmentId, onDepartmentChange }: Props) {
  const { data: departments = [] } = useSWR<Department[]>(showDepartment ? "/api/departments" : null, fetcher);
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      {showDepartment && (
        <select
          value={departmentId}
          onChange={(e) => onDepartmentChange(e.target.value ? Number(e.target.value) : "")}
          aria-label="Department"
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:w-56"
        >
          <option value="">All departments</option>
          {[...departments]
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
        </select>
      )}
      <DateRangeFilter value={range} onChange={onRangeChange} />
    </div>
  );
}

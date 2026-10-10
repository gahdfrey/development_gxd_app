"use client";

import { useState } from "react";
import { Popover, PopoverButton, PopoverPanel } from "@headlessui/react";
import {
  CalendarDaysIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  parse,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import {
  ALL_TIME,
  DATE_RANGE_PRESETS,
  customRange,
  formatDateRangeLabel,
  isRangeActive,
  resolvePreset,
  toDateString,
  type DateRange,
} from "@/lib/dateRange";

interface DateRangeFilterProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  /** Hide "All time" when an endpoint must always be bounded. */
  allowAllTime?: boolean;
  /** Disallow picking days after today (default true). */
  disableFuture?: boolean;
  className?: string;
}

/**
 * Preset + custom date-range picker. Controlled — pair with `useDateRange()`
 * and pass `apiUrl(...)`/`withDateRange(...)` to the request it should filter.
 */
export default function DateRangeFilter({
  value,
  onChange,
  allowAllTime = true,
  disableFuture = true,
  className = "",
}: DateRangeFilterProps) {
  const presets = allowAllTime
    ? DATE_RANGE_PRESETS
    : DATE_RANGE_PRESETS.filter((p) => p.value !== "all");
  const active = isRangeActive(value);
  const maxDate = disableFuture ? toDateString(new Date()) : undefined;

  return (
    <Popover className={`relative ${className}`}>
      {({ open, close }) => (
        <>
          <div className="flex items-center">
            <PopoverButton
              className={`inline-flex items-center gap-2 rounded-lg border bg-white px-3.5 py-2 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                active
                  ? "border-blue-200 text-blue-700 hover:bg-blue-50"
                  : "border-gray-200 text-gray-700 hover:bg-gray-50"
              } ${active && allowAllTime ? "rounded-r-none border-r-0" : ""}`}
            >
              <CalendarDaysIcon className="h-4 w-4" />
              <span className="whitespace-nowrap">{formatDateRangeLabel(value)}</span>
              <ChevronDownIcon
                className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
              />
            </PopoverButton>
            {active && allowAllTime && (
              <button
                type="button"
                onClick={() => onChange(ALL_TIME)}
                className="inline-flex items-center self-stretch rounded-r-lg border border-blue-200 bg-white px-2 text-blue-700 hover:bg-blue-50"
                aria-label="Clear date filter"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            )}
          </div>

          <PopoverPanel
            anchor={{ to: "bottom end", gap: 6 }}
            className="z-50 w-[min(48rem,calc(100vw-2rem))] rounded-xl border border-gray-200 bg-white shadow-lg focus:outline-none"
          >
            <div className="flex flex-col sm:flex-row">
              <ul className="grid grid-cols-2 gap-1 border-b border-gray-100 p-2 sm:w-44 sm:grid-cols-1 sm:border-b-0 sm:border-r">
                {presets.map((p) => {
                  const selected = value.preset === p.value;
                  return (
                    <li key={p.value}>
                      <button
                        type="button"
                        onClick={() => {
                          onChange(resolvePreset(p.value));
                          close();
                        }}
                        className={`w-full rounded-md px-3 py-1.5 text-left text-sm transition-colors ${
                          selected
                            ? "bg-blue-600 font-semibold text-white"
                            : "text-gray-700 hover:bg-gray-100"
                        }`}
                      >
                        {p.label}
                      </button>
                    </li>
                  );
                })}
              </ul>

              <CustomRangeForm
                value={value}
                maxDate={maxDate}
                onApply={(r) => {
                  onChange(r);
                  close();
                }}
              />
            </div>
          </PopoverPanel>
        </>
      )}
    </Popover>
  );
}

type Edge = "start" | "end";

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

/**
 * Two-click range calendar: first click sets From, second sets To (picking a
 * day before From restarts the range from there). The From/To chips switch
 * which end the next click edits.
 */
function CustomRangeForm({
  value,
  maxDate,
  onApply,
}: {
  value: DateRange;
  maxDate?: string;
  onApply: (range: DateRange) => void;
}) {
  // PopoverPanel unmounts when closed, so this re-seeds from `value` on each open.
  const [start, setStart] = useState(value.startDate);
  const [end, setEnd] = useState(value.endDate);
  const [editing, setEditing] = useState<Edge>(value.startDate && !value.endDate ? "end" : "start");
  const [hover, setHover] = useState<string>();
  // Left-hand month; the right-hand one (sm+) is the month after.
  const [viewMonth, setViewMonth] = useState(() => {
    const anchor = value.endDate ?? value.startDate;
    const base = anchor ? parse(anchor, "yyyy-MM-dd", new Date()) : new Date();
    return startOfMonth(subMonths(base, 1));
  });

  const pick = (day: string) => {
    if (editing === "start" || !start || day < start) {
      setStart(day);
      if (end && day > end) setEnd(undefined);
      setEditing("end");
    } else {
      setEnd(day);
      setEditing("start");
    }
  };

  // While choosing To, preview the range up to the hovered day.
  const previewEnd = editing === "end" && start && hover && hover >= start ? hover : end;
  const lo = start;
  const hi = previewEnd;

  const canApply = !!start || !!end;
  const chip = (edge: Edge, label: string, val?: string) => (
    <button
      type="button"
      onClick={() => setEditing(edge)}
      className={`flex-1 rounded-lg border px-3 py-1.5 text-left transition-colors ${
        editing === edge
          ? "border-blue-500 ring-1 ring-blue-500"
          : "border-gray-200 hover:border-gray-300"
      }`}
    >
      <span className="block text-[11px] font-medium uppercase tracking-wide text-gray-500">
        {label}
      </span>
      <span className={`block text-sm ${val ? "font-semibold text-gray-900" : "text-gray-400"}`}>
        {val ? format(parse(val, "yyyy-MM-dd", new Date()), "d MMM yyyy") : "Any date"}
      </span>
    </button>
  );

  return (
    <div className="flex-1 space-y-3 p-4">
      <div className="flex items-center gap-2">
        {chip("start", "From", start)}
        <span className="text-gray-300">→</span>
        {chip("end", "To", end)}
      </div>

      <div className="relative" onMouseLeave={() => setHover(undefined)}>
        <button
          type="button"
          onClick={() => setViewMonth((m) => subMonths(m, 1))}
          className="absolute left-0 top-0 rounded-md p-1 text-gray-500 hover:bg-gray-100"
          aria-label="Previous month"
        >
          <ChevronLeftIcon className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => setViewMonth((m) => addMonths(m, 1))}
          className="absolute right-0 top-0 rounded-md p-1 text-gray-500 hover:bg-gray-100"
          aria-label="Next month"
        >
          <ChevronRightIcon className="h-4 w-4" />
        </button>
        <div className="grid gap-6 sm:grid-cols-2">
          {[0, 1].map((offset) => (
            <MonthGrid
              key={offset}
              month={addMonths(viewMonth, offset)}
              className={offset === 0 ? "hidden sm:block" : ""}
              lo={lo}
              hi={hi}
              maxDate={maxDate}
              onPick={pick}
              onHover={setHover}
            />
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-gray-100 pt-3">
        <button
          type="button"
          onClick={() => {
            setStart(undefined);
            setEnd(undefined);
            setEditing("start");
          }}
          disabled={!canApply}
          className="text-sm font-medium text-gray-500 hover:text-gray-800 disabled:invisible"
        >
          Reset
        </button>
        <button
          type="button"
          disabled={!canApply}
          onClick={() => onApply(customRange(start, end))}
          className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400"
        >
          Apply
        </button>
      </div>
    </div>
  );
}

function MonthGrid({
  month,
  lo,
  hi,
  maxDate,
  onPick,
  onHover,
  className = "",
}: {
  month: Date;
  lo?: string;
  hi?: string;
  maxDate?: string;
  onPick: (day: string) => void;
  onHover: (day: string) => void;
  className?: string;
}) {
  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(month), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(month), { weekStartsOn: 1 }),
  });
  const today = toDateString(new Date());

  return (
    <div className={className}>
      <p className="mb-2 text-center text-sm font-semibold text-gray-900">
        {format(month, "MMMM yyyy")}
      </p>
      <div className="grid grid-cols-7 text-center text-[11px] font-medium text-gray-400">
        {WEEKDAYS.map((d) => (
          <span key={d} className="py-1">
            {d}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((d) => {
          const day = toDateString(d);
          if (!isSameMonth(d, month)) return <span key={day} className="h-9" />;

          const disabled = !!maxDate && day > maxDate;
          const isLo = day === lo;
          const isHi = day === hi;
          const inRange = !!lo && !!hi && day > lo && day < hi;
          const isEdge = isLo || isHi;
          // Band behind the range; rounded at the ends.
          const band =
            lo && hi && lo !== hi && (inRange || isEdge)
              ? `bg-blue-50 ${isLo ? "rounded-l-full" : ""} ${isHi ? "rounded-r-full" : ""}`
              : "";

          return (
            <div key={day} className={`flex h-9 items-center justify-center ${band}`}>
              <button
                type="button"
                disabled={disabled}
                onClick={() => onPick(day)}
                onMouseEnter={() => onHover(day)}
                className={`h-8 w-8 rounded-full text-sm transition-colors ${
                  isEdge
                    ? "bg-blue-600 font-semibold text-white"
                    : disabled
                      ? "cursor-not-allowed text-gray-300"
                      : inRange
                        ? "text-blue-800 hover:bg-blue-100"
                        : day === today
                          ? "font-semibold text-blue-600 hover:bg-gray-100"
                          : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                {d.getDate()}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

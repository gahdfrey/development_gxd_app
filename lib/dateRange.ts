import {
  format,
  isValid,
  parse,
  startOfMonth,
  endOfMonth,
  startOfYear,
  subDays,
  subMonths,
} from "date-fns";

/**
 * Shared date-range filter helpers (safe on client and server).
 *
 * A range travels to the API as `?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD`
 * (both inclusive, both optional) — the same param names the patients and
 * appointments routes already use. Use `withDateRange()` on the client to
 * build a URL and `parseDateRangeParams()` in a route handler to read it back;
 * `lib/dateRangeQuery.ts` turns the result into a Drizzle/SQL condition.
 */

export type DateRangePreset =
  | "all"
  | "today"
  | "yesterday"
  | "last7"
  | "last30"
  | "thisMonth"
  | "lastMonth"
  | "last3Months"
  | "thisYear"
  | "custom";

export interface DateRange {
  preset: DateRangePreset;
  /** YYYY-MM-DD, inclusive. Undefined = open-ended. */
  startDate?: string;
  /** YYYY-MM-DD, inclusive. Undefined = open-ended. */
  endDate?: string;
}

export const DATE_RANGE_PRESETS: { value: Exclude<DateRangePreset, "custom">; label: string }[] = [
  { value: "all", label: "All time" },
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "last7", label: "Last 7 days" },
  { value: "last30", label: "Last 30 days" },
  { value: "thisMonth", label: "This month" },
  { value: "lastMonth", label: "Last month" },
  { value: "last3Months", label: "Last 3 months" },
  { value: "thisYear", label: "This year" },
];

export const ALL_TIME: DateRange = { preset: "all" };

const DATE_FMT = "yyyy-MM-dd";
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export const toDateString = (d: Date) => format(d, DATE_FMT);

export function isDateString(value: string | null | undefined): value is string {
  if (!value || !DATE_RE.test(value)) return false;
  return isValid(parse(value, DATE_FMT, new Date()));
}

/** Resolve a preset to concrete dates relative to `now` (local time). */
export function resolvePreset(
  preset: Exclude<DateRangePreset, "custom">,
  now: Date = new Date(),
): DateRange {
  const range = (start?: Date, end?: Date): DateRange => ({
    preset,
    startDate: start ? toDateString(start) : undefined,
    endDate: end ? toDateString(end) : undefined,
  });

  switch (preset) {
    case "all":
      return range();
    case "today":
      return range(now, now);
    case "yesterday":
      return range(subDays(now, 1), subDays(now, 1));
    case "last7":
      return range(subDays(now, 6), now);
    case "last30":
      return range(subDays(now, 29), now);
    case "thisMonth":
      return range(startOfMonth(now), now);
    case "lastMonth": {
      const prev = subMonths(now, 1);
      return range(startOfMonth(prev), endOfMonth(prev));
    }
    case "last3Months":
      return range(startOfMonth(subMonths(now, 2)), now);
    case "thisYear":
      return range(startOfYear(now), now);
  }
}

/** Build a custom range, swapping the ends if they were picked backwards. */
export function customRange(startDate?: string, endDate?: string): DateRange {
  const s = isDateString(startDate) ? startDate : undefined;
  const e = isDateString(endDate) ? endDate : undefined;
  if (s && e && s > e) return { preset: "custom", startDate: e, endDate: s };
  return { preset: "custom", startDate: s, endDate: e };
}

export function isRangeActive(range: DateRange | null | undefined): boolean {
  return !!range && (!!range.startDate || !!range.endDate);
}

/** `{ startDate, endDate }` with empty ends dropped — spread into any params object. */
export function dateRangeToParams(range: DateRange | null | undefined): Record<string, string> {
  const params: Record<string, string> = {};
  if (range?.startDate) params.startDate = range.startDate;
  if (range?.endDate) params.endDate = range.endDate;
  return params;
}

/**
 * Append the range to a URL, keeping any query string it already has.
 * `withDateRange("/api/analytics", range)` → `/api/analytics?startDate=…&endDate=…`
 */
export function withDateRange(url: string, range: DateRange | null | undefined): string {
  const [path, query = ""] = url.split("?");
  const params = new URLSearchParams(query);
  params.delete("startDate");
  params.delete("endDate");
  for (const [k, v] of Object.entries(dateRangeToParams(range))) params.set(k, v);
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}

/** Human label for a range, e.g. "Last 7 days" or "3 Oct 2026 – 10 Oct 2026". */
export function formatDateRangeLabel(range: DateRange | null | undefined): string {
  if (!range) return "All time";
  if (range.preset !== "custom") {
    return DATE_RANGE_PRESETS.find((p) => p.value === range.preset)?.label ?? "All time";
  }
  const fmt = (s: string) => format(parse(s, DATE_FMT, new Date()), "d MMM yyyy");
  const { startDate: s, endDate: e } = range;
  if (s && e) return s === e ? fmt(s) : `${fmt(s)} – ${fmt(e)}`;
  if (s) return `From ${fmt(s)}`;
  if (e) return `Until ${fmt(e)}`;
  return "All time";
}

export interface ParsedDateRange {
  /** YYYY-MM-DD, inclusive. */
  startDate?: string;
  /** YYYY-MM-DD, inclusive. */
  endDate?: string;
}

/**
 * Read `startDate`/`endDate` from a request's search params.
 * Returns `range: null` when neither is set, or an `error` message when a
 * value is malformed / the range is backwards (respond 400 with it).
 */
export function parseDateRangeParams(
  searchParams: URLSearchParams,
): { range: ParsedDateRange | null; error?: string } {
  const start = searchParams.get("startDate") || undefined;
  const end = searchParams.get("endDate") || undefined;

  if (!start && !end) return { range: null };
  if (start && !isDateString(start)) return { range: null, error: "startDate must be YYYY-MM-DD" };
  if (end && !isDateString(end)) return { range: null, error: "endDate must be YYYY-MM-DD" };
  if (start && end && start > end) return { range: null, error: "startDate must be on or before endDate" };

  return { range: { startDate: start, endDate: end } };
}

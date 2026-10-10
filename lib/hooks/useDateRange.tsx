import { useCallback, useMemo, useState } from "react";
import {
  ALL_TIME,
  dateRangeToParams,
  resolvePreset,
  withDateRange,
  type DateRange,
  type DateRangePreset,
} from "../dateRange";

/**
 * State for a `<DateRangeFilter>`, plus helpers to attach it to API calls:
 *
 *   const { range, setRange, apiUrl } = useDateRange("last30");
 *   const { data } = useSWR(apiUrl("/api/analytics"), fetcher);
 *   <DateRangeFilter value={range} onChange={setRange} />
 */
export function useDateRange(initial: Exclude<DateRangePreset, "custom"> | DateRange = "all") {
  const [range, setRange] = useState<DateRange>(() =>
    typeof initial === "string" ? resolvePreset(initial) : initial,
  );

  const apiUrl = useCallback((url: string) => withDateRange(url, range), [range]);
  const params = useMemo(() => dateRangeToParams(range), [range]);
  const reset = useCallback(() => setRange(ALL_TIME), []);

  return { range, setRange, reset, apiUrl, params };
}

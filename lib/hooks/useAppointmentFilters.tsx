import { useState, useMemo } from "react";
import { getFilters } from "../utils/appointmentFilters";

interface FilterState {
  startDate: string;
  endDate: string;
  search: string;
}

interface UseAppointmentFiltersOptions {
  initialStartDate?: string;
  initialEndDate?: string;
  initialSearch?: string;
}

export function useAppointmentFilters(
  options: UseAppointmentFiltersOptions = {}
) {
  const [filterState, setFilterState] = useState<FilterState>({
    startDate: options.initialStartDate || "",
    endDate: options.initialEndDate || "",
    search: options.initialSearch || "",
  });

  const queryString = useMemo(() => {
    return getFilters(filterState, { withDate: true });
  }, [filterState]);

  const setFilters = (updates: Partial<FilterState>) => {
    setFilterState((prev) => ({ ...prev, ...updates }));
  };

  const resetFilters = () => {
    setFilterState({
      startDate: options.initialStartDate || "",
      endDate: options.initialEndDate || "",
      search: options.initialSearch || "",
    });
  };

  return {
    filterState,
    setFilters,
    resetFilters,
    queryString,
  };
}

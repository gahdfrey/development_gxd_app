import { useState, useMemo, useEffect } from "react";
import { getFilters } from "../utils/appointmentFilters";

interface FilterState {
  startDate: string;
  endDate: string;
  search: string;
}

export function usePatientFilters() {
  const [filterState, setFilterState] = useState<FilterState>({
    startDate: "",
    endDate: "",
    search: "",
  });

  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(filterState.search), 300);
    return () => clearTimeout(timer);
  }, [filterState.search]);

  const queryString = useMemo(() => {
    return getFilters(
      { ...filterState, search: debouncedSearch },
      { withDate: true },
    );
  }, [filterState.startDate, filterState.endDate, debouncedSearch]);

  const setFilters = (updates: Partial<FilterState>) => {
    setFilterState((prev) => ({ ...prev, ...updates }));
  };

  const resetFilters = () => {
    setFilterState({
      startDate: "",
      endDate: "",
      search: "",
    });
  };

  return {
    filterState,
    setFilters,
    resetFilters,
    queryString,
  };
}

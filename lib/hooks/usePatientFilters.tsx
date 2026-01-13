import { useState, useMemo } from "react";
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

  const queryString = useMemo(() => {
    return getFilters(filterState, { withDate: true });
  }, [filterState]);

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

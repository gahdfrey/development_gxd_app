interface FilterState {
  startDate?: string;
  endDate?: string;
  search?: string;
}

interface GetFiltersOptions {
  withDate?: boolean;
}

export function getFilters(
  filterState: FilterState,
  options: GetFiltersOptions = {}
): string {
  const params = new URLSearchParams();

  if (options.withDate) {
    if (filterState.startDate) {
      params.append("startDate", filterState.startDate);
    }
    if (filterState.endDate) {
      params.append("endDate", filterState.endDate);
    }
  }

  if (filterState.search && filterState.search.trim() !== "") {
    params.append("search", filterState.search);
  }

  const queryString = params.toString();
  return queryString ? `?${queryString}` : "";
}

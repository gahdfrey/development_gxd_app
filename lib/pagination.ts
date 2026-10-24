/**
 * Opt-in server-side pagination for list endpoints. A request with `?page=N`
 * gets one page back as `{ data, total, page, pageSize }`; without it the
 * endpoint keeps returning the plain array, so pickers and other callers that
 * need the whole list are unaffected.
 */
export const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

export interface PageParams {
  page: number;
  pageSize: number;
  offset: number;
}

export interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

/** Returns null when the request didn't ask for a page. */
export function getPageParams(searchParams: URLSearchParams): PageParams | null {
  const rawPage = searchParams.get("page");
  if (rawPage === null) return null;

  const page = Math.max(1, Number.parseInt(rawPage, 10) || 1);
  const requestedSize = Number.parseInt(searchParams.get("pageSize") ?? "", 10);
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, requestedSize || DEFAULT_PAGE_SIZE));
  return { page, pageSize, offset: (page - 1) * pageSize };
}

export function paginated<T>(data: T[], total: number, params: PageParams): Paginated<T> {
  return { data, total, page: params.page, pageSize: params.pageSize };
}

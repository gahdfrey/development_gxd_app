import { mutate } from "swr";

/**
 * Admitting, declining, transferring, or discharging changes several lists at
 * once — the requests queue, each status filter of the admissions list, and
 * bed availability. Revalidating by key prefix keeps every open tab honest
 * instead of only the one that fired the action.
 */
export function refreshAdmissions() {
  return mutate(
    (key) =>
      typeof key === "string" &&
      (key.startsWith("/api/admissions") || key.startsWith("/api/beds")),
    undefined,
    { revalidate: true },
  );
}

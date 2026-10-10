// Client-safe constants for desk payments and cashier shifts (no db imports).

/** How money is taken at the desk. Cash and POS are counted at close. */
export const DESK_CHANNELS = {
  cash: "Cash",
  pos: "POS",
  transfer: "Bank transfer",
} as const;
export type DeskChannel = keyof typeof DESK_CHANNELS;

export const isDeskChannel = (v: unknown): v is DeskChannel =>
  typeof v === "string" && Object.prototype.hasOwnProperty.call(DESK_CHANNELS, v);

export const SHIFT_STATUS_LABEL: Record<string, string> = {
  open: "Open",
  closed: "Balanced",
  pending_review: "Awaiting sign-off",
  reviewed: "Signed off",
};

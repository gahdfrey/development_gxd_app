/** Normalises a members list: lower-case, trimmed, de-duplicated. */
export function cleanMembers(v: unknown): string[] | null {
  const raw = Array.isArray(v) ? v : typeof v === "string" ? v.split(/[,\n]/) : null;
  if (!raw) return null;
  const list = [...new Set(raw.map((m) => String(m).trim().toLowerCase()).filter(Boolean))];
  return list.length > 0 ? list : null;
}


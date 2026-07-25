/**
 * drizzle-orm's postgres-js driver wraps the real Postgres error inside a
 * DrizzleQueryError — the actual error code (e.g. "23505" unique violation,
 * "23503" foreign key violation) lives at `error.cause.code`, not
 * `error.code`. Checking `error.code` directly never matches, so every
 * route doing that silently falls through to a generic 500 instead of its
 * intended friendly error message. Use this helper instead of accessing
 * either path directly.
 */
export function getPgErrorCode(error: unknown): string | undefined {
  if (!error || typeof error !== "object") return undefined;
  const err = error as { code?: unknown; cause?: { code?: unknown } };
  if (typeof err.cause?.code === "string") return err.cause.code;
  if (typeof err.code === "string") return err.code;
  return undefined;
}

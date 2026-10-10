import { sql, type AnyColumn, type SQL } from "drizzle-orm";
import type { ParsedDateRange } from "./dateRange";

/**
 * Server-side companions to `lib/dateRange.ts` — turn a parsed range into a
 * WHERE condition. Both ends are inclusive whole days.
 */

/**
 * Condition for a timestamp column. Returns `undefined` when there's no range,
 * so it can go straight into `and(...)` alongside other conditions:
 *
 *   and(eq(t.organisationId, orgId), dateRangeCondition(t.createdAt, range))
 *
 * For raw SQL pass `sql.raw("r.created_at")` as the column.
 */
export function dateRangeCondition(
  column: AnyColumn | SQL,
  range: ParsedDateRange | null | undefined,
): SQL | undefined {
  if (!range?.startDate && !range?.endDate) return undefined;
  const parts: SQL[] = [];
  if (range.startDate) parts.push(sql`${column} >= ${range.startDate}::date`);
  // `< end + 1 day` keeps the whole end day without fiddling with 23:59:59.
  if (range.endDate) parts.push(sql`${column} < (${range.endDate}::date + 1)`);
  return sql.join(parts, sql` AND `);
}

/**
 * Same as `dateRangeCondition` but for text columns that hold `YYYY-MM-DD`
 * (e.g. `appointments.appointment_date`), compared lexically.
 */
export function dateStringRangeCondition(
  column: AnyColumn | SQL,
  range: ParsedDateRange | null | undefined,
): SQL | undefined {
  if (!range?.startDate && !range?.endDate) return undefined;
  const parts: SQL[] = [];
  if (range.startDate) parts.push(sql`${column} >= ${range.startDate}`);
  if (range.endDate) parts.push(sql`${column} <= ${range.endDate}`);
  return sql.join(parts, sql` AND `);
}

/**
 * For raw `sql\`…\`` queries that already have a WHERE: yields
 * `AND <condition>` or nothing.
 *
 *   sql`SELECT … FROM requests r WHERE r.organisation_id = ${orgId} ${andDateRange("r.created_at", range)}`
 *
 * `column` is interpolated with `sql.raw`, so only pass trusted literals.
 */
export function andDateRange(column: string, range: ParsedDateRange | null | undefined): SQL {
  const cond = dateRangeCondition(sql.raw(column), range);
  return cond ? sql`AND ${cond}` : sql``;
}

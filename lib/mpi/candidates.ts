import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { normName, normPhone, scoreMatch, POSSIBLE_THRESHOLD, type MatchResult, type PersonLike } from "@/lib/mpi/match";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Executor = typeof db | Tx;

export interface CandidateRow extends PersonLike {
  id: number;
  mrn: string | null;
  countryCode: string | null;
  createdAt: string;
}

const PATIENT_COLS = sql.raw(`id, mrn, firstname, lastname, dob, gender, phone, country_code AS "countryCode", nin, created_at AS "createdAt"`);

/**
 * Existing patients who may be the same person as `person` (for the
 * registration check): cheap SQL pre-filter on NIN / phone / DOB / trigram
 * name similarity / any extra identifier, then scored in code.
 */
export async function findMatches(
  executor: Executor,
  orgId: number,
  person: PersonLike,
  opts: { excludeId?: number; limit?: number } = {},
): Promise<(CandidateRow & MatchResult)[]> {
  const ln = normName(person.lastname);
  const fn = normName(person.firstname);
  const phone = normPhone(person.phone);
  const rows = (await executor.execute(sql`
    SELECT ${PATIENT_COLS} FROM patients p
    WHERE p.organisation_id = ${orgId} AND p.deleted_at IS NULL
      ${opts.excludeId ? sql`AND p.id <> ${opts.excludeId}` : sql``}
      AND (
        (${person.nin ?? null}::text IS NOT NULL AND p.nin = ${person.nin ?? null})
        OR (${phone.length >= 10 ? phone : null}::text IS NOT NULL AND right(regexp_replace(p.phone, '\\D', '', 'g'), 10) = ${phone})
        OR (${person.dob ?? null}::text IS NOT NULL AND p.dob = ${person.dob ?? null})
        OR (${ln} <> '' AND similarity(lower(p.lastname), ${ln}) > 0.45)
        OR (${ln} <> '' AND similarity(lower(p.firstname), ${ln}) > 0.6)
        OR (${fn} <> '' AND similarity(lower(p.lastname), ${fn}) > 0.6)
        ${person.nin
          ? sql`OR EXISTS (
              SELECT 1 FROM patient_identifiers i
              WHERE i.patient_id = p.id AND i.deleted_at IS NULL AND i.value = ${person.nin}
            )`
          : sql``}
      )
    LIMIT 300
  `)) as unknown as CandidateRow[];

  return rows
    .map((r) => ({ ...r, ...scoreMatch(person, r) }))
    .filter((r) => r.score >= POSSIBLE_THRESHOLD)
    .sort((a, b) => b.score - a.score)
    .slice(0, opts.limit ?? 5);
}

/**
 * Likely duplicate pairs already in the org (for the review page). SQL
 * pre-filters pairs sharing a NIN or phone, or with similar names and a
 * matching birth date / year; scored in code; dismissed pairs are skipped.
 */
export async function findDuplicatePairs(executor: Executor, orgId: number, limit = 100) {
  const rows = (await executor.execute(sql`
    SELECT
      a.id AS a_id, a.mrn AS a_mrn, a.firstname AS a_firstname, a.lastname AS a_lastname, a.dob AS a_dob, a.gender AS a_gender,
      a.phone AS a_phone, a.country_code AS a_country_code, a.nin AS a_nin, a.created_at AS a_created_at,
      b.id AS b_id, b.mrn AS b_mrn, b.firstname AS b_firstname, b.lastname AS b_lastname, b.dob AS b_dob, b.gender AS b_gender,
      b.phone AS b_phone, b.country_code AS b_country_code, b.nin AS b_nin, b.created_at AS b_created_at
    FROM patients a
    JOIN patients b ON b.organisation_id = a.organisation_id AND b.id > a.id AND b.deleted_at IS NULL
    WHERE a.organisation_id = ${orgId} AND a.deleted_at IS NULL
      AND NOT EXISTS (SELECT 1 FROM patient_duplicate_dismissals d WHERE d.low_id = a.id AND d.high_id = b.id)
      AND (
        (a.nin IS NOT NULL AND a.nin = b.nin)
        OR (length(regexp_replace(a.phone, '\\D', '', 'g')) >= 10
            AND right(regexp_replace(a.phone, '\\D', '', 'g'), 10) = right(regexp_replace(b.phone, '\\D', '', 'g'), 10))
        OR (a.dob = b.dob AND similarity(lower(a.lastname), lower(b.lastname)) > 0.3)
        OR (left(a.dob, 4) = left(b.dob, 4)
            AND similarity(lower(a.firstname || ' ' || a.lastname), lower(b.firstname || ' ' || b.lastname)) > 0.5)
        OR (a.dob = b.dob AND similarity(lower(a.firstname || ' ' || a.lastname), lower(b.lastname || ' ' || b.firstname)) > 0.6)
      )
    LIMIT 3000
  `)) as unknown as Record<string, string | number | null>[];

  const side = (r: Record<string, string | number | null>, p: "a" | "b"): CandidateRow => ({
    id: Number(r[`${p}_id`]),
    mrn: r[`${p}_mrn`] as string | null,
    firstname: r[`${p}_firstname`] as string | null,
    lastname: r[`${p}_lastname`] as string | null,
    dob: r[`${p}_dob`] as string | null,
    gender: r[`${p}_gender`] as string | null,
    phone: r[`${p}_phone`] as string | null,
    countryCode: r[`${p}_country_code`] as string | null,
    nin: r[`${p}_nin`] as string | null,
    createdAt: String(r[`${p}_created_at`]),
  });

  return rows
    .map((r) => {
      const a = side(r, "a");
      const b = side(r, "b");
      return { a, b, ...scoreMatch(a, b) };
    })
    .filter((p) => p.score >= POSSIBLE_THRESHOLD)
    .sort((x, y) => y.score - x.score)
    .slice(0, limit);
}

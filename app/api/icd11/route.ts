import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { icd11Codes } from "@/lib/db/schema";
import { sql, or, ilike } from "drizzle-orm";
import { auth } from "@/auth";

/**
 * GET /api/icd11?q=<term> — search the ICD-11 reference for the diagnosis
 * picker. Matches on code prefix (e.g. "1A00", "BA00") or title text.
 * Leaf (codeable) entries rank first; trigram similarity orders the rest.
 *
 * Auth note: this is non-sensitive, read-only reference data queried on
 * every keystroke of the picker, so we use a session-only check (JWT decode,
 * no DB round-trip) instead of the heavier requireAuth() context lookup.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const q = (new URL(request.url).searchParams.get("q") || "").trim();
    if (q.length < 2) {
      return NextResponse.json([]);
    }

    const term = `%${q}%`;
    const looksLikeCode = /^[0-9A-Za-z]/.test(q) && /\d/.test(q);

    const rows = await db
      .select({
        code: icd11Codes.code,
        title: icd11Codes.title,
        chapter: icd11Codes.chapter,
        isLeaf: icd11Codes.isLeaf,
      })
      .from(icd11Codes)
      .where(
        or(
          ilike(icd11Codes.code, looksLikeCode ? `${q}%` : term),
          ilike(icd11Codes.title, term),
        ),
      )
      // Codeable (leaf) entries first, then closest title match.
      .orderBy(
        sql`${icd11Codes.isLeaf} DESC`,
        sql`similarity(${icd11Codes.title}, ${q}) DESC`,
        icd11Codes.code,
      )
      .limit(25);

    // Reference data is immutable per release — let the browser cache
    // repeated queries so backspacing/retyping feels instant.
    return NextResponse.json(rows, {
      headers: { "Cache-Control": "private, max-age=3600" },
    });
  } catch (error) {
    console.error("Error searching ICD-11:", error);
    return NextResponse.json({ error: "Failed to search ICD-11 codes" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";

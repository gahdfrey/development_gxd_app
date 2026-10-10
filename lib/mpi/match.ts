/**
 * Probabilistic patient matching (master patient index). Scores how likely
 * two records are the same person from NIN, phone, date of birth, names
 * and sex. Names are compared with Jaro–Winkler similarity plus a
 * sound-alike key tuned for spelling variants common in Nigeria
 * (Mohammed / Muhammad / Mohammad, Chukwuemeka / Chukuemeka, Oluwaseun /
 * Oluwaseyi are NOT merged by the key — only true spelling variants).
 * Pure functions; no database access.
 */

export interface PersonLike {
  firstname: string | null;
  lastname: string | null;
  dob: string | null; // YYYY-MM-DD
  gender: string | null;
  phone: string | null;
  nin: string | null;
}

export interface MatchResult {
  score: number; // 0–100
  level: "definite" | "likely" | "possible" | "unlikely";
  reasons: string[];
}

export const LIKELY_THRESHOLD = 70;
export const POSSIBLE_THRESHOLD = 50;

/** Lower-case letters only. */
export function normName(s: string | null | undefined): string {
  return (s ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z]/g, "");
}

/** Last 10 digits (strips country code / leading 0). */
export function normPhone(s: string | null | undefined): string {
  const d = (s ?? "").replace(/\D/g, "");
  return d.length >= 10 ? d.slice(-10) : d;
}

/** Sound-alike key: canonical spellings, digraphs simplified, vowels after
 * the first letter dropped, repeated letters collapsed. */
export function soundKey(name: string | null | undefined): string {
  let s = normName(name);
  if (!s) return "";
  if (/^m[uo]h+am+[ae]d$/.test(s) || /^m[uo]ham+[ae]d$/.test(s)) s = "muhammad";
  s = s.replace(/ph/g, "f").replace(/kh/g, "k").replace(/gh/g, "g").replace(/ck/g, "k").replace(/ou/g, "u").replace(/w(?=[aeiou])/g, "w");
  const first = s[0];
  const rest = s.slice(1).replace(/[aeiouy]/g, "");
  return (first + rest).replace(/(.)\1+/g, "$1");
}

/** Jaro–Winkler similarity in [0, 1]. */
export function jaroWinkler(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 1;
  const range = Math.max(0, Math.floor(Math.max(a.length, b.length) / 2) - 1);
  const aMatch = new Array(a.length).fill(false);
  const bMatch = new Array(b.length).fill(false);
  let matches = 0;
  for (let i = 0; i < a.length; i++) {
    const lo = Math.max(0, i - range);
    const hi = Math.min(b.length - 1, i + range);
    for (let j = lo; j <= hi; j++) {
      if (bMatch[j] || a[i] !== b[j]) continue;
      aMatch[i] = bMatch[j] = true;
      matches++;
      break;
    }
  }
  if (matches === 0) return 0;
  let t = 0;
  let k = 0;
  for (let i = 0; i < a.length; i++) {
    if (!aMatch[i]) continue;
    while (!bMatch[k]) k++;
    if (a[i] !== b[k]) t++;
    k++;
  }
  const jaro = (matches / a.length + matches / b.length + (matches - t / 2) / matches) / 3;
  let prefix = 0;
  while (prefix < 4 && a[prefix] && a[prefix] === b[prefix]) prefix++;
  return jaro + prefix * 0.1 * (1 - jaro);
}

/** How alike two names are: 1 exact, else Jaro–Winkler, boosted to 0.95
 * when they share a sound-alike key. */
export function nameSimilarity(a: string | null, b: string | null): number {
  const x = normName(a);
  const y = normName(b);
  if (!x || !y) return 0;
  if (x === y) return 1;
  const jw = jaroWinkler(x, y);
  return soundKey(x) === soundKey(y) ? Math.max(jw, 0.95) : jw;
}

function dobRelation(a: string | null, b: string | null): "same" | "transposed" | "same_year" | "different" | "unknown" {
  if (!a || !b) return "unknown";
  if (a === b) return "same";
  const [ya, ma, da] = a.split("-");
  const [yb, mb, db] = b.split("-");
  if (ya === yb && ma === db && da === mb) return "transposed";
  if (ya === yb) return "same_year";
  return "different";
}

/** Score two patient records (0–100) with human-readable reasons. */
export function scoreMatch(a: PersonLike, b: PersonLike): MatchResult {
  const reasons: string[] = [];
  let score = 0;

  if (a.nin && b.nin) {
    if (a.nin === b.nin) {
      return { score: 100, level: "definite", reasons: ["Same NIN"] };
    }
    score -= 40;
    reasons.push("Different NINs");
  }

  const pa = normPhone(a.phone);
  const pb = normPhone(b.phone);
  if (pa.length >= 10 && pa === pb) {
    score += 25;
    reasons.push("Same phone number");
  }

  const dob = dobRelation(a.dob, b.dob);
  if (dob === "same") {
    score += 30;
    reasons.push("Same date of birth");
  } else if (dob === "transposed") {
    score += 15;
    reasons.push("Date of birth with day/month swapped");
  } else if (dob === "same_year") {
    score += 5;
  } else if (dob === "different") {
    score -= 10;
  }

  const last = nameSimilarity(a.lastname, b.lastname);
  const first = nameSimilarity(a.firstname, b.firstname);
  const swapped = Math.min(nameSimilarity(a.firstname, b.lastname), nameSimilarity(a.lastname, b.firstname));
  if (swapped >= 0.92 && swapped > Math.min(first, last)) {
    score += 40;
    reasons.push("Same names with first and last swapped");
  } else {
    if (last >= 0.92) {
      score += 20;
      reasons.push(last === 1 ? "Same surname" : "Surname spelled similarly");
    } else if (last >= 0.85) {
      score += 10;
      reasons.push("Surname partly matches");
    }
    if (first >= 0.92) {
      score += 15;
      reasons.push(first === 1 ? "Same first name" : "First name spelled similarly");
    } else if (first >= 0.85) {
      score += 8;
      reasons.push("First name partly matches");
    } else if (last >= 0.92 && first < 0.7 && normName(a.firstname) && normName(b.firstname)) {
      // Same family, clearly different first names — siblings / twins.
      score -= 15;
      reasons.push("Different first names (relative?)");
    }
    // Full name and date of birth together are strong evidence.
    if (last >= 0.92 && first >= 0.92 && dob === "same") score += 10;
  }

  const ga = a.gender?.toLowerCase();
  const gb = b.gender?.toLowerCase();
  if (ga && gb && ga !== gb) {
    score -= 20;
    reasons.push("Different sex");
  }

  score = Math.max(0, Math.min(99, score));
  const level = score >= LIKELY_THRESHOLD ? "likely" : score >= POSSIBLE_THRESHOLD ? "possible" : "unlikely";
  return { score, level, reasons };
}

import { COVERAGE } from "@/lib/coverage";

const FILLER = new Set([
  "population",
  "populations",
  "pop",
  "people",
  "persons",
  "person",
  "of",
  "the",
  "in",
  "for",
  "year",
  "yr",
  "during",
  "around",
  "circa",
  "total",
  "how",
  "many",
  "what",
  "is",
  "was",
  "were",
  "about",
  "please",
  "show",
  "get",
  "find",
  "number",
  "a",
  "an",
]);

const NOW_WORDS = new Set(["now", "today", "current", "present", "latest"]);

const YEAR_PATTERN = /\b(?:1[7-9]\d{2}|2[0-2]\d{2})\b/g;

export type ParsedQuery = {
  raw: string;
  locationText: string;
  year: number | null;
  mode: "year" | "latest" | "needs_year" | "invalid";
  message: string | null;
};

function keepToken(token: string): boolean {
  const lower = token.toLowerCase();
  if (NOW_WORDS.has(lower)) return false;
  if (!FILLER.has(lower)) return true;
  // "IN" is India's ISO code. Lowercase "in" is a preposition.
  if (lower === "in" && token === "IN") return true;
  return false;
}

export function parseQuery(raw: string): ParsedQuery {
  const original = raw.trim().replace(/\s+/g, " ");
  if (!original) {
    return {
      raw: "",
      locationText: "",
      year: null,
      mode: "invalid",
      message: "Enter a place and a year. For example: population Japan 2050",
    };
  }
  if (original.length > 160) {
    return {
      raw: original.slice(0, 160),
      locationText: "",
      year: null,
      mode: "invalid",
      message: "That query is too long. Use a place and a four-digit year.",
    };
  }
  if (/[^\p{L}\p{N}\s.'’,()-]/u.test(original)) {
    return {
      raw: original,
      locationText: "",
      year: null,
      mode: "invalid",
      message: "Use letters, numbers, and a year. For example: population Canada 2025",
    };
  }

  const years = [...original.matchAll(YEAR_PATTERN)].map((match) => Number(match[0]));
  const uniqueYears = [...new Set(years)];
  if (uniqueYears.length > 1) {
    return {
      raw: original,
      locationText: "",
      year: null,
      mode: "invalid",
      message: "Use one year at a time.",
    };
  }

  const withoutYear = uniqueYears.length
    ? original.replace(YEAR_PATTERN, " ")
    : original;
  const tokens = withoutYear
    .split(/[^A-Za-z\u00C0-\u024F.'’-]+/)
    .filter(Boolean);
  const hasNow = tokens.some((token) => NOW_WORDS.has(token.toLowerCase()));
  const locationText = tokens.filter(keepToken).join(" ");
  const year = uniqueYears[0] ?? null;

  if (!locationText) {
    return {
      raw: original,
      locationText: "",
      year,
      mode: "invalid",
      message: "Name a place. For example: population Germany 1970",
    };
  }

  if (year === null && !hasNow) {
    return {
      raw: original,
      locationText,
      year: null,
      mode: "needs_year",
      message: `Add a year for ${locationText}. UN estimates in this release run ${COVERAGE.unStart}–${COVERAGE.unEstimateThrough}. Medium projections run ${COVERAGE.unProjectionFrom}–${COVERAGE.unEnd}. “now” uses the latest published estimate, not the calendar year.`,
    };
  }

  return {
    raw: original,
    locationText,
    year,
    mode: hasNow && year === null ? "latest" : "year",
    message: null,
  };
}

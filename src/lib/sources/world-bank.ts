import { COVERAGE } from "@/lib/coverage";
import { formatLongDate } from "@/lib/format";
import { kindForWorldBank } from "@/lib/classify";
import type { GazetteerEntry, Observation, SourceLoad } from "@/lib/types";

const SOURCE_URL = "https://data.worldbank.org/indicator/SP.POP.TOTL";
const LICENSE = "CC BY 4.0";
const LICENSE_URL = "https://www.worldbank.org/en/about/legal/terms-of-use-for-datasets";

type FetchLike = (
  input: string,
  init?: RequestInit & { next?: { revalidate?: number } },
) => Promise<Response>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asPopulation(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return Math.round(value);
  if (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))) {
    return Math.round(Number(value));
  }
  return null;
}

export async function loadWorldBank(
  place: GazetteerEntry,
  fetchImpl: FetchLike = fetch,
): Promise<SourceLoad> {
  if (place.level !== "country" || !place.iso2 || !place.iso3) {
    return {
      ok: false,
      message: "World Bank SP.POP.TOTL is published for countries and economies, not this place.",
    };
  }

  const url =
    `https://api.worldbank.org/v2/country/${encodeURIComponent(place.iso2)}` +
    `/indicator/SP.POP.TOTL?format=json&per_page=300&date=${COVERAGE.wbStart}:2030`;

  let response: Response;
  try {
    response = await fetchImpl(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "PopulationNow/1.0 (country population lookup)",
      },
      signal: AbortSignal.timeout(12_000),
      next: { revalidate: 86_400 },
    });
  } catch {
    return {
      ok: false,
      message: "The World Bank request timed out or could not connect.",
    };
  }

  if (!response.ok) {
    return {
      ok: false,
      message: `The World Bank responded with status ${response.status}.`,
    };
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    return { ok: false, message: "The World Bank response was not valid JSON." };
  }

  if (!Array.isArray(payload) || payload.length < 2 || !Array.isArray(payload[1])) {
    return {
      ok: false,
      message: "The World Bank has no SP.POP.TOTL series for this country code.",
    };
  }

  const meta = payload[0];
  const vintage =
    isRecord(meta) && typeof meta.lastupdated === "string" ? meta.lastupdated : null;
  const points: Observation[] = [];

  for (const row of payload[1]) {
    if (!isRecord(row)) continue;
    if (row.indicator && isRecord(row.indicator) && row.indicator.id !== "SP.POP.TOTL") {
      return { ok: false, message: "The World Bank response was not SP.POP.TOTL." };
    }
    if (typeof row.countryiso3code === "string" && row.countryiso3code !== place.iso3) {
      return {
        ok: false,
        message: "The World Bank returned a different country than the one requested.",
      };
    }
    if (typeof row.date !== "string" || !/^\d{4}$/.test(row.date)) continue;
    const year = Number(row.date);
    const population = asPopulation(row.value);
    if (population === null) continue;
    points.push({
      year,
      population,
      kind: kindForWorldBank(),
      referenceDate: "midyear",
    });
  }

  points.sort((a, b) => a.year - b.year);

  return {
    ok: true,
    vintage: vintage ? formatLongDate(vintage) ?? vintage : null,
    points,
    sourceUrl: SOURCE_URL,
    locationUrl: `${SOURCE_URL}?locations=${place.iso2}`,
    indicator: "SP.POP.TOTL",
    license: LICENSE,
    licenseUrl: LICENSE_URL,
  };
}

export const WORLD_BANK_SOURCE_URL = SOURCE_URL;
export const WORLD_BANK_LICENSE = LICENSE;
export const WORLD_BANK_LICENSE_URL = LICENSE_URL;

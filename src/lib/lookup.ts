import { COVERAGE, REALTIME_NOTE } from "@/lib/coverage";
import { latestObservation, observationAt } from "@/lib/classify";
import { formatDelta, formatPeople, levelLabel } from "@/lib/format";
import { explainHeadline } from "@/lib/explain";
import { placeOptionQuery, placesById } from "@/lib/gazetteer";
import { parseQuery, type ParsedQuery } from "@/lib/parse-query";
import { resolvePlace } from "@/lib/resolve";
import { gapById, gapMessage, type GapPlace } from "@/lib/subnational";
import type {
  ChartPoint,
  GazetteerEntry,
  LookupResponse,
  Observation,
  PlaceOption,
  PopulationResult,
  SourceLoad,
} from "@/lib/types";
import {
  getUnLocation,
  unDataset,
  unLocationUrl,
  unPoints,
  unVintageLabel,
} from "@/lib/sources/un-wpp";
import { loadWorldBank } from "@/lib/sources/world-bank";

export type LookupInput = {
  q?: string;
  loc?: string | null;
  year?: number | null;
};

export type LookupDeps = {
  worldBank?: (place: GazetteerEntry) => Promise<SourceLoad>;
};

function yearChoice(
  parsed: ParsedQuery,
  explicit: number | null,
): { mode: "year" | "latest" | "needs_year"; year: number | null } {
  if (explicit !== null) return { mode: "year", year: explicit };
  if (parsed.mode === "latest") return { mode: "latest", year: null };
  if (parsed.mode === "year" && parsed.year !== null) return { mode: "year", year: parsed.year };
  return { mode: "needs_year", year: null };
}

function optionForPlace(place: GazetteerEntry, year: number | null): PlaceOption {
  return {
    id: `un:${place.locId}`,
    name: place.name,
    detail: [levelLabel(place.level), place.parentName].filter(Boolean).join(" · "),
    supported: true,
    query: placeOptionQuery(place.name, year),
  };
}

function optionForGap(gap: GapPlace, year: number | null): PlaceOption {
  const detail =
    gap.kind === "us_state"
      ? "U.S. state · not in this release"
      : gap.kind === "ca_province"
        ? "Canadian province or territory · not in this release"
        : gap.kind === "uk_nation"
          ? "Not published separately"
          : "Not in this release";
  return {
    id: `gap:${gap.id}`,
    name: gap.name,
    detail,
    supported: false,
    query: placeOptionQuery(gap.name, year),
  };
}

function unsupportedFromGaps(gaps: GapPlace[], year: number | null): LookupResponse {
  const primary = gaps[0];
  const text = gapMessage(primary, year);
  const extra =
    gaps.length > 1
      ? ` Also matched: ${gaps
          .slice(1)
          .map((gap) => gap.name)
          .join(", ")}.`
      : "";
  return {
    status: "unsupported",
    message: text.message,
    detail: `${text.detail}${extra}`,
    alternatives: text.alternatives,
  };
}

function outOfRange(placeName: string, year: number): LookupResponse {
  return {
    status: "out_of_range",
    placeName,
    message:
      year < COVERAGE.unStart
        ? `${placeName} is recognized, but ${year} is before this release. UN World Population Prospects 2024 starts in ${COVERAGE.unStart}. World Bank published estimates start in ${COVERAGE.wbStart}. No earlier figure is estimated here.`
        : `${placeName} is recognized, but ${year} is after this release. The UN medium variant in the 2024 revision ends in ${COVERAGE.unEnd}. No later figure is estimated here.`,
  };
}

async function buildResult(input: {
  place: GazetteerEntry;
  typedLocation: string;
  interpretation: string | null;
  yearMode: "explicit" | "latest_estimate";
  explicitYear: number | null;
  worldBank: (place: GazetteerEntry) => Promise<SourceLoad>;
}): Promise<LookupResponse> {
  const location = getUnLocation(input.place.locId);
  const points = location ? unPoints(location) : null;
  if (!location || !points) {
    return {
      status: "error",
      message: "The UN series for this place is incomplete, so no figure is shown.",
    };
  }

  let wbLoad: SourceLoad | null = null;
  if (input.place.level === "country" && input.place.iso2) {
    wbLoad = await input.worldBank(input.place);
  }

  const wbPoints = wbLoad && wbLoad.ok ? wbLoad.points : [];
  const unLatestEstimate =
    [...points].reverse().find((point) => point.kind === "estimate") ?? null;
  const wbLatest = latestObservation(wbPoints);

  let year = input.explicitYear;
  if (input.yearMode === "latest_estimate") {
    if (!unLatestEstimate) {
      return {
        status: "error",
        message: "The UN file has no estimate years for this place, so “now” cannot be answered.",
      };
    }
    year =
      wbLatest && wbLatest.year > unLatestEstimate.year
        ? wbLatest.year
        : unLatestEstimate.year;
  }

  if (year === null) {
    return {
      status: "needs_year",
      message: `Add a year for ${input.place.name}.`,
      examples: [
        `population ${input.place.name} ${COVERAGE.unEstimateThrough}`,
        `population ${input.place.name} 2050`,
      ],
    };
  }

  if (year < COVERAGE.unStart || year > COVERAGE.unEnd) {
    return outOfRange(input.place.name, year);
  }

  const unObservation = observationAt(points, year);
  if (!unObservation || !unLatestEstimate) {
    return {
      status: "error",
      message: `The UN series does not include ${year} for ${input.place.name}. No substitute was calculated.`,
    };
  }

  const wbObservation = observationAt(wbPoints, year);
  const headlineSource =
    wbObservation && unObservation.kind === "projection" && wbObservation.kind === "estimate"
      ? "world-bank"
      : "un-wpp";
  const headlineObservation = headlineSource === "world-bank" && wbObservation
    ? wbObservation
    : unObservation;

  const wbVintage = wbLoad && wbLoad.ok ? wbLoad.vintage : null;
  const copy = explainHeadline({
    place: input.place,
    headlineSource,
    observation: headlineObservation,
    unObservation,
    wbVintage,
  });

  const chart: ChartPoint[] = points.map((point) => ({
    year: point.year,
    un: point.population,
    unKind: point.kind,
    worldBank: observationAt(wbPoints, point.year)?.population ?? null,
  }));

  const previousPool: Observation[] = headlineSource === "world-bank" ? wbPoints : points;
  const previous = observationAt(previousPool, year - 1);
  const sourceLabel = headlineSource === "world-bank" ? "World Bank" : "UN";
  const yoyLabel = previous
    ? formatDelta({
        delta: headlineObservation.population - previous.population,
        fromYear: previous.year,
        fromKind: previous.kind,
        sourceLabel,
      })
    : null;

  const worldBank = describeWorldBank({
    place: input.place,
    year,
    load: wbLoad,
    observation: wbObservation,
    latest: wbLatest,
    headlineSource,
  });

  const vintage = unVintageLabel();
  const result: PopulationResult = {
    place: input.place,
    typedLocation: input.typedLocation,
    interpretation: input.interpretation,
    requestedYear: year,
    yearMode: input.yearMode,
    headline: {
      population: headlineObservation.population,
      year,
      kind: headlineObservation.kind,
      referenceDate: headlineObservation.referenceDate,
      sourceId: headlineSource,
      organization:
        headlineSource === "un-wpp"
          ? "United Nations, DESA, Population Division"
          : "World Bank",
      dataset:
        headlineSource === "un-wpp"
          ? COVERAGE.unRevision
          : "World Development Indicators",
      vintage: headlineSource === "un-wpp" ? vintage : wbVintage ?? "World Development Indicators",
      variant: headlineSource === "un-wpp" ? "Medium" : null,
      sourceUrl:
        headlineSource === "un-wpp"
          ? unDataset.sourceUrl
          : wbLoad && wbLoad.ok
            ? wbLoad.sourceUrl
            : "https://data.worldbank.org/indicator/SP.POP.TOTL",
      locationUrl:
        headlineSource === "un-wpp"
          ? unLocationUrl(input.place.locId)
          : wbLoad && wbLoad.ok
            ? wbLoad.locationUrl
            : "https://data.worldbank.org/indicator/SP.POP.TOTL",
      license: headlineSource === "un-wpp" ? unDataset.license : "CC BY 4.0",
      licenseUrl:
        headlineSource === "un-wpp"
          ? unDataset.licenseUrl
          : "https://www.worldbank.org/en/about/legal/terms-of-use-for-datasets",
    },
    explanation: copy.explanation,
    caveat: copy.caveat,
    realtimeNote: REALTIME_NOTE,
    yoyLabel,
    un: {
      observation: unObservation,
      latestEstimateYear: unLatestEstimate.year,
      sourceUrl: unDataset.sourceUrl,
      locationUrl: unLocationUrl(input.place.locId),
      vintage,
      revision: unDataset.revision,
      variant: unDataset.variant,
      license: unDataset.license,
      licenseUrl: unDataset.licenseUrl,
      citation: unDataset.citation,
      methodologyUrl: unDataset.methodologyUrl,
    },
    worldBank,
    chart,
    estimateThroughYear: COVERAGE.unEstimateThrough,
  };

  return { status: "ok", result };
}

function describeWorldBank(input: {
  place: GazetteerEntry;
  year: number;
  load: SourceLoad | null;
  observation: Observation | null;
  latest: Observation | null;
  headlineSource: "un-wpp" | "world-bank";
}): PopulationResult["worldBank"] {
  const base = {
    sourceUrl: "https://data.worldbank.org/indicator/SP.POP.TOTL",
    indicator: "SP.POP.TOTL",
    license: "CC BY 4.0",
    licenseUrl: "https://www.worldbank.org/en/about/legal/terms-of-use-for-datasets",
  };

  if (input.place.level !== "country") {
    return {
      ...base,
      status: "not_applicable",
      observation: null,
      latest: null,
      vintage: null,
      locationUrl: null,
      message: `World Bank SP.POP.TOTL covers countries and economies, not this ${levelLabel(input.place.level).toLowerCase()}. The figure is the UN medium variant only.`,
    };
  }

  if (!input.load || !input.load.ok) {
    return {
      ...base,
      status: "unavailable",
      observation: null,
      latest: null,
      vintage: null,
      locationUrl: input.place.iso2
        ? `${base.sourceUrl}?locations=${input.place.iso2}`
        : null,
      message: `${input.load && !input.load.ok ? input.load.message : "The World Bank series was not requested."} No substitute value was created.`,
    };
  }

  if (!input.observation) {
    const latest = input.latest
      ? ` The latest published estimate for ${input.place.name} in that series is ${formatPeople(input.latest.population)} in ${input.latest.year}.`
      : " That series has no published values for this place.";
    return {
      ...base,
      status: "missing_year",
      observation: null,
      latest: input.latest,
      vintage: input.load.vintage,
      locationUrl: input.load.locationUrl,
      message: `World Bank SP.POP.TOTL has no published value for ${input.year}.${latest} No year was interpolated.`,
    };
  }

  if (input.headlineSource === "world-bank") {
    return {
      ...base,
      status: "ok",
      observation: input.observation,
      latest: input.latest,
      vintage: input.load.vintage,
      locationUrl: input.load.locationUrl,
      message: null,
    };
  }

  const vintage = input.load.vintage ? ` Series updated ${input.load.vintage}.` : "";
  return {
    ...base,
    status: "ok",
    observation: input.observation,
    latest: input.latest,
    vintage: input.load.vintage,
    locationUrl: input.load.locationUrl,
    message:
      `World Bank SP.POP.TOTL also publishes ${formatPeople(input.observation.population)} for ${input.year}, a midyear estimate.${vintage} ` +
      "It is a cross-check, not blended with the UN figure. The series differ when publishers use different revisions or national inputs.",
  };
}

async function fromResolution(
  resolution: ReturnType<typeof resolvePlace>,
  parsed: ParsedQuery,
  explicitYear: number | null,
  deps: LookupDeps,
): Promise<LookupResponse> {
  const choice = yearChoice(parsed, explicitYear);
  const yearForQuery = choice.mode === "year" ? choice.year : null;

  if (resolution.type === "disambiguation") {
    const options = [
      ...resolution.places.map((place) => optionForPlace(place, yearForQuery)),
      ...resolution.gaps.map((gap) => optionForGap(gap, yearForQuery)),
    ];
    return {
      status: "disambiguation",
      message: "More than one place matches. Choose one. No population is shown until the place is specific.",
      options,
    };
  }

  if (resolution.type === "unsupported") {
    return unsupportedFromGaps(resolution.gaps, yearForQuery);
  }

  if (resolution.type === "not_found") {
    return {
      status: "not_found",
      message: `No country, region, or world total in this release matches “${parsed.locationText}”.`,
      suggestions: resolution.suggestions.map((suggestion) =>
        suggestion.kind === "place"
          ? optionForPlace(suggestion.place, yearForQuery)
          : optionForGap(suggestion.gap, yearForQuery),
      ),
    };
  }

  if (choice.mode === "needs_year" || parsed.mode === "needs_year") {
    return {
      status: "needs_year",
      message: `${resolution.place.name} is recognized. Add a year, or use “now” for the latest published estimate.`,
      examples: [
        `population ${resolution.place.name} 1990`,
        `population ${resolution.place.name} ${COVERAGE.unEstimateThrough}`,
        `population ${resolution.place.name} 2050`,
        `population ${resolution.place.name} now`,
      ],
    };
  }

  if (choice.mode === "year" && choice.year !== null && (choice.year < COVERAGE.unStart || choice.year > COVERAGE.unEnd)) {
    return outOfRange(resolution.place.name, choice.year);
  }

  return buildResult({
    place: resolution.place,
    typedLocation: parsed.locationText,
    interpretation: resolution.interpretation,
    yearMode: choice.mode === "latest" ? "latest_estimate" : "explicit",
    explicitYear: choice.year,
    worldBank: deps.worldBank ?? loadWorldBank,
  });
}

export async function lookupQuery(
  input: LookupInput,
  deps: LookupDeps = {},
): Promise<LookupResponse> {
  const parsed = parseQuery(input.q ?? "");

  if (input.loc) {
    if (input.loc.startsWith("gap:")) {
      const gap = gapById(input.loc.slice(4));
      if (!gap) {
        return { status: "not_found", message: "That place is not in this release.", suggestions: [] };
      }
      const choice = yearChoice(parsed, input.year ?? null);
      return unsupportedFromGaps(gap ? [gap] : [], choice.year);
    }

    if (input.loc.startsWith("un:")) {
      const locId = Number(input.loc.slice(3));
      const place = placesById.get(locId);
      if (!place || !Number.isInteger(locId)) {
        return { status: "not_found", message: "That place is not in this release.", suggestions: [] };
      }
      if (parsed.mode === "invalid" && input.year == null && !input.q) {
        return {
          status: "needs_year",
          message: `${place.name} is recognized. Add a year.`,
          examples: [`population ${place.name} ${COVERAGE.unEstimateThrough}`],
        };
      }
      if (parsed.mode === "invalid" && input.q) {
        return { status: "invalid", message: parsed.message ?? "That query could not be read." };
      }
      const choice = yearChoice(parsed, input.year ?? null);
      if (choice.mode === "needs_year") {
        return {
          status: "needs_year",
          message: `${place.name} is recognized. Add a year, or use “now” for the latest published estimate.`,
          examples: [
            `population ${place.name} ${COVERAGE.unEstimateThrough}`,
            `population ${place.name} 2050`,
            `population ${place.name} now`,
          ],
        };
      }
      if (
        choice.mode === "year" &&
        choice.year !== null &&
        (choice.year < COVERAGE.unStart || choice.year > COVERAGE.unEnd)
      ) {
        return outOfRange(place.name, choice.year);
      }
      return buildResult({
        place,
        typedLocation: parsed.locationText || place.name,
        interpretation:
          parsed.locationText &&
          parsed.locationText.toLowerCase() !== place.name.toLowerCase()
            ? `Read “${parsed.locationText}” as ${place.name}.`
            : null,
        yearMode: choice.mode === "latest" ? "latest_estimate" : "explicit",
        explicitYear: choice.year,
        worldBank: deps.worldBank ?? loadWorldBank,
      });
    }

    return { status: "invalid", message: "That place id is not recognized." };
  }

  if (parsed.mode === "invalid") {
    return { status: "invalid", message: parsed.message ?? "Enter a place and a year." };
  }

  const resolution = resolvePlace(parsed.locationText);
  return fromResolution(resolution, parsed, input.year ?? null, deps);
}

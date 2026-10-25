export type GeographicLevel = "country" | "region" | "world";

export type ObservationKind = "estimate" | "projection";

export type Observation = {
  year: number;
  population: number;
  kind: ObservationKind;
  referenceDate: string;
};

export type GazetteerEntry = {
  locId: number;
  iso3: string | null;
  iso2: string | null;
  name: string;
  level: GeographicLevel;
  parentId: number | null;
  parentName: string | null;
};

export type GazetteerFile = {
  revision: string;
  retrievedAt: string;
  locations: GazetteerEntry[];
};

export type UnLocation = GazetteerEntry & {
  typeName: string;
  pop: number[];
};

export type ChartPoint = {
  year: number;
  un: number;
  unKind: ObservationKind;
  worldBank: number | null;
};

export type Headline = {
  population: number;
  year: number;
  kind: ObservationKind;
  referenceDate: string;
  sourceId: "un-wpp" | "world-bank";
  organization: string;
  dataset: string;
  vintage: string;
  variant: string | null;
  sourceUrl: string;
  locationUrl: string;
  license: string;
  licenseUrl: string;
};

export type PopulationResult = {
  place: GazetteerEntry;
  typedLocation: string;
  interpretation: string | null;
  requestedYear: number;
  yearMode: "explicit" | "latest_estimate";
  headline: Headline;
  explanation: string;
  caveat: string | null;
  realtimeNote: string;
  yoyLabel: string | null;
  un: {
    observation: Observation;
    latestEstimateYear: number;
    sourceUrl: string;
    locationUrl: string;
    vintage: string;
    revision: string;
    variant: string;
    license: string;
    licenseUrl: string;
    citation: string;
    methodologyUrl: string;
  };
  worldBank: {
    status: "ok" | "missing_year" | "unavailable" | "not_applicable";
    observation: Observation | null;
    latest: Observation | null;
    vintage: string | null;
    sourceUrl: string;
    locationUrl: string | null;
    indicator: string;
    license: string;
    licenseUrl: string;
    message: string | null;
  };
  chart: ChartPoint[];
  estimateThroughYear: number;
};

export type PlaceOption = {
  id: string;
  name: string;
  detail: string;
  supported: boolean;
  query: string;
};

export type LookupResponse =
  | { status: "ok"; result: PopulationResult }
  | { status: "disambiguation"; message: string; options: PlaceOption[] }
  | {
      status: "unsupported";
      message: string;
      detail: string;
      alternatives: { label: string; query: string }[];
    }
  | { status: "needs_year"; message: string; examples: string[] }
  | { status: "not_found"; message: string; suggestions: PlaceOption[] }
  | { status: "out_of_range"; message: string; placeName: string }
  | { status: "invalid"; message: string }
  | { status: "error"; message: string };

export type SourceLoad =
  | {
      ok: true;
      vintage: string | null;
      points: Observation[];
      sourceUrl: string;
      locationUrl: string;
      indicator: string;
      license: string;
      licenseUrl: string;
    }
  | { ok: false; message: string };

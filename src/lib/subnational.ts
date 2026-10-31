import { normalizeName } from "@/lib/normalize";

export type GapKind =
  | "us_state"
  | "us_county"
  | "us_city"
  | "ca_province"
  | "ca_city"
  | "uk_nation"
  | "city";

export type GapPlace = {
  id: string;
  name: string;
  aliases: string[];
  kind: GapKind;
  country: string;
  countryQuery: string;
  note?: string;
};

function slug(value: string): string {
  return normalizeName(value).replace(/ /g, "-");
}

function usState(name: string, aliases: string[] = []): GapPlace {
  const id = `us-state-${slug(name)}`;
  return {
    id,
    name,
    aliases: [
      ...aliases,
      `${name} state`,
      `state of ${name}`,
      `${name} usa`,
      `${name} us`,
      `${name} united states`,
    ],
    kind: "us_state",
    country: "the United States",
    countryQuery: "United States",
  };
}

function city(
  name: string,
  country: string,
  countryQuery: string,
  aliases: string[] = [],
  note?: string,
): GapPlace {
  return {
    id: `city-${slug(name)}`,
    name,
    aliases,
    kind: "city",
    country,
    countryQuery,
    note,
  };
}

const US_STATES = [
  "Alabama",
  "Alaska",
  "Arizona",
  "Arkansas",
  "California",
  "Colorado",
  "Connecticut",
  "Delaware",
  "Florida",
  "Georgia",
  "Hawaii",
  "Idaho",
  "Illinois",
  "Indiana",
  "Iowa",
  "Kansas",
  "Kentucky",
  "Louisiana",
  "Maine",
  "Maryland",
  "Massachusetts",
  "Michigan",
  "Minnesota",
  "Mississippi",
  "Missouri",
  "Montana",
  "Nebraska",
  "Nevada",
  "New Hampshire",
  "New Jersey",
  "New Mexico",
  "New York",
  "North Carolina",
  "North Dakota",
  "Ohio",
  "Oklahoma",
  "Oregon",
  "Pennsylvania",
  "Rhode Island",
  "South Carolina",
  "South Dakota",
  "Tennessee",
  "Texas",
  "Utah",
  "Vermont",
  "Virginia",
  "Washington",
  "West Virginia",
  "Wisconsin",
  "Wyoming",
];

const CA_PROVINCES: Array<[string, string[]]> = [
  ["Ontario", ["ON"]],
  ["Quebec", ["Québec", "QC"]],
  ["British Columbia", ["BC"]],
  ["Alberta", ["AB"]],
  ["Manitoba", ["MB"]],
  ["Saskatchewan", ["SK"]],
  ["Nova Scotia", ["NS"]],
  ["New Brunswick", ["NB"]],
  ["Newfoundland and Labrador", ["Newfoundland", "NL"]],
  ["Prince Edward Island", ["PEI", "PE"]],
  ["Northwest Territories", ["NWT"]],
  ["Nunavut", ["NU"]],
  ["Yukon", ["Yukon Territory", "YT"]],
];

export const GAP_PLACES: GapPlace[] = [
  ...US_STATES.map((name) => usState(name)),
  {
    id: "us-state-district-of-columbia",
    name: "District of Columbia",
    aliases: ["Washington DC", "Washington, D.C.", "Washington D.C.", "D.C.", "DC"],
    kind: "us_city",
    country: "the United States",
    countryQuery: "United States",
    note: "District of Columbia is not published in the country file used here.",
  },
  ...CA_PROVINCES.map(([name, aliases]) => ({
    id: `ca-province-${slug(name)}`,
    name,
    aliases,
    kind: "ca_province" as const,
    country: "Canada",
    countryQuery: "Canada",
  })),
  {
    id: "uk-nation-england",
    name: "England",
    aliases: [],
    kind: "uk_nation",
    country: "the United Kingdom",
    countryQuery: "United Kingdom",
  },
  {
    id: "uk-nation-scotland",
    name: "Scotland",
    aliases: [],
    kind: "uk_nation",
    country: "the United Kingdom",
    countryQuery: "United Kingdom",
  },
  {
    id: "uk-nation-wales",
    name: "Wales",
    aliases: [],
    kind: "uk_nation",
    country: "the United Kingdom",
    countryQuery: "United Kingdom",
  },
  {
    id: "uk-nation-northern-ireland",
    name: "Northern Ireland",
    aliases: [],
    kind: "uk_nation",
    country: "the United Kingdom",
    countryQuery: "United Kingdom",
  },
  city("New York City", "the United States", "United States", ["NYC", "New York, NY"]),
  city("Los Angeles", "the United States", "United States", ["LA", "L.A."]),
  city("Chicago", "the United States", "United States"),
  city("Houston", "the United States", "United States"),
  city("Phoenix", "the United States", "United States"),
  city("Philadelphia", "the United States", "United States"),
  city("San Antonio", "the United States", "United States"),
  city("San Diego", "the United States", "United States"),
  city("Dallas", "the United States", "United States"),
  city("Austin", "the United States", "United States"),
  city("San Jose", "the United States", "United States"),
  city("San Francisco", "the United States", "United States", ["SF"]),
  city("Seattle", "the United States", "United States"),
  city("Denver", "the United States", "United States"),
  city("Boston", "the United States", "United States"),
  city("Nashville", "the United States", "United States"),
  city("Detroit", "the United States", "United States"),
  city("Miami", "the United States", "United States"),
  city("Atlanta", "the United States", "United States"),
  city("Portland", "the United States", "United States"),
  city("Las Vegas", "the United States", "United States"),
  city("Minneapolis", "the United States", "United States"),
  city("Tokyo", "Japan", "Japan"),
  city("Osaka", "Japan", "Japan"),
  city("Kyoto", "Japan", "Japan"),
  city("Yokohama", "Japan", "Japan"),
  city("London", "the United Kingdom", "United Kingdom", ["London, UK", "London UK"]),
  city("Manchester", "the United Kingdom", "United Kingdom"),
  city("Birmingham", "the United Kingdom", "United Kingdom"),
  city("Glasgow", "the United Kingdom", "United Kingdom"),
  city("Edinburgh", "the United Kingdom", "United Kingdom"),
  city("Cardiff", "the United Kingdom", "United Kingdom"),
  city("Belfast", "the United Kingdom", "United Kingdom"),
  city("Paris", "France", "France", ["Paris, France"]),
  city("Lyon", "France", "France"),
  city("Marseille", "France", "France"),
  city("Berlin", "Germany", "Germany"),
  city("Munich", "Germany", "Germany", ["München"]),
  city("Hamburg", "Germany", "Germany"),
  city("Toronto", "Canada", "Canada"),
  city("Vancouver", "Canada", "Canada"),
  city("Montreal", "Canada", "Canada", ["Montréal"]),
  city("Ottawa", "Canada", "Canada"),
  city("Calgary", "Canada", "Canada"),
  city("Edmonton", "Canada", "Canada"),
  city("Winnipeg", "Canada", "Canada"),
  city("Quebec City", "Canada", "Canada"),
  city("Halifax", "Canada", "Canada"),
  city("Sydney", "Australia", "Australia"),
  city("Melbourne", "Australia", "Australia"),
  city("Brisbane", "Australia", "Australia"),
  city("Mumbai", "India", "India", ["Bombay"]),
  city("Delhi", "India", "India", ["New Delhi"]),
  city("Bengaluru", "India", "India", ["Bangalore"]),
  city("Kolkata", "India", "India", ["Calcutta"]),
  city("Chennai", "India", "India", ["Madras"]),
  city("Shanghai", "China", "China"),
  city("Beijing", "China", "China", ["Peking"]),
  city("Guangzhou", "China", "China"),
  city("Shenzhen", "China", "China"),
  city("Seoul", "South Korea", "South Korea"),
  city("Busan", "South Korea", "South Korea"),
  city("Mexico City", "Mexico", "Mexico", ["CDMX", "Ciudad de México"]),
  city("Guadalajara", "Mexico", "Mexico"),
  city("São Paulo", "Brazil", "Brazil", ["Sao Paulo"]),
  city("Rio de Janeiro", "Brazil", "Brazil", ["Rio"]),
  city("Buenos Aires", "Argentina", "Argentina"),
  city("Lima", "Peru", "Peru"),
  city("Bogotá", "Colombia", "Colombia", ["Bogota"]),
  city("Lagos", "Nigeria", "Nigeria"),
  city("Cairo", "Egypt", "Egypt"),
  city("Johannesburg", "South Africa", "South Africa"),
  city("Cape Town", "South Africa", "South Africa"),
  city("Nairobi", "Kenya", "Kenya"),
  city("Istanbul", "Turkey", "Turkey"),
  city("Ankara", "Turkey", "Turkey"),
  city("Dubai", "the United Arab Emirates", "United Arab Emirates"),
  city("Abu Dhabi", "the United Arab Emirates", "United Arab Emirates"),
  city(
    "Gaza",
    "the State of Palestine",
    "State of Palestine",
    ["Gaza Strip", "Gaza City"],
    "The State of Palestine figure is not a population for Gaza alone.",
  ),
  city(
    "West Bank",
    "the State of Palestine",
    "State of Palestine",
    [],
    "The State of Palestine figure is not a population for the West Bank alone.",
  ),
];

const GAP_INDEX = new Map<string, GapPlace[]>();

for (const place of GAP_PLACES) {
  const keys = [place.name, ...place.aliases].map((name) => normalizeName(name));
  for (const key of keys) {
    const list = GAP_INDEX.get(key) ?? [];
    list.push(place);
    GAP_INDEX.set(key, list);
  }
}

export function gapsForKey(key: string): GapPlace[] {
  return GAP_INDEX.get(key) ?? [];
}

export function gapById(id: string): GapPlace | null {
  return GAP_PLACES.find((place) => place.id === id) ?? null;
}

export function gapMessage(place: GapPlace, year: number | null): {
  message: string;
  detail: string;
  alternatives: { label: string; query: string }[];
} {
  const exampleYear = year ?? 2023;
  const alternative = {
    label: place.countryQuery,
    query: `population ${place.countryQuery} ${exampleYear}`,
  };
  const note = place.note ? ` ${place.note}` : "";

  if (place.kind === "us_state") {
    return {
      message: `${place.name} is a U.S. state.`,
      detail: `This release does not include U.S. Census Bureau estimates for states, counties, or cities. No state population is estimated here.${note} Country-level ${place.countryQuery} is available.`,
      alternatives: [alternative],
    };
  }
  if (place.kind === "us_county") {
    return {
      message: `${place.name} looks like a U.S. county.`,
      detail:
        "County populations are not in this release. The Census Bureau county file is not connected, and no county figure is created to fill the gap. Country-level United States is available.",
      alternatives: [alternative],
    };
  }
  if (place.kind === "ca_province") {
    return {
      message: `${place.name} is a Canadian province or territory.`,
      detail:
        "Statistics Canada subnational figures are not connected in this release. No provincial population is estimated here. Country-level Canada is available.",
      alternatives: [alternative],
    };
  }
  if (place.kind === "uk_nation") {
    return {
      message: `${place.name} is not a separate location in the sources used here.`,
      detail: `${place.name} is part of ${place.country}. World Population Prospects publishes the United Kingdom, not a separate ${place.name} series. No split is calculated here.`,
      alternatives: [alternative],
    };
  }
  return {
    message: `${place.name} is a city or local area.`,
    detail: `City populations are not in this release, and none are estimated here.${note} The available country series is ${place.countryQuery}.`,
    alternatives: [alternative],
  };
}

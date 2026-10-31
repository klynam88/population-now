/**
 * Source adapters. Country and regional lookups use the first two.
 * Census and Statistics Canada are described so a later adapter can be added
 * without inventing figures in this release.
 */
export const SOURCE_CATALOG = [
  {
    id: "un-wpp",
    status: "active" as const,
    organization: "United Nations, Department of Economic and Social Affairs, Population Division",
    dataset: "World Population Prospects 2024",
    covers: "Countries and areas, geographic regions, and the world, 1950–2100",
  },
  {
    id: "world-bank",
    status: "active" as const,
    organization: "World Bank",
    dataset: "World Development Indicators, SP.POP.TOTL",
    covers: "Published midyear population estimates for countries and economies, from 1960",
  },
  {
    id: "us-census",
    status: "unavailable" as const,
    organization: "U.S. Census Bureau",
    dataset: "Population Estimates Program",
    covers: "States, counties, and cities are not connected. The API requires a key, and no key is configured.",
  },
  {
    id: "statcan",
    status: "unavailable" as const,
    organization: "Statistics Canada",
    dataset: "Official subnational population estimates",
    covers: "Provinces, territories, and Canadian cities are not connected.",
  },
];

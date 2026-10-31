/** Boundaries for the datasets this release actually serves. */
export const COVERAGE = {
  unRevision: "World Population Prospects 2024",
  unVariant: "Medium",
  unStart: 1950,
  unEnd: 2100,
  /** Inclusive last year the 2024 revision treats as an estimate. */
  unEstimateThrough: 2023,
  unProjectionFrom: 2024,
  /** World Bank SP.POP.TOTL begins in 1960. The last year is whatever the API has published. */
  wbStart: 1960,
  retrievedAt: "2026-10-25",
} as const;

export const REALTIME_NOTE =
  "Population.Now does not measure population in real time. Every figure is a published estimate or a projection.";

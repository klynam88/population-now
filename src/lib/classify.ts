import { COVERAGE } from "@/lib/coverage";
import type { Observation, ObservationKind } from "@/lib/types";

/**
 * WPP 2024 medium variant: 1950–2023 are estimates and 2024–2100 are projections.
 * The calendar year does not change this. A 2026 query is still a projection
 * in the 2024 revision.
 */
export function kindForUnYear(year: number): ObservationKind {
  return year <= COVERAGE.unEstimateThrough ? "estimate" : "projection";
}

/** World Bank SP.POP.TOTL values are published midyear estimates, including recent years. */
export function kindForWorldBank(): ObservationKind {
  return "estimate";
}

export function observationAt(
  points: Observation[],
  year: number,
): Observation | null {
  return points.find((point) => point.year === year) ?? null;
}

export function latestObservation(points: Observation[]): Observation | null {
  if (points.length === 0) return null;
  return points.reduce((latest, point) =>
    point.year > latest.year ? point : latest,
  );
}

import datasetFile from "@/data/un-wpp-2024.json";
import { COVERAGE } from "@/lib/coverage";
import { kindForUnYear } from "@/lib/classify";
import type { Observation, UnLocation } from "@/lib/types";

type UnDataset = {
  revision: string;
  variant: string;
  citation: string;
  license: string;
  licenseUrl: string;
  sourceUrl: string;
  methodologyUrl: string;
  downloadUrl: string;
  referenceDate: string;
  estimateThroughYear: number;
  projectionFromYear: number;
  startYear: number;
  endYear: number;
  retrievedAt: string;
  sourceSha256: string;
  locationCount: number;
  locations: UnLocation[];
};

function assertDataset(value: UnDataset): UnDataset {
  if (
    value.revision !== COVERAGE.unRevision ||
    value.variant !== COVERAGE.unVariant ||
    value.startYear !== COVERAGE.unStart ||
    value.endYear !== COVERAGE.unEnd ||
    value.estimateThroughYear !== COVERAGE.unEstimateThrough ||
    value.projectionFromYear !== COVERAGE.unProjectionFrom
  ) {
    throw new Error("The bundled UN dataset does not match the WPP 2024 coverage constants.");
  }
  return value;
}

export const unDataset = assertDataset(datasetFile as UnDataset);

const byId = new Map<number, UnLocation>();
for (const location of unDataset.locations) {
  byId.set(location.locId, location);
}

export function getUnLocation(locId: number): UnLocation | null {
  return byId.get(locId) ?? null;
}

export function unPoints(location: UnLocation): Observation[] | null {
  const expected = unDataset.endYear - unDataset.startYear + 1;
  if (location.pop.length !== expected) return null;
  return location.pop.map((population, index) => {
    const year = unDataset.startYear + index;
    return {
      year,
      population,
      kind: kindForUnYear(year),
      referenceDate: unDataset.referenceDate,
    };
  });
}

export function unLocationUrl(locId: number): string {
  return `https://population.un.org/dataportal/data/indicators/49/locations/${locId}/start/${COVERAGE.unStart}/end/${COVERAGE.unEnd}`;
}

export function unVintageLabel(): string {
  const [year, month, day] = unDataset.retrievedAt.split("-");
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  const monthName = months[Number(month) - 1] ?? month;
  return `2024 revision, file retrieved ${Number(day)} ${monthName} ${year}`;
}

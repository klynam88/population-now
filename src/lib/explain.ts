import { COVERAGE, REALTIME_NOTE } from "@/lib/coverage";
import { formatPeople, levelLabel } from "@/lib/format";
import type { GazetteerEntry, Observation } from "@/lib/types";

export function explainHeadline(input: {
  place: GazetteerEntry;
  headlineSource: "un-wpp" | "world-bank";
  observation: Observation;
  unObservation: Observation;
  wbVintage: string | null;
}): { explanation: string; caveat: string | null } {
  const name = input.place.name;
  const publishedAs =
    input.place.level === "world"
      ? "The world total is published by the United Nations. "
      : `${name} is published by the United Nations as a ${levelLabel(input.place.level).toLowerCase()}. `;

  if (input.headlineSource === "un-wpp" && input.observation.kind === "estimate") {
    return {
      explanation:
        publishedAs +
        `This is the medium-variant estimate for 1 July ${input.observation.year} in ${COVERAGE.unRevision}. ` +
        `Years ${COVERAGE.unStart}–${COVERAGE.unEstimateThrough} in that revision are estimates reconstructed from censuses, vital registration, and other official statistics. ` +
        `It is not a census count taken on 1 July ${input.observation.year}.`,
      caveat: null,
    };
  }

  if (input.headlineSource === "un-wpp" && input.observation.kind === "projection") {
    return {
        explanation:
        publishedAs +
        `This is the medium-variant projection for 1 July ${input.observation.year} in ${COVERAGE.unRevision}. ` +
        `In this revision, ${COVERAGE.unProjectionFrom}–${COVERAGE.unEnd} are projections: scenarios built from assumptions about fertility, mortality, and migration. ` +
        `The medium variant is the central scenario, not a prediction of what will happen.`,
      caveat:
        "Projections are not observations. Later revisions can move this number, especially further from the base year.",
    };
  }

  const vintage = input.wbVintage ? `, updated ${input.wbVintage}` : "";
  return {
    explanation:
      `${name} is a ${levelLabel(input.place.level).toLowerCase()}. This is the World Bank midyear estimate for ${input.observation.year} ` +
      `from indicator SP.POP.TOTL in World Development Indicators${vintage}. ` +
      `The World Bank describes the series as de facto midyear estimates of all residents. ` +
      `${COVERAGE.unRevision} still treats ${input.observation.year} as a medium-variant projection ` +
      `(${formatPeople(input.unObservation.population)} on 1 July ${input.observation.year}), ` +
      `because estimates in that revision stop in ${COVERAGE.unEstimateThrough}.`,
    caveat:
      `The United Nations number for ${input.observation.year} is a projection from the 2024 revision, not an updated count.`,
  };
}

export { REALTIME_NOTE };

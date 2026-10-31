import { formatPeople, kindLabel, levelLabel } from "@/lib/format";
import type { GeographicLevel, ObservationKind } from "@/lib/types";

export type ShareCard = {
  title: string;
  description: string;
  imageAlt: string;
  eyebrow: string;
  headline: string;
  figure: string | null;
  detail: string;
  tone: "estimate" | "projection" | "brand";
};

export function brandShare(): ShareCard {
  return {
    title: "Population.Now — past, present, and projected population",
    description:
      "Look up a country, a UN region, or the world from 1950 to 2100. Published estimates and projections from the UN and the World Bank. Not a live population clock.",
    imageAlt: "Population.Now. A sea-green globe beside Past. Present. Future.",
    eyebrow: "Records · 1950–2100",
    headline: "Population.Now",
    figure: null,
    detail: "A country and a year. Not a live count.",
    tone: "brand",
  };
}

export function resultShare(input: {
  placeName: string;
  level: GeographicLevel;
  year: number;
  population: number;
  kind: ObservationKind;
  referenceDate: string;
  sourceId: "un-wpp" | "world-bank";
}): ShareCard {
  const figure = formatPeople(input.population);
  const source = input.sourceId === "world-bank" ? "World Bank" : "United Nations";
  const qualifier =
    input.sourceId === "un-wpp" && input.kind === "projection" ? "medium-variant projection" : kindLabel(input.kind).toLowerCase();
  const title = `${input.placeName}, ${input.year}`;
  const description = `${figure}. ${source} ${qualifier} for ${input.placeName} on ${input.referenceDate} ${input.year}. Not a live count.`;
  return {
    title,
    description,
    imageAlt: `${title}: ${figure}. ${source} ${qualifier}.`,
    eyebrow: `${levelLabel(input.level)} · ${input.year}`,
    headline: input.placeName,
    figure,
    detail: `${kindLabel(input.kind)} · ${input.referenceDate} · ${source}`,
    tone: input.kind,
  };
}

import { PLACE_ALIASES } from "@/lib/aliases";
import { exactPlaces, placesById } from "@/lib/gazetteer";
import { levenshtein, normalizeName, uniqueBy } from "@/lib/normalize";
import { GAP_PLACES, gapsForKey, type GapPlace } from "@/lib/subnational";
import type { GazetteerEntry } from "@/lib/types";

export type Resolution =
  | {
      type: "match";
      place: GazetteerEntry;
      interpretation: string | null;
    }
  | {
      type: "disambiguation";
      places: GazetteerEntry[];
      gaps: GapPlace[];
    }
  | { type: "unsupported"; gaps: GapPlace[] }
  | {
      type: "not_found";
      suggestions: Array<
        | { kind: "place"; place: GazetteerEntry; distance: number }
        | { kind: "gap"; gap: GapPlace; distance: number }
      >;
    };

function interpretationFor(typed: string, place: GazetteerEntry): string | null {
  if (normalizeName(typed) === normalizeName(place.name)) return null;
  return `Read “${typed}” as ${place.name}.`;
}

function countyGap(locationText: string): GapPlace {
  return {
    id: "us-county-query",
    name: locationText,
    aliases: [],
    kind: "us_county",
    country: "the United States",
    countryQuery: "United States",
  };
}

function aliasGroup(key: string): GazetteerEntry[] | null {
  const alias = PLACE_ALIASES[key];
  if (!Array.isArray(alias)) return null;
  return alias
    .map((id) => placesById.get(id))
    .filter((place): place is GazetteerEntry => Boolean(place));
}

function collectExact(key: string): GazetteerEntry[] {
  const hits = exactPlaces(key);
  const alias = PLACE_ALIASES[key];
  if (typeof alias === "number") {
    const place = placesById.get(alias);
    if (place) hits.unshift(place);
  }
  return uniqueBy(hits, (place) => String(place.locId));
}

function fuzzyPlaces(
  key: string,
  maxDistance: number,
): Array<{ place: GazetteerEntry; distance: number }> {
  const best = new Map<number, { place: GazetteerEntry; distance: number }>();
  const consider = (place: GazetteerEntry, distance: number) => {
    if (distance <= 0 || distance > maxDistance) return;
    const current = best.get(place.locId);
    if (!current || distance < current.distance) {
      best.set(place.locId, { place, distance });
    }
  };

  for (const place of placesById.values()) {
    consider(place, levenshtein(key, normalizeName(place.name), maxDistance));
  }
  for (const [alias, id] of Object.entries(PLACE_ALIASES)) {
    if (typeof id !== "number") continue;
    const place = placesById.get(id);
    if (!place) continue;
    consider(place, levenshtein(key, alias, maxDistance));
  }
  return [...best.values()];
}

function fuzzyGaps(
  key: string,
  maxDistance: number,
): Array<{ gap: GapPlace; distance: number }> {
  const best = new Map<string, { gap: GapPlace; distance: number }>();
  for (const gap of GAP_PLACES) {
    const labels = [gap.name, ...gap.aliases];
    for (const label of labels) {
      const distance = levenshtein(key, normalizeName(label), maxDistance);
      if (distance <= 0 || distance > maxDistance) continue;
      const current = best.get(gap.id);
      if (!current || distance < current.distance) {
        best.set(gap.id, { gap, distance });
      }
    }
  }
  return [...best.values()];
}

export function resolvePlace(locationText: string): Resolution {
  const key = normalizeName(locationText);
  if (!key) return { type: "not_found", suggestions: [] };

  if (/\b(county|parish|census division)\b/.test(key)) {
    return { type: "unsupported", gaps: [countyGap(locationText)] };
  }

  const grouped = aliasGroup(key);
  const gaps = gapsForKey(key);
  if (grouped && (grouped.length > 1 || gaps.length > 0)) {
    return { type: "disambiguation", places: grouped, gaps };
  }

  const places = grouped && grouped.length === 1 ? grouped : collectExact(key);
  if (places.length > 1 || (places.length >= 1 && gaps.length > 0)) {
    return { type: "disambiguation", places, gaps };
  }
  if (places.length === 1) {
    return {
      type: "match",
      place: places[0],
      interpretation: interpretationFor(locationText, places[0]),
    };
  }
  if (gaps.length === 1) return { type: "unsupported", gaps };
  if (gaps.length > 1) return { type: "disambiguation", places: [], gaps };

  if (key.length >= 4) {
    const nearPlaces = fuzzyPlaces(key, 1);
    const nearGaps = fuzzyGaps(key, 1);
    if (nearPlaces.length === 1 && nearGaps.length === 0) {
      return {
        type: "match",
        place: nearPlaces[0].place,
        interpretation: interpretationFor(locationText, nearPlaces[0].place),
      };
    }
    if (nearGaps.length === 1 && nearPlaces.length === 0) {
      return { type: "unsupported", gaps: [nearGaps[0].gap] };
    }
    if (nearPlaces.length + nearGaps.length > 1) {
      return {
        type: "disambiguation",
        places: nearPlaces.map((hit) => hit.place),
        gaps: nearGaps.map((hit) => hit.gap),
      };
    }
  }

  const suggestions = [
    ...fuzzyPlaces(key, 2).map((hit) => ({ kind: "place" as const, ...hit })),
    ...fuzzyGaps(key, 2).map((hit) => ({ kind: "gap" as const, ...hit })),
  ]
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 5);

  return { type: "not_found", suggestions };
}

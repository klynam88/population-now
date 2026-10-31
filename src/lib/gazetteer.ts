import gazetteerFile from "@/data/gazetteer.json";
import { normalizeName, uniqueBy } from "@/lib/normalize";
import type { GazetteerEntry, GazetteerFile } from "@/lib/types";

export const gazetteer = gazetteerFile as GazetteerFile;

export const placesById = new Map<number, GazetteerEntry>();
const placesByName = new Map<string, GazetteerEntry[]>();
const placesByIso3 = new Map<string, GazetteerEntry>();
const placesByIso2 = new Map<string, GazetteerEntry>();

for (const place of gazetteer.locations) {
  placesById.set(place.locId, place);
  const key = normalizeName(place.name);
  const named = placesByName.get(key) ?? [];
  named.push(place);
  placesByName.set(key, named);
  if (place.iso3) placesByIso3.set(place.iso3.toLowerCase(), place);
  if (place.iso2) placesByIso2.set(place.iso2.toLowerCase(), place);
}

export function exactPlaces(key: string): GazetteerEntry[] {
  const hits: GazetteerEntry[] = [];
  const named = placesByName.get(key);
  if (named) hits.push(...named);
  if (key.length === 3) {
    const iso3 = placesByIso3.get(key);
    if (iso3) hits.push(iso3);
  }
  if (key.length === 2) {
    const iso2 = placesByIso2.get(key);
    if (iso2) hits.push(iso2);
  }
  return uniqueBy(hits, (place) => String(place.locId));
}

export function placeOptionQuery(name: string, year: number | null): string {
  return year ? `population ${name} ${year}` : `population ${name}`;
}

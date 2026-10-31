import { PLACE_ALIASES } from "@/lib/aliases";
import { placesById } from "@/lib/gazetteer";
import { normalizeName } from "@/lib/normalize";
import { parseQuery } from "@/lib/parse-query";
import { GAP_PLACES, type GapKind } from "@/lib/subnational";
import type { GazetteerEntry } from "@/lib/types";
import { levelLabel } from "@/lib/format";

export type Suggestion = {
  id: string;
  name: string;
  detail: string;
  supported: boolean;
};

function scoreName(name: string, key: string): number | null {
  if (name === key) return 0;
  if (name.startsWith(key)) return 1;
  if (name.split(" ").some((word) => word.startsWith(key))) return 2;
  if (key.length >= 4 && name.includes(key)) return 3;
  return null;
}

export function suggestPlaces(raw: string, limit = 8): Suggestion[] {
  const parsed = parseQuery(raw);
  const key = normalizeName(parsed.locationText || raw);
  if (key.length < 2) return [];

  const ranked = new Map<string, { suggestion: Suggestion; score: number }>();
  const consider = (suggestion: Suggestion, score: number) => {
    const current = ranked.get(suggestion.id);
    if (!current || score < current.score) ranked.set(suggestion.id, { suggestion, score });
  };

  for (const place of placesById.values()) {
    const name = normalizeName(place.name);
    let score = scoreName(name, key);
    if (place.iso3 && place.iso3.toLowerCase().startsWith(key)) score = score ?? 1;
    if (place.iso2 && place.iso2.toLowerCase() === key) score = 0;
    if (score === null) continue;
    consider(placeSuggestion(place), score);
  }

  for (const [alias, id] of Object.entries(PLACE_ALIASES)) {
    const score = scoreName(alias, key);
    if (score === null) continue;
    const ids = Array.isArray(id) ? id : [id];
    for (const locId of ids) {
      const place = placesById.get(locId);
      if (!place) continue;
      consider(placeSuggestion(place, alias), score + 0.1);
    }
  }

  for (const gap of GAP_PLACES) {
    const labels = [gap.name, ...gap.aliases].map((label) => normalizeName(label));
    let best: number | null = null;
    for (const label of labels) {
      const score = scoreName(label, key);
      if (score === null) continue;
      best = best === null ? score : Math.min(best, score);
    }
    if (best === null) continue;
    consider(
      {
        id: `gap:${gap.id}`,
        name: gap.name,
        detail: gapDetail(gap.kind),
        supported: false,
      },
      best + 4,
    );
  }

  return [...ranked.values()]
    .sort(
      (a, b) =>
        a.score - b.score ||
        Number(b.suggestion.supported) - Number(a.suggestion.supported) ||
        a.suggestion.name.localeCompare(b.suggestion.name),
    )
    .slice(0, limit)
    .map((entry) => entry.suggestion);
}

function placeSuggestion(place: GazetteerEntry, alias?: string): Suggestion {
  const region = place.parentName ? ` · ${place.parentName}` : "";
  const via =
    alias && normalizeName(alias) !== normalizeName(place.name)
      ? ` · “${alias}”`
      : "";
  return {
    id: `un:${place.locId}`,
    name: place.name,
    detail: `${levelLabel(place.level)}${region}${via}`,
    supported: true,
  };
}

function gapDetail(kind: GapKind): string {
  if (kind === "us_state") return "U.S. state · not in this release";
  if (kind === "us_county") return "U.S. county · not in this release";
  if (kind === "ca_province") return "Canadian province or territory · not in this release";
  if (kind === "uk_nation") return "Not published separately · try the United Kingdom";
  if (kind === "us_city" || kind === "ca_city" || kind === "city") {
    return "City · not in this release";
  }
  return "Not in this release";
}

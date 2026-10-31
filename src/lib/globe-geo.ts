import { feature } from "topojson-client";
import type { FeatureCollection, Geometry as GeoJsonGeometry } from "geojson";
import type { GeometryCollection, Topology } from "topojson-specification";

export type LngLat = { lat: number; lng: number };

export type FocusPoint = LngLat & { area: number };

type Ring = number[][];

type Geometry =
  | { type: "Polygon"; coordinates: Ring[] }
  | { type: "MultiPolygon"; coordinates: Ring[][] };

export type CountryShape = {
  locId: number | null;
  mapName: string;
  lat: number;
  lng: number;
  area: number;
  geometry: Geometry;
};

type WorldTopology = Topology<{
  countries: GeometryCollection<{ name?: string }>;
}>;

function wrapLng(value: number): number {
  const lng = ((((value + 180) % 360) + 360) % 360) - 180;
  return lng === -180 ? 180 : lng;
}

function openRing(ring: Ring): { points: Ring; lngs: number[] } | null {
  if (ring.length < 3) return null;
  const closed =
    ring.length > 1 && ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1];
  const points = closed ? ring.slice(0, -1) : ring;
  if (points.length < 3) return null;

  const lngs = [points[0][0]];
  for (let index = 1; index < points.length; index += 1) {
    let delta = points[index][0] - lngs[index - 1];
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;
    lngs.push(lngs[index - 1] + delta);
  }
  return { points, lngs };
}

function ringScore(points: Ring, lngs: number[]): { area: number; score: number; center: LngLat } | null {
  if (points.length < 3) return null;
  let areaSum = 0;
  let latSum = 0;
  let lngSum = 0;
  for (let index = 0; index < points.length; index += 1) {
    const next = (index + 1) % points.length;
    areaSum += lngs[index] * points[next][1] - lngs[next] * points[index][1];
    latSum += points[index][1];
    lngSum += lngs[index];
  }
  const area = Math.abs(areaSum) / 2;
  const lat = latSum / points.length;
  const weight = Math.max(Math.cos((lat * Math.PI) / 180), 0.2);
  return {
    area,
    score: area * weight,
    center: { lat, lng: wrapLng(lngSum / points.length) },
  };
}

export function ringCentroid(ring: Ring): LngLat | null {
  const opened = openRing(ring);
  if (!opened) return null;
  return ringScore(opened.points, opened.lngs)?.center ?? null;
}

function outerRings(geometry: Geometry): Ring[] {
  if (geometry.type === "Polygon") {
    return geometry.coordinates[0] ? [geometry.coordinates[0]] : [];
  }
  return geometry.coordinates.map((polygon) => polygon[0]).filter((ring): ring is Ring => Boolean(ring));
}

export function featureFocus(geometry: Geometry): FocusPoint | null {
  let best: FocusPoint | null = null;
  let bestScore = -1;
  for (const ring of outerRings(geometry)) {
    const opened = openRing(ring);
    if (!opened) continue;
    const scored = ringScore(opened.points, opened.lngs);
    if (!scored || scored.score <= bestScore) continue;
    bestScore = scored.score;
    best = { ...scored.center, area: scored.area };
  }
  return best;
}

export function featureCentroid(geometry: Geometry): LngLat | null {
  const focus = featureFocus(geometry);
  return focus ? { lat: focus.lat, lng: focus.lng } : null;
}

/** Camera distance for a country. Small countries come in closer than Russia or Canada. */
export function focusAltitude(area: number): number {
  const clamped = Math.min(Math.max(area, 0.4), 2500);
  const t = Math.log(clamped) / Math.log(2500);
  return 1.18 + t * 0.75;
}

export function isWorldTopology(value: unknown): value is WorldTopology {
  if (!value || typeof value !== "object") return false;
  const countries = (value as { objects?: { countries?: { type?: string } } }).objects?.countries;
  return countries?.type === "GeometryCollection";
}

export function countryShapes(topology: WorldTopology): CountryShape[] {
  const collection = feature(topology, topology.objects.countries) as FeatureCollection<
    GeoJsonGeometry,
    { name?: string }
  >;
  const shapes: CountryShape[] = [];
  for (const item of collection.features) {
    const geometry = item.geometry;
    if (!geometry || (geometry.type !== "Polygon" && geometry.type !== "MultiPolygon")) continue;
    const focus = featureFocus(geometry);
    if (!focus) continue;
    const idNumber = typeof item.id === "number" ? item.id : Number(item.id);
    const locId = Number.isInteger(idNumber) && idNumber >= 0 ? idNumber : null;
    const mapName = typeof item.properties?.name === "string" ? item.properties.name : "";
    shapes.push({
      locId,
      mapName,
      lat: focus.lat,
      lng: focus.lng,
      area: focus.area,
      geometry,
    });
  }
  return shapes;
}

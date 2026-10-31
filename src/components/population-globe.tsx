"use client";

import { useEffect, useRef, useState } from "react";
import type { GlobeInstance } from "globe.gl";
import { placesById } from "@/lib/gazetteer";
import {
  countryShapes,
  focusAltitude,
  isWorldTopology,
  type CountryShape,
} from "@/lib/globe-geo";

type DrawnCountry = CountryShape & { placeName: string | null };

const REST_ALTITUDE = 2.4;
const FLY_MS = 1500;

function capColor(country: DrawnCountry, selected: number | null, hover: number | null): string {
  if (country.locId != null && country.locId === selected) return "rgba(157, 255, 195, 0.84)";
  if (country.locId != null && country.locId === hover) return "rgba(157, 255, 195, 0.5)";
  return "rgba(157, 255, 195, 0.22)";
}

function capAltitude(country: DrawnCountry, selected: number | null, hover: number | null): number {
  if (country.locId != null && country.locId === selected) return 0.046;
  if (country.locId != null && country.locId === hover) return 0.02;
  return 0.007;
}

function strokeColor(country: DrawnCountry, selected: number | null, hover: number | null): string {
  if (country.locId != null && country.locId === selected) return "#e8fff2";
  if (country.locId != null && country.locId === hover) return "rgba(157, 255, 195, 0.92)";
  return "rgba(157, 255, 195, 0.4)";
}

function paintGlobe(globe: GlobeInstance, selected: number | null, hover: number | null) {
  globe
    .polygonCapColor((country: object) => capColor(country as DrawnCountry, selected, hover))
    .polygonAltitude((country: object) => capAltitude(country as DrawnCountry, selected, hover))
    .polygonStrokeColor((country: object) => strokeColor(country as DrawnCountry, selected, hover));
}

export function PopulationGlobe({
  focusLocId,
  focusName,
  onSelect,
}: {
  focusLocId: number | null;
  focusName: string | null;
  onSelect: (place: { name: string; locId: number }) => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const globeRef = useRef<GlobeInstance | null>(null);
  const shapesRef = useRef<Map<number, DrawnCountry>>(new Map());
  const selectedRef = useRef<number | null>(null);
  const hoverRef = useRef<number | null>(null);
  const heldRef = useRef(false);
  const flownRef = useRef<number | "rest" | null>(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  const [hoverName, setHoverName] = useState<string | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const node = host;
    const controller = new AbortController();
    let observer: ResizeObserver | null = null;
    let disposed = false;

    const mount = async () => {
      try {
        const [globeModule, response] = await Promise.all([
          import("globe.gl"),
          fetch("/geo/countries-110m.json", { signal: controller.signal }),
        ]);
        if (disposed) return;
        if (!response.ok) throw new Error("map");
        const topology: unknown = await response.json();
        if (disposed) return;
        if (!isWorldTopology(topology)) throw new Error("map");

        const drawn: DrawnCountry[] = countryShapes(topology).map((shape) => {
          const place = shape.locId == null ? undefined : placesById.get(shape.locId);
          const placeName = place && place.level === "country" ? place.name : null;
          return { ...shape, placeName };
        });
        const byId = new Map<number, DrawnCountry>();
        for (const country of drawn) {
          if (country.locId != null && country.placeName && !byId.has(country.locId)) {
            byId.set(country.locId, country);
          }
        }
        shapesRef.current = byId;

        const globe = new globeModule.default(node, {
          rendererConfig: { alpha: true, antialias: true },
          animateIn: false,
        });
        globeRef.current = globe;

        const material = globe.globeMaterial() as {
          color?: { set: (hex: string) => void };
          emissive?: { set: (hex: string) => void };
          shininess?: number;
        };
        material.color?.set("#0c1a16");
        material.emissive?.set("#06140f");
        material.shininess = 8;

        globe
          .backgroundColor("rgba(0,0,0,0)")
          .showGlobe(true)
          .showGraticules(false)
          .showAtmosphere(true)
          .atmosphereColor("#9dffc3")
          .atmosphereAltitude(0.17)
          .polygonsData(drawn)
          .polygonGeoJsonGeometry(
            (country: object) =>
              (country as DrawnCountry).geometry as unknown as { type: string; coordinates: number[] },
          )
          .polygonCapColor(() => "rgba(157, 255, 195, 0.22)")
          .polygonSideColor(() => "rgba(6, 20, 14, 0.92)")
          .polygonStrokeColor(() => "rgba(157, 255, 195, 0.4)")
          .polygonAltitude(() => 0.007)
          .polygonsTransitionDuration(700)
          .polygonLabel(() => "")
          .showPointerCursor(
            (type, data) => type === "polygon" && Boolean((data as DrawnCountry).placeName),
          )
          .onPolygonHover((polygon) => {
            const country = polygon as DrawnCountry | null;
            const next = country?.placeName && country.locId != null ? country.locId : null;
            if (hoverRef.current === next) return;
            hoverRef.current = next;
            setHoverName(country?.placeName ?? null);
            paintGlobe(globe, selectedRef.current, hoverRef.current);
          })
          .onPolygonClick((polygon) => {
            const country = polygon as DrawnCountry;
            if (country.locId == null || !country.placeName) return;
            heldRef.current = true;
            globe.controls().autoRotate = false;
            selectedRef.current = country.locId;
            flownRef.current = country.locId;
            globe.pointOfView(
              { lat: country.lat, lng: country.lng, altitude: focusAltitude(country.area) },
              FLY_MS,
            );
            paintGlobe(globe, selectedRef.current, hoverRef.current);
            onSelectRef.current({ name: country.placeName, locId: country.locId });
          });

        const controls = globe.controls();
        controls.autoRotate = true;
        controls.autoRotateSpeed = 0.42;
        controls.enableDamping = true;
        controls.dampingFactor = 0.08;
        controls.enableZoom = false;
        controls.minPolarAngle = 0.28;
        controls.maxPolarAngle = Math.PI - 0.28;
        controls.addEventListener("start", () => {
          heldRef.current = true;
          controls.autoRotate = false;
        });

        globe.pointOfView({ lat: 18, lng: 10, altitude: REST_ALTITUDE });

        const fit = () => {
          globe.width(Math.max(1, node.clientWidth)).height(Math.max(1, node.clientHeight));
        };
        fit();
        observer = new ResizeObserver(fit);
        observer.observe(node);
        setStatus("ready");
      } catch (error) {
        if (disposed || (error instanceof DOMException && error.name === "AbortError")) return;
        setStatus("error");
      }
    };

    void mount();

    return () => {
      disposed = true;
      controller.abort();
      observer?.disconnect();
      const globe = globeRef.current;
      globeRef.current = null;
      globe?._destructor();
    };
  }, []);

  useEffect(() => {
    if (status !== "ready") return;
    const globe = globeRef.current;
    if (!globe) return;
    const controls = globe.controls();

    if (focusLocId != null) {
      const country = shapesRef.current.get(focusLocId);
      selectedRef.current = country ? focusLocId : null;
      setMissing(!country);
      if (!country || flownRef.current === focusLocId) {
        paintGlobe(globe, selectedRef.current, hoverRef.current);
        return;
      }
      flownRef.current = focusLocId;
      controls.autoRotate = false;
      globe.pointOfView(
        { lat: country.lat, lng: country.lng, altitude: focusAltitude(country.area) },
        FLY_MS,
      );
      paintGlobe(globe, selectedRef.current, hoverRef.current);
      return;
    }

    selectedRef.current = null;
    setMissing(false);
    if (flownRef.current === "rest") {
      paintGlobe(globe, null, hoverRef.current);
      return;
    }
    flownRef.current = "rest";
    const pov = globe.pointOfView();
    globe.pointOfView({ lat: pov.lat, lng: pov.lng, altitude: REST_ALTITUDE }, 1400);
    if (!heldRef.current) controls.autoRotate = true;
    paintGlobe(globe, null, hoverRef.current);
  }, [focusLocId, status]);

  const caption = hoverName
    ? hoverName
    : missing
      ? `${focusName ?? "This place"} is not drawn on the map`
      : focusName
        ? focusName
        : "Drag to turn · click a country";

  return (
    <div
      className="border border-border bg-[#070b12]/80"
      role="group"
      aria-label="Interactive globe. Drag to rotate and tilt. Click a country to look up its population."
    >
      <div className="relative h-[280px] w-full sm:h-[340px]">
        <div ref={hostRef} className="absolute inset-0 touch-none" />
        {status === "loading" ? (
          <p className="pointer-events-none absolute inset-0 flex items-center justify-center text-[11px] tracking-[0.16em] text-muted-foreground uppercase">
            Drawing the globe
          </p>
        ) : null}
        {status === "error" ? (
          <p className="absolute inset-0 flex items-center justify-center px-6 text-center text-sm leading-6 text-muted-foreground">
            The globe map did not load. The query still works.
          </p>
        ) : null}
      </div>
      <p className="flex items-baseline justify-between gap-3 border-t border-border px-3 py-2 text-[11px] text-muted-foreground">
        <span className={hoverName || focusName ? "text-primary" : undefined}>{caption}</span>
        <span className="shrink-0 tracking-[0.14em] uppercase">
          {status === "ready" ? "Drag · tilt" : status === "error" ? "Unavailable" : "Loading"}
        </span>
      </p>
    </div>
  );
}

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { countryShapes, featureCentroid, focusAltitude, isWorldTopology, ringCentroid } from "./globe-geo";

describe("globe centroids", () => {
  it("centers a simple ring", () => {
    const center = ringCentroid([
      [0, 0],
      [10, 0],
      [10, 10],
      [0, 10],
      [0, 0],
    ]);
    expect(center?.lat).toBeCloseTo(5);
    expect(center?.lng).toBeCloseTo(5);
  });

  it("keeps a date-line ring on one side of the globe", () => {
    const center = ringCentroid([
      [170, 10],
      [-170, 10],
      [-170, 20],
      [170, 20],
      [170, 10],
    ]);
    expect(center?.lat).toBeCloseTo(15);
    expect(center?.lng).toBeGreaterThan(170);
  });

  it("uses the largest polygon in a multipolygon", () => {
    const center = featureCentroid({
      type: "MultiPolygon",
      coordinates: [
        [
          [
            [0, 0],
            [1, 0],
            [1, 1],
            [0, 0],
          ],
        ],
        [
          [
            [10, 10],
            [20, 10],
            [20, 20],
            [10, 20],
            [10, 10],
          ],
        ],
      ],
    });
    expect(center?.lat).toBeCloseTo(15);
    expect(center?.lng).toBeCloseTo(15);
  });

  it("prefers land area over a ring that merely has more vertices", () => {
    const center = featureCentroid({
      type: "MultiPolygon",
      coordinates: [
        [
          [
            [0, 0],
            [1, 0],
            [1, 0.4],
            [2, 0.4],
            [2, 0],
            [3, 0],
            [3, 0.2],
            [0, 0.2],
            [0, 0],
          ],
        ],
        [
          [
            [10, 10],
            [30, 10],
            [30, 30],
            [10, 10],
          ],
        ],
      ],
    });
    expect(center?.lng).toBeGreaterThan(10);
    expect(center?.lat).toBeGreaterThan(10);
  });

  it("brings small countries closer than very large ones", () => {
    expect(focusAltitude(1)).toBeLessThan(focusAltitude(80));
    expect(focusAltitude(80)).toBeLessThan(focusAltitude(1500));
    expect(focusAltitude(0.01)).toBeGreaterThan(1);
    expect(focusAltitude(100000)).toBeLessThan(2.1);
  });

  it("centers published countries on their main landmass", () => {
    const topology = JSON.parse(readFileSync("public/geo/countries-110m.json", "utf8")) as unknown;
    expect(isWorldTopology(topology)).toBe(true);
    if (!isWorldTopology(topology)) return;
    const shapes = countryShapes(topology);
    const japan = shapes.find((shape) => shape.locId === 392);
    const france = shapes.find((shape) => shape.locId === 250);
    const unitedStates = shapes.find((shape) => shape.locId === 840);
    expect(japan?.lat).toBeGreaterThan(30);
    expect(japan?.lat).toBeLessThan(46);
    expect(japan?.lng).toBeGreaterThan(128);
    expect(japan?.lng).toBeLessThan(146);
    expect(france?.lat).toBeGreaterThan(41);
    expect(france?.lat).toBeLessThan(51);
    expect(france?.lng).toBeGreaterThan(-5);
    expect(france?.lng).toBeLessThan(10);
    expect(unitedStates?.lat).toBeGreaterThan(24);
    expect(unitedStates?.lat).toBeLessThan(50);
    expect(unitedStates?.lng).toBeGreaterThan(-125);
    expect(unitedStates?.lng).toBeLessThan(-66);
  });
});

import { describe, expect, it } from "vitest";
import { PLACE_ALIASES } from "@/lib/aliases";
import { kindForUnYear, kindForWorldBank, observationAt } from "@/lib/classify";
import { COVERAGE } from "@/lib/coverage";
import { placesById } from "@/lib/gazetteer";
import { lookupQuery } from "@/lib/lookup";
import { parseQuery } from "@/lib/parse-query";
import { allowRequest } from "@/lib/rate-limit";
import { getUnLocation } from "@/lib/sources/un-wpp";
import type { Observation, SourceLoad } from "@/lib/types";

function wb(points: Observation[]): SourceLoad {
  return {
    ok: true,
    vintage: "8 October 2026",
    points,
    sourceUrl: "https://data.worldbank.org/indicator/SP.POP.TOTL",
    locationUrl: "https://data.worldbank.org/indicator/SP.POP.TOTL?locations=JP",
    indicator: "SP.POP.TOTL",
    license: "CC BY 4.0",
    licenseUrl: "https://www.worldbank.org/en/about/legal/terms-of-use-for-datasets",
  };
}

const japanBank = async () =>
  wb([
    { year: 1970, population: 104345000, kind: "estimate", referenceDate: "midyear" },
    { year: 2023, population: 124516650, kind: "estimate", referenceDate: "midyear" },
    { year: 2024, population: 123975371, kind: "estimate", referenceDate: "midyear" },
    { year: 2025, population: 123366734, kind: "estimate", referenceDate: "midyear" },
  ]);

const down = async (): Promise<SourceLoad> => ({
  ok: false,
  message: "The World Bank request timed out or could not connect.",
});

describe("parseQuery", () => {
  it("parses the main command shapes", () => {
    expect(parseQuery("population Japan 2050")).toMatchObject({
      locationText: "Japan",
      year: 2050,
      mode: "year",
    });
    expect(parseQuery("United States population 1990")).toMatchObject({
      locationText: "United States",
      year: 1990,
      mode: "year",
    });
    expect(parseQuery("population Canada 2025")).toMatchObject({
      locationText: "Canada",
      year: 2025,
      mode: "year",
    });
    expect(parseQuery("population Germany 1970")).toMatchObject({
      locationText: "Germany",
      year: 1970,
      mode: "year",
    });
    expect(parseQuery("population of the United States in 1990")).toMatchObject({
      locationText: "United States",
      year: 1990,
    });
    expect(parseQuery("2050 Japan")).toMatchObject({ locationText: "Japan", year: 2050 });
    expect(parseQuery("population Japan now")).toMatchObject({
      locationText: "Japan",
      mode: "latest",
      year: null,
    });
  });

  it("asks for a year instead of assuming one", () => {
    const parsed = parseQuery("population Japan");
    expect(parsed.mode).toBe("needs_year");
    expect(parsed.locationText).toBe("Japan");
  });

  it("rejects two years and an empty query", () => {
    expect(parseQuery("population Japan 1990 2050").mode).toBe("invalid");
    expect(parseQuery("   ").mode).toBe("invalid");
    expect(parseQuery("population in 2020").mode).toBe("invalid");
  });

  it("keeps the ISO code IN", () => {
    expect(parseQuery("population IN 2020")).toMatchObject({
      locationText: "IN",
      year: 2020,
      mode: "year",
    });
  });
});

describe("projection labeling and year boundaries", () => {
  it("keeps 2023 as an estimate and 2024 onward as a projection", () => {
    expect(kindForUnYear(1950)).toBe("estimate");
    expect(kindForUnYear(COVERAGE.unEstimateThrough)).toBe("estimate");
    expect(kindForUnYear(2024)).toBe("projection");
    expect(kindForUnYear(2025)).toBe("projection");
    expect(kindForUnYear(2026)).toBe("projection");
    expect(kindForUnYear(2100)).toBe("projection");
    expect(kindForWorldBank()).toBe("estimate");
  });

  it("does not invent a missing year", () => {
    const points = [
      { year: 2009, population: 100, kind: "estimate" as const, referenceDate: "midyear" },
      { year: 2011, population: 300, kind: "estimate" as const, referenceDate: "midyear" },
    ];
    expect(observationAt(points, 2010)).toBeNull();
    expect(observationAt(points, 2009)?.population).toBe(100);
  });
});

describe("lookup", () => {
  it("labels Japan 2050 as a UN projection and does not invent a World Bank value", async () => {
    const response = await lookupQuery(
      { q: "population Japan 2050" },
      { worldBank: japanBank },
    );
    expect(response.status).toBe("ok");
    if (response.status !== "ok") return;
    expect(response.result.headline).toMatchObject({
      population: 105_123_167,
      year: 2050,
      kind: "projection",
      sourceId: "un-wpp",
      variant: "Medium",
    });
    expect(response.result.un.observation.kind).toBe("projection");
    expect(response.result.worldBank.observation).toBeNull();
    expect(response.result.worldBank.status).toBe("missing_year");
    expect(response.result.worldBank.latest?.year).toBe(2025);
    expect(response.result.worldBank.message).toMatch(/interpolat/i);
    expect(response.result.caveat).toMatch(/projection/i);
    expect(response.result.realtimeNote).toMatch(/not measure population in real time/i);
    expect(response.result.chart.find((point) => point.year === 2050)?.worldBank).toBeNull();
  });

  it("labels Japan 1970 as an estimate and keeps the World Bank figure separate", async () => {
    const response = await lookupQuery(
      { q: "population Japan 1970" },
      { worldBank: japanBank },
    );
    expect(response.status).toBe("ok");
    if (response.status !== "ok") return;
    expect(response.result.headline).toMatchObject({
      population: 106_712_368,
      kind: "estimate",
      sourceId: "un-wpp",
    });
    expect(response.result.worldBank.observation?.population).toBe(104_345_000);
    expect(response.result.worldBank.observation?.kind).toBe("estimate");
    expect(response.result.headline.population).not.toBe(
      Math.round((106_712_368 + 104_345_000) / 2),
    );
  });

  it("prefers a published World Bank estimate over a UN projection for the same year", async () => {
    const response = await lookupQuery(
      { q: "population Canada 2025" },
      {
        worldBank: async () =>
          wb([
            { year: 2024, population: 41_000_000, kind: "estimate", referenceDate: "midyear" },
            { year: 2025, population: 41_500_000, kind: "estimate", referenceDate: "midyear" },
          ]),
      },
    );
    expect(response.status).toBe("ok");
    if (response.status !== "ok") return;
    expect(response.result.headline).toMatchObject({
      population: 41_500_000,
      year: 2025,
      kind: "estimate",
      sourceId: "world-bank",
    });
    expect(response.result.un.observation.kind).toBe("projection");
    expect(response.result.un.observation.population).toBeGreaterThan(35_000_000);
    expect(response.result.un.observation.population).toBeLessThan(50_000_000);
    expect(response.result.explanation).toMatch(/projection/i);
  });

  it("uses the latest estimate for now, not the calendar year", async () => {
    const withBank = await lookupQuery({ q: "population Japan now" }, { worldBank: japanBank });
    expect(withBank.status).toBe("ok");
    if (withBank.status !== "ok") return;
    expect(withBank.result.requestedYear).toBe(2025);
    expect(withBank.result.headline.kind).toBe("estimate");
    expect(withBank.result.headline.sourceId).toBe("world-bank");

    const withoutBank = await lookupQuery({ q: "population Japan now" }, { worldBank: down });
    expect(withoutBank.status).toBe("ok");
    if (withoutBank.status !== "ok") return;
    expect(withoutBank.result.requestedYear).toBe(2023);
    expect(withoutBank.result.headline).toMatchObject({
      population: 124_370_947,
      kind: "estimate",
      sourceId: "un-wpp",
    });
  });

  it("stops at the UN year boundaries", async () => {
    const early = await lookupQuery({ q: "population Germany 1949" }, { worldBank: down });
    expect(early.status).toBe("out_of_range");
    expect(early).not.toHaveProperty("result");

    const late = await lookupQuery({ q: "population Germany 2101" }, { worldBank: down });
    expect(late.status).toBe("out_of_range");

    const first = await lookupQuery({ q: "population Japan 1950" }, { worldBank: down });
    expect(first.status).toBe("ok");
    if (first.status === "ok") {
      expect(first.result.headline).toMatchObject({
        year: 1950,
        population: 86_443_277,
        kind: "estimate",
      });
    }

    const last = await lookupQuery({ q: "population Japan 2100" }, { worldBank: down });
    expect(last.status).toBe("ok");
    if (last.status === "ok") {
      expect(last.result.headline).toMatchObject({
        year: 2100,
        population: 76_845_989,
        kind: "projection",
      });
    }
  });

  it("checks known country magnitudes so thousands are not treated as persons", async () => {
    const germany = await lookupQuery({ q: "population Germany 1970" }, { worldBank: down });
    expect(germany.status).toBe("ok");
    if (germany.status !== "ok") return;
    expect(germany.result.headline.kind).toBe("estimate");
    expect(germany.result.headline.population).toBeGreaterThan(70_000_000);
    expect(germany.result.headline.population).toBeLessThan(85_000_000);

    const unitedStates = await lookupQuery(
      { q: "United States population 1990" },
      { worldBank: down },
    );
    expect(unitedStates.status).toBe("ok");
    if (unitedStates.status !== "ok") return;
    expect(unitedStates.result.place.iso3).toBe("USA");
    expect(unitedStates.result.headline.population).toBeGreaterThan(240_000_000);
    expect(unitedStates.result.headline.population).toBeLessThan(270_000_000);

    const world = await lookupQuery({ q: "population World 2023" }, { worldBank: down });
    expect(world.status).toBe("ok");
    if (world.status !== "ok") return;
    expect(world.result.place.level).toBe("world");
    expect(world.result.headline.population).toBeGreaterThan(7_500_000_000);
    expect(world.result.headline.population).toBeLessThan(8_500_000_000);
    expect(world.result.worldBank.status).toBe("not_applicable");
  });

  it("does not call the World Bank for a regional aggregate", async () => {
    let calls = 0;
    const response = await lookupQuery(
      { q: "population World 2100" },
      {
        worldBank: async () => {
          calls += 1;
          return down();
        },
      },
    );
    expect(calls).toBe(0);
    expect(response.status).toBe("ok");
    if (response.status === "ok") expect(response.result.headline.kind).toBe("projection");
  });

  it("keeps a UN result when the World Bank is down", async () => {
    const response = await lookupQuery(
      { q: "population Puerto Rico 2020" },
      { worldBank: down },
    );
    expect(response.status).toBe("ok");
    if (response.status !== "ok") return;
    expect(response.result.place.iso3).toBe("PRI");
    expect(response.result.headline.kind).toBe("estimate");
    expect(response.result.headline.population).toBeGreaterThan(2_500_000);
    expect(response.result.headline.population).toBeLessThan(4_500_000);
    expect(response.result.worldBank.status).toBe("unavailable");
  });

  it("disambiguates Korea, Congo, and Georgia", async () => {
    const korea = await lookupQuery({ q: "population Korea 2020" }, { worldBank: down });
    expect(korea.status).toBe("disambiguation");
    if (korea.status === "disambiguation") {
      expect(korea.options.map((option) => option.name)).toEqual(
        expect.arrayContaining(["Republic of Korea", "Dem. People's Republic of Korea"]),
      );
    }

    const congo = await lookupQuery({ q: "congo 2000" }, { worldBank: down });
    expect(congo.status).toBe("disambiguation");

    const georgia = await lookupQuery({ q: "population Georgia 2000" }, { worldBank: down });
    expect(georgia.status).toBe("disambiguation");
    if (georgia.status === "disambiguation") {
      expect(georgia.options.some((option) => option.supported && option.name === "Georgia")).toBe(
        true,
      );
      expect(georgia.options.some((option) => !option.supported)).toBe(true);
    }
  });

  it("refuses subnational places instead of estimating them", async () => {
    const california = await lookupQuery(
      { q: "population California 2020" },
      { worldBank: down },
    );
    expect(california.status).toBe("unsupported");
    if (california.status === "unsupported") {
      expect(california.detail).toMatch(/Census/i);
      expect(california.alternatives[0]?.query).toMatch(/United States/);
    }

    const tokyo = await lookupQuery({ q: "population Tokyo 2024" }, { worldBank: down });
    expect(tokyo.status).toBe("unsupported");
    if (tokyo.status === "unsupported") {
      expect(tokyo.detail).toMatch(/city/i);
      expect(tokyo.alternatives[0]?.query).toMatch(/Japan/);
    }

    const ontario = await lookupQuery({ q: "Ontario 2021" }, { worldBank: down });
    expect(ontario.status).toBe("unsupported");
    if (ontario.status === "unsupported") {
      expect(ontario.detail).toMatch(/Statistics Canada/i);
    }

    const england = await lookupQuery({ q: "population England 2011" }, { worldBank: down });
    expect(england.status).toBe("unsupported");

    const county = await lookupQuery({ q: "population Cook County 2020" }, { worldBank: down });
    expect(county.status).toBe("unsupported");
    if (county.status === "unsupported") expect(county.detail).toMatch(/county/i);
  });

  it("reports a missing place and corrects a one-character typo", async () => {
    const missing = await lookupQuery({ q: "population Atlantis 2000" }, { worldBank: down });
    expect(missing.status).toBe("not_found");

    const typo = await lookupQuery({ q: "population Japn 2050" }, { worldBank: japanBank });
    expect(typo.status).toBe("ok");
    if (typo.status === "ok") {
      expect(typo.result.place.iso3).toBe("JPN");
      expect(typo.result.headline.kind).toBe("projection");
      expect(typo.result.interpretation).toMatch(/Japn/);
    }
  });

  it("asks for a year when the place is known", async () => {
    const response = await lookupQuery({ q: "population France" }, { worldBank: down });
    expect(response.status).toBe("needs_year");
  });

  it("resolves every alias to a real location", () => {
    for (const ids of Object.values(PLACE_ALIASES)) {
      for (const id of Array.isArray(ids) ? ids : [ids]) {
        expect(placesById.get(id)).toBeTruthy();
      }
    }
  });

  it("locks the Japan conversion against the official thousands", () => {
    const japan = getUnLocation(392);
    expect(japan?.pop[1970 - 1950]).toBe(106_712_368);
    expect(japan?.pop[2023 - 1950]).toBe(124_370_947);
    expect(japan?.pop[2050 - 1950]).toBe(105_123_167);
  });
});

describe("allowRequest", () => {
  it("blocks the 41st call in the same minute", () => {
    const ip = `test-${Math.random()}`;
    for (let i = 0; i < 40; i += 1) expect(allowRequest(ip, 1_000)).toBe(true);
    expect(allowRequest(ip, 1_000)).toBe(false);
    expect(allowRequest(ip, 1_000 + 60_000)).toBe(true);
  });
});

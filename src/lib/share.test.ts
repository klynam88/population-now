import { describe, expect, it } from "vitest";
import { brandShare, resultShare } from "./share";

describe("share cards", () => {
  it("describes the site without inventing a population", () => {
    const card = brandShare();
    expect(card.figure).toBeNull();
    expect(card.description).toContain("Not a live population clock");
    expect(card.description.toLowerCase()).not.toContain("census");
  });

  it("puts the published figure and kind on a result card", () => {
    const card = resultShare({
      placeName: "Japan",
      level: "country",
      year: 2050,
      population: 105123167,
      kind: "projection",
      referenceDate: "1 July",
      sourceId: "un-wpp",
    });
    expect(card.title).toBe("Japan, 2050");
    expect(card.figure).toBe("105,123,167");
    expect(card.description).toContain("medium-variant projection");
    expect(card.description).toContain("Not a live count");
    expect(card.tone).toBe("projection");
  });

  it("labels a World Bank headline as an estimate", () => {
    const card = resultShare({
      placeName: "Canada",
      level: "country",
      year: 2025,
      population: 41651653,
      kind: "estimate",
      referenceDate: "1 July",
      sourceId: "world-bank",
    });
    expect(card.description).toContain("World Bank estimate");
    expect(card.description).not.toContain("medium-variant");
  });
});

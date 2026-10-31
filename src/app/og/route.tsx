import { ImageResponse } from "next/og";
import { lookupQuery } from "@/lib/lookup";
import { brandShare, resultShare } from "@/lib/share";
import { OG_HEIGHT, OG_WIDTH } from "@/lib/site";
import { loadOgAssets, ogCard } from "@/og/card";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim().slice(0, 160) ?? "";
  let card = brandShare();
  if (query) {
    try {
      const result = await lookupQuery({ q: query });
      if (result.status === "ok") {
        card = resultShare({
          placeName: result.result.place.name,
          level: result.result.place.level,
          year: result.result.headline.year,
          population: result.result.headline.population,
          kind: result.result.headline.kind,
          referenceDate: result.result.headline.referenceDate,
          sourceId: result.result.headline.sourceId,
        });
      }
    } catch {
      card = brandShare();
    }
  }

  const { backgroundUrl, fonts } = await loadOgAssets();
  return new ImageResponse(ogCard(card, backgroundUrl), {
    width: OG_WIDTH,
    height: OG_HEIGHT,
    fonts,
    headers: {
      "Cache-Control": card.tone === "brand" && query
        ? "no-store"
        : "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800",
    },
  });
}

import { headers } from "next/headers";

export const SITE_NAME = "Population.Now";

export const SITE_TITLE = "Population.Now — past, present, and projected population";

export const SITE_DESCRIPTION =
  "Look up a country, a UN region, or the world from 1950 to 2100. Published estimates and projections from the UN and the World Bank. Not a live population clock.";

export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;

export const OG_ALT = "Population.Now. A sea-green globe beside Past. Present. Future.";

const FALLBACK_ORIGIN = "https://orangered-grouse-161459.hostingersite.com";

export async function siteUrl(): Promise<URL> {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured && /^https?:\/\//.test(configured)) return new URL(configured);

  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
  if (!host) return new URL(FALLBACK_ORIGIN);
  const forwarded = headerList.get("x-forwarded-proto");
  const local = /^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/.test(host);
  const proto = forwarded ?? (local ? "http" : "https");
  return new URL(`${proto}://${host}`);
}

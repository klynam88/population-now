import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const origin = await siteUrl();
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: new URL("/sitemap.xml", origin).toString(),
    host: origin.host,
  };
}

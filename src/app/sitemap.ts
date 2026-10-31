import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = await siteUrl();
  return [
    { url: new URL("/", origin).toString(), changeFrequency: "weekly", priority: 1 },
    { url: new URL("/about", origin).toString(), changeFrequency: "monthly", priority: 0.6 },
  ];
}

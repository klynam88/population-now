import type { Metadata } from "next";
import { cache } from "react";
import { TerminalApp } from "@/components/terminal-app";
import { lookupQuery } from "@/lib/lookup";
import { resultShare } from "@/lib/share";
import { OG_HEIGHT, OG_WIDTH } from "@/lib/site";
import type { LookupResponse } from "@/lib/types";

type Search = { q?: string | string[] };

const loadInitial = cache(async (q: string) => lookupQuery({ q }));

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Search>;
}): Promise<Metadata> {
  const params = await searchParams;
  const raw = Array.isArray(params.q) ? params.q[0] : params.q;
  const q = raw?.trim().slice(0, 160);
  if (!q) return {};
  let result: LookupResponse | null = null;
  try {
    result = await loadInitial(q);
  } catch {
    result = null;
  }
  if (!result || result.status !== "ok") {
    return {
      title: { absolute: `${q} · Population.Now` },
      description: "That query did not return a published population figure.",
      robots: { index: false, follow: true },
      alternates: { canonical: `/q?q=${encodeURIComponent(q)}` },
    };
  }
  const card = resultShare({
    placeName: result.result.place.name,
    level: result.result.place.level,
    year: result.result.headline.year,
    population: result.result.headline.population,
    kind: result.result.headline.kind,
    referenceDate: result.result.headline.referenceDate,
    sourceId: result.result.headline.sourceId,
  });
  const path = `/q?q=${encodeURIComponent(q)}`;
  const image = `/og?q=${encodeURIComponent(q)}`;
  return {
    title: { absolute: `${card.title} · Population.Now` },
    description: card.description,
    alternates: { canonical: path },
    openGraph: {
      title: `${card.title} · Population.Now`,
      description: card.description,
      url: path,
      images: [{ url: image, width: OG_WIDTH, height: OG_HEIGHT, alt: card.imageAlt }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${card.title} · Population.Now`,
      description: card.description,
      images: [{ url: image, width: OG_WIDTH, height: OG_HEIGHT, alt: card.imageAlt }],
    },
  };
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const params = await searchParams;
  const raw = Array.isArray(params.q) ? params.q[0] : params.q;
  const q = raw?.slice(0, 160) ?? "";
  let initial: LookupResponse | null = null;
  if (q.trim()) {
    try {
      initial = await loadInitial(q);
    } catch {
      initial = {
        status: "error",
        message: "The lookup failed before a figure could be read.",
      };
    }
  }

  return <TerminalApp initialQuery={q} initialResult={initial} />;
}

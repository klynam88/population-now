import type { Metadata } from "next";
import { TerminalApp } from "@/components/terminal-app";
import { lookupQuery } from "@/lib/lookup";
import type { LookupResponse } from "@/lib/types";

type Search = { q?: string | string[] };

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Search>;
}): Promise<Metadata> {
  const params = await searchParams;
  const raw = Array.isArray(params.q) ? params.q[0] : params.q;
  const q = raw?.trim();
  if (!q) return { title: "Population.Now" };
  return {
    title: q,
    description: `Population lookup for ${q}. Published estimates and projections only.`,
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
      initial = await lookupQuery({ q });
    } catch {
      initial = {
        status: "error",
        message: "The lookup failed before a figure could be read.",
      };
    }
  }

  return <TerminalApp initialQuery={q} initialResult={initial} />;
}

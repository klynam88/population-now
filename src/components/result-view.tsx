"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { TrendChart } from "@/components/trend-chart";
import { formatPeople, kindLabel, levelLabel } from "@/lib/format";
import type { PopulationResult } from "@/lib/types";

function shareText(result: PopulationResult): string {
  const when =
    result.headline.referenceDate === "midyear"
      ? `Midyear ${result.headline.year}`
      : `${result.headline.referenceDate} ${result.headline.year}`;
  return [
    `${result.place.name} — ${levelLabel(result.place.level).toLowerCase()}`,
    `${formatPeople(result.headline.population)} people`,
    `${kindLabel(result.headline.kind)} · ${when}`,
    `${result.headline.organization} · ${result.headline.dataset}`,
    result.headline.variant ? `Variant: ${result.headline.variant}` : null,
    result.headline.vintage,
    result.headline.sourceUrl,
    result.realtimeNote,
  ]
    .filter((line): line is string => Boolean(line))
    .join("\n");
}

export function ResultView({
  result,
  onSelectYear,
}: {
  result: PopulationResult;
  onSelectYear: (year: number) => void;
}) {
  const [copied, setCopied] = useState<"link" | "text" | null>(null);
  const kind = result.headline.kind;
  const when =
    result.headline.referenceDate === "midyear"
      ? `Midyear ${result.headline.year}`
      : `${result.headline.referenceDate} ${result.headline.year}`;

  async function copy(value: string, which: "link" | "text") {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(which);
    } catch {
      setCopied(null);
    }
  }

  const rows = result.chart;

  return (
    <article className="border border-border bg-card/80">
      <header className="border-b border-border px-4 py-4 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] tracking-[0.18em] text-muted-foreground uppercase">
              {levelLabel(result.place.level)}
              {result.place.parentName ? ` · ${result.place.parentName}` : ""}
              {result.place.iso3 ? ` · ${result.place.iso3}` : ""}
            </p>
            <h2 className="mt-2 text-2xl text-foreground sm:text-3xl">{result.place.name}</h2>
          </div>
          <p
            className={
              kind === "projection"
                ? "border border-[#e7c98a]/50 px-2 py-1 text-[11px] tracking-[0.16em] text-[#e7c98a] uppercase"
                : "border border-primary/40 px-2 py-1 text-[11px] tracking-[0.16em] text-primary uppercase"
            }
          >
            {kindLabel(kind)}
          </p>
        </div>
        {result.interpretation ? (
          <p className="mt-3 text-sm text-muted-foreground">{result.interpretation}</p>
        ) : null}
        {result.yearMode === "latest_estimate" ? (
          <p className="mt-3 text-sm text-muted-foreground">
            “Now” is the latest published estimate in these sources, reference year{" "}
            {result.requestedYear}. It is not a live count for the current calendar year.
          </p>
        ) : null}
      </header>

      <div className="px-4 py-6 sm:px-6">
        <p className="text-5xl leading-none tracking-tight text-foreground tabular-nums sm:text-7xl">
          {formatPeople(result.headline.population)}
        </p>
        <p className="mt-4 text-sm text-foreground">
          {when}
          <span className="text-muted-foreground"> · {result.headline.organization}</span>
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {result.headline.dataset}
          {result.headline.variant ? ` · ${result.headline.variant} variant` : ""}
          {" · "}
          {result.headline.vintage}
        </p>
        {result.yoyLabel ? (
          <p className="mt-3 text-sm text-muted-foreground">{result.yoyLabel}</p>
        ) : null}

        <p className="mt-6 max-w-3xl text-sm leading-6 text-foreground/90">{result.explanation}</p>
        {result.caveat ? (
          <p className="mt-3 max-w-3xl border-l-2 border-[#e7c98a] pl-3 text-sm leading-6 text-[#e7c98a]">
            {result.caveat}
          </p>
        ) : null}
        <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">{result.realtimeNote}</p>

        <TrendChart
          points={result.chart}
          year={result.requestedYear}
          estimateThrough={result.estimateThroughYear}
          onSelectYear={onSelectYear}
        />

        <section className="mt-6 grid gap-3 border border-border bg-background/40 p-4 sm:grid-cols-2">
          <div>
            <h3 className="text-[11px] tracking-[0.16em] text-muted-foreground uppercase">
              United Nations
            </h3>
            <p className="mt-2 text-lg tabular-nums">
              {formatPeople(result.un.observation.population)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {kindLabel(result.un.observation.kind)} · 1 July {result.un.observation.year} ·{" "}
              {result.un.variant} variant
            </p>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">{result.un.vintage}</p>
            <a
              className="mt-2 inline-block text-xs text-primary underline-offset-4 hover:underline"
              href={result.un.locationUrl}
              target="_blank"
              rel="noreferrer"
            >
              UN data portal for this place
            </a>
          </div>
          <div>
            <h3 className="text-[11px] tracking-[0.16em] text-muted-foreground uppercase">
              World Bank
            </h3>
            <p className="mt-2 text-lg tabular-nums">
              {result.worldBank.observation
                ? formatPeople(result.worldBank.observation.population)
                : "—"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {result.worldBank.observation
                ? `${kindLabel(result.worldBank.observation.kind)} · midyear ${result.worldBank.observation.year} · ${result.worldBank.indicator}`
                : result.worldBank.indicator}
            </p>
            {result.worldBank.message ? (
              <p className="mt-2 text-xs leading-5 text-muted-foreground">{result.worldBank.message}</p>
            ) : null}
            {result.worldBank.locationUrl ? (
              <a
                className="mt-2 inline-block text-xs text-primary underline-offset-4 hover:underline"
                href={result.worldBank.locationUrl}
                target="_blank"
                rel="noreferrer"
              >
                World Bank indicator for this place
              </a>
            ) : null}
          </div>
        </section>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            className="font-mono"
            onClick={() =>
              copy(
                `${window.location.origin}/?q=${encodeURIComponent(
                  `population ${result.place.name} ${result.requestedYear}`,
                )}`,
                "link",
              )
            }
          >
            {copied === "link" ? "Link copied" : "Copy link"}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="font-mono"
            onClick={() => copy(shareText(result), "text")}
          >
            {copied === "text" ? "Summary copied" : "Copy summary"}
          </Button>
          <Link
            href="/about"
            className="inline-flex h-8 items-center px-2.5 text-sm text-muted-foreground hover:text-primary"
          >
            About the data
          </Link>
        </div>

        <details className="mt-6 border border-border">
          <summary className="cursor-pointer px-4 py-3 text-xs tracking-[0.14em] text-muted-foreground uppercase">
            Annual figures
          </summary>
          <div className="max-h-80 overflow-auto border-t border-border">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">
                Annual population for {result.place.name} from United Nations and World Bank series
              </caption>
              <thead className="sticky top-0 bg-card text-[11px] tracking-wide text-muted-foreground uppercase">
                <tr>
                  <th className="px-4 py-2 font-normal">Year</th>
                  <th className="px-4 py-2 font-normal">UN</th>
                  <th className="px-4 py-2 font-normal">UN status</th>
                  <th className="px-4 py-2 font-normal">World Bank</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((point) => (
                  <tr
                    key={point.year}
                    className={
                      point.year === result.requestedYear
                        ? "bg-primary/10 text-foreground"
                        : "text-muted-foreground"
                    }
                  >
                    <td className="px-4 py-1.5 tabular-nums">{point.year}</td>
                    <td className="px-4 py-1.5 tabular-nums">{formatPeople(point.un)}</td>
                    <td className="px-4 py-1.5">{kindLabel(point.unKind)}</td>
                    <td className="px-4 py-1.5 tabular-nums">
                      {point.worldBank === null ? "—" : formatPeople(point.worldBank)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="border-t border-border px-4 py-3 text-xs leading-5 text-muted-foreground">
            Every year from {result.chart[0]?.year} to {result.chart[result.chart.length - 1]?.year}{" "}
            is listed. Blank World Bank cells were not published. They are not filled in.
          </p>
        </details>
      </div>
    </article>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { gazetteer } from "@/lib/gazetteer";
import { COVERAGE } from "@/lib/coverage";
import { SOURCE_CATALOG } from "@/lib/sources/registry";
import { unDataset } from "@/lib/sources/un-wpp";

export const metadata: Metadata = {
  title: "About the data",
  description:
    "Sources, year ranges, and limits for Population.Now. United Nations World Population Prospects 2024 and World Bank SP.POP.TOTL.",
};

export default function AboutPage() {
  const countries = gazetteer.locations.filter((place) => place.level === "country").length;
  const regions = gazetteer.locations.filter((place) => place.level === "region").length;

  return (
    <article className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <p className="text-[11px] tracking-[0.18em] text-primary uppercase">About the data</p>
      <h1 className="mt-3 text-3xl tracking-tight sm:text-4xl">What a number on this site is</h1>
      <p className="mt-4 text-sm leading-7 text-muted-foreground">
        Population.Now answers a place and a year with a published figure, the organization that
        published it, and whether that figure is an estimate or a projection. It does not count
        people, and it does not invent a number when a source is silent.
      </p>

      <section className="mt-10">
        <h2 className="text-lg">How to read a result</h2>
        <ul className="mt-3 space-y-2 text-sm leading-6 text-foreground/90">
          <li>The large number is the headline. Its label says estimate or projection.</li>
          <li>United Nations and World Bank values are shown separately. They are never averaged.</li>
          <li>
            “Now”, “current”, and “latest” mean the newest published estimate, not today’s calendar
            year. In the 2024 UN revision that newest estimate year is {COVERAGE.unEstimateThrough}.
            If the World Bank has a later published estimate, that later year is used and labeled.
          </li>
          <li>A blank cross-check means that source did not publish the year. The blank is not filled.</li>
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="text-lg">United Nations World Population Prospects 2024</h2>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">
          Country, region, and world totals come from the official medium-variant file{" "}
          <span className="text-foreground">WPP2024_TotalPopulationBySex.csv.gz</span>, indicator
          PopTotal for both sexes. In the source file the unit is thousands of persons. This site
          stores persons, rounded to the nearest person. The reference date is 1 July.
        </p>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">
          In this revision, {COVERAGE.unStart}–{COVERAGE.unEstimateThrough} are estimates and{" "}
          {COVERAGE.unProjectionFrom}–{COVERAGE.unEnd} are medium-variant projections. That split
          does not move because the calendar does. A query for 2025 or 2026 is still a projection
          in the 2024 revision, even when a newer World Bank estimate exists for the same year.
        </p>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">
          Estimates are reconstructed from censuses, vital registration, and other official
          statistics. They are not a census count for 1 July of the requested year. Projections are
          scenarios for fertility, mortality, and migration. The medium variant is the central
          scenario, not a promise.
        </p>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div className="border border-border p-3">
            <dt className="text-[11px] tracking-wide text-muted-foreground uppercase">File retrieved</dt>
            <dd className="mt-1">{unDataset.retrievedAt}</dd>
          </div>
          <div className="border border-border p-3">
            <dt className="text-[11px] tracking-wide text-muted-foreground uppercase">SHA-256</dt>
            <dd className="mt-1 break-all text-xs">{unDataset.sourceSha256}</dd>
          </div>
        </dl>
        <p className="mt-3 text-sm leading-7">
          <a className="text-primary hover:underline" href={unDataset.sourceUrl}>
            population.un.org/wpp
          </a>
          <span className="text-muted-foreground"> · </span>
          <a className="text-primary hover:underline" href={unDataset.methodologyUrl}>
            Methodology
          </a>
          <span className="text-muted-foreground"> · </span>
          <a className="text-primary hover:underline" href={unDataset.downloadUrl}>
            Source file
          </a>
          <span className="text-muted-foreground"> · </span>
          <a className="text-primary hover:underline" href={unDataset.licenseUrl}>
            {unDataset.license}
          </a>
        </p>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">{unDataset.citation}</p>
      </section>

      <section className="mt-10">
        <h2 className="text-lg">World Bank, SP.POP.TOTL</h2>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">
          For countries and areas with an ISO alpha-2 code, the server requests indicator
          SP.POP.TOTL from the public World Bank API. The World Bank describes it as the de facto
          midyear population: all residents, regardless of legal status or citizenship. Those
          values are labeled estimates here, including years the UN 2024 revision still projects.
          The series generally starts in {COVERAGE.wbStart}. The last year is whatever the API has
          published for that country. The vintage on each result is the API’s lastupdated field.
        </p>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">
          On 25 October 2026 the indicator metadata reported an update on 8 October 2026, and Japan’s
          series included 2025. That check is not a guarantee for every country, and the live
          response is what the page shows.
        </p>
        <p className="mt-3 text-sm leading-7">
          <a
            className="text-primary hover:underline"
            href="https://data.worldbank.org/indicator/SP.POP.TOTL"
          >
            data.worldbank.org/indicator/SP.POP.TOTL
          </a>
          <span className="text-muted-foreground"> · CC BY 4.0</span>
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-lg">Estimates, projections, census counts, interpolation</h2>
        <ul className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
          <li>
            <span className="text-foreground">Estimate.</span> A published reconstruction for a
            reference date. UN historical years and every World Bank SP.POP.TOTL value shown here.
          </li>
          <li>
            <span className="text-foreground">Projection.</span> A UN medium-variant scenario for{" "}
            {COVERAGE.unProjectionFrom}–{COVERAGE.unEnd}.
          </li>
          <li>
            <span className="text-foreground">Census count.</span> Not used in this release. A
            census year in the UN or World Bank series is still labeled an estimate, because these
            files are not the census enumeration itself.
          </li>
          <li>
            <span className="text-foreground">Interpolation.</span> Not used. If a year is missing,
            the cell stays empty.
          </li>
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="text-lg">Geography that works</h2>
        <div className="mt-3 overflow-x-auto border border-border">
          <table className="w-full text-left text-sm">
            <thead className="text-[11px] tracking-wide text-muted-foreground uppercase">
              <tr>
                <th className="px-3 py-2 font-normal">Level</th>
                <th className="px-3 py-2 font-normal">Count</th>
                <th className="px-3 py-2 font-normal">Years</th>
              </tr>
            </thead>
            <tbody className="text-foreground/90">
              <tr className="border-t border-border">
                <td className="px-3 py-2">Country or area</td>
                <td className="px-3 py-2 tabular-nums">{countries}</td>
                <td className="px-3 py-2">
                  UN {COVERAGE.unStart}–{COVERAGE.unEnd}. World Bank from {COVERAGE.wbStart} when the
                  API has a value.
                </td>
              </tr>
              <tr className="border-t border-border">
                <td className="px-3 py-2">UN region or subregion</td>
                <td className="px-3 py-2 tabular-nums">{regions}</td>
                <td className="px-3 py-2">UN only, {COVERAGE.unStart}–{COVERAGE.unEnd}</td>
              </tr>
              <tr className="border-t border-border">
                <td className="px-3 py-2">World</td>
                <td className="px-3 py-2">1</td>
                <td className="px-3 py-2">UN only, {COVERAGE.unStart}–{COVERAGE.unEnd}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">
          Names are the World Population Prospects 2024 names. “Taiwan” resolves to “China, Taiwan
          Province of China”. “Hong Kong” resolves to “China, Hong Kong SAR”. Territories such as
          Puerto Rico, Greenland, and Guam are countries or areas in this file, not U.S. state
          estimates. Two-letter codes follow ISO 3166-1, so CA is Canada and GA is Gabon.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-lg">Geography that does not</h2>
        <ul className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
          {SOURCE_CATALOG.filter((source) => source.status === "unavailable").map((source) => (
            <li key={source.id}>
              <span className="text-foreground">{source.organization}.</span> {source.covers}
            </li>
          ))}
          <li>Cities everywhere. No city population is estimated from a country total.</li>
          <li>England, Scotland, Wales, and Northern Ireland. The published series is the United Kingdom.</li>
          <li>Years before {COVERAGE.unStart} and after {COVERAGE.unEnd}.</li>
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="text-lg">Refresh, cache, and abuse limits</h2>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">
          World Bank responses are cached for 24 hours and time out after 12 seconds. If that
          request fails, the UN figure still appears and the cross-check says it was unavailable.
          Lookups are limited to 40 a minute per server instance. That limit is a basic guard, not
          a global firewall. No API key is required for this release.
        </p>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">
          To replace the UN extract after a new revision, run <code>npm run data:refresh</code>,
          then update the coverage constants if the estimate and projection years change. The raw
          download is not committed. The compact series in the repository is produced by that
          script.
        </p>
      </section>

      <p className="mt-10 text-sm">
        <Link href="/" className="text-primary hover:underline">
          Return to the query
        </Link>
      </p>
    </article>
  );
}

# Population.Now

Past. Present. Future.

Population.Now is a terminal-style lookup for published population figures. Type a place and a year. The result names the geography, states whether the figure is an estimate or a projection, and links the organization that published it.

It is not a live population clock. It does not invent city populations, and it does not fill gaps by interpolation.

The globe on the home page spins until a country result arrives, then turns to that country. Drag rotates and tilts it. A click runs the same lookup as the terminal and keeps the year already in the query when there is one. Zoom stays off so the page can still scroll.

A shared link uses a large preview image. The home page shows the wordmark and globe. A result link, such as `/q?q=population%20Japan%202050`, shows that place, year, and published figure. Older `/?q=` links still open the same result.

## What works in this release

| Level | Coverage | Years | Source |
| --- | --- | --- | --- |
| Country or area | 237 locations from World Population Prospects 2024 | 1950–2100 | UN medium variant. World Bank `SP.POP.TOTL` from 1960 when that API has a value |
| UN region or subregion | 28 geographic regions and subregions | 1950–2100 | UN only |
| World | 1 | 1950–2100 | UN only |

UN World Population Prospects 2024 treats **1950–2023 as estimates** and **2024–2100 as medium-variant projections**. That boundary stays put when the calendar moves. A query for 2025 is still a UN projection in this revision.

If the World Bank has published a midyear estimate for a year the UN file still projects, the headline uses the World Bank estimate and shows the UN projection beside it. The two numbers are never averaged.

“Now”, “current”, and “latest” mean the newest **published estimate**, not the current calendar year.

### Not in this release

- U.S. states, counties, and cities. The Census Bureau Population Estimates Program is not connected.
- Canadian provinces, territories, and cities. Statistics Canada is not connected.
- Other cities. England, Scotland, Wales, and Northern Ireland are not split out of the United Kingdom.
- Years before 1950 or after 2100.
- Census counts. Even a census year in these files is labeled an estimate, because the file is not the enumeration itself.
- Real-time population.

Two-letter codes follow ISO 3166-1. `CA` is Canada. `GA` is Gabon. Names such as Taiwan and Hong Kong display the World Population Prospects 2024 location name.

## Run locally

```bash
npm install
npm run dev
```

The dev server listens on [http://127.0.0.1:43123](http://127.0.0.1:43123).

```bash
npm test
npm run lint
npm run typecheck
npm run build
```

No API key is required. See `.env.example`.

## Data

United Nations figures are read from a compact extract of the official file:

`WPP2024_TotalPopulationBySex.csv.gz`

[Download](https://population.un.org/wpp/assets/Excel%20Files/1_Indicator%20(Standard)/CSV_FILES/WPP2024_TotalPopulationBySex.csv.gz) · [World Population Prospects](https://population.un.org/wpp/) · CC BY 3.0 IGO

The source file stores population in thousands. `npm run data:refresh` downloads it, keeps the Medium variant, converts values to persons, and writes:

- `src/data/un-wpp-2024.json` (server series)
- `src/data/gazetteer.json` (names used for search)

The raw `.csv.gz` is cached under `data/raw/` and is not committed. The extract in this repository was retrieved on 25 October 2026. Its SHA-256 is recorded inside the JSON file and on the About the data page.

World Bank values are requested live from:

`https://api.worldbank.org/v2/country/{iso2}/indicator/SP.POP.TOTL?format=json`

Responses are cached for 24 hours and time out after 12 seconds. If the request fails, the UN figure is still shown and the cross-check says the World Bank series was unavailable.

## Deploy

The app is a Next.js App Router project and deploys on Vercel with no extra services.

```bash
npm run build
```

Set the install and build commands to the defaults (`npm install`, `npm run build`). Do not add a database. Country lookup does not need environment variables.

## Architecture

- `src/lib/parse-query.ts` reads a place and one year from a command.
- `src/lib/resolve.ts` matches countries, regions, aliases, and known unsupported places.
- `src/lib/sources/un-wpp.ts` and `src/lib/sources/world-bank.ts` are the source adapters.
- `src/lib/sources/registry.ts` records the Census Bureau and Statistics Canada adapters as unavailable.
- `src/lib/lookup.ts` chooses the headline, labels estimates and projections, and refuses to interpolate.
- `src/app/api/lookup/route.ts` applies a 40-request-per-minute limit per server instance.

Share a result by copying the page URL. A query string such as `/?q=population+Japan+2050` renders that lookup directly.

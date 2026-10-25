/**
 * Download (or read) the official UN WPP 2024 total-population file and
 * write a compact series for the app.
 *
 * Source file (CC BY 3.0 IGO):
 * https://population.un.org/wpp/assets/Excel%20Files/1_Indicator%20(Standard)/CSV_FILES/WPP2024_TotalPopulationBySex.csv.gz
 *
 * PopTotal in that file is in thousands of people. This script stores persons,
 * rounded to the nearest person. It keeps the Medium variant only:
 * estimates for 1950–2023 and medium-variant projections for 2024–2100.
 */
import { createHash } from "node:crypto";
import { createWriteStream } from "node:fs";
import { mkdir, readFile, writeFile, stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { gunzipSync } from "node:zlib";
import { fileURLToPath } from "node:url";

const SOURCE_URL =
  "https://population.un.org/wpp/assets/Excel%20Files/1_Indicator%20(Standard)/CSV_FILES/WPP2024_TotalPopulationBySex.csv.gz";

const START_YEAR = 1950;
const END_YEAR = 2100;
const ESTIMATE_THROUGH_YEAR = 2023;
const LEVEL_BY_TYPE = {
  "Country/Area": "country",
  World: "world",
  "Geographic region": "region",
  Subregion: "region",
};

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cachePath = path.join(root, "data", "raw", "WPP2024_TotalPopulationBySex.csv.gz");
const seriesPath = path.join(root, "src", "data", "un-wpp-2024.json");
const gazetteerPath = path.join(root, "src", "data", "gazetteer.json");

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (char !== "\r") {
      field += char;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

function thousandsToPersons(raw) {
  const value = Number(raw);
  if (!Number.isFinite(value)) {
    throw new Error(`Population value is not a number: ${raw}`);
  }
  return Math.round(value * 1000);
}

async function ensureSource() {
  await mkdir(path.dirname(cachePath), { recursive: true });
  try {
    const existing = await stat(cachePath);
    if (existing.size > 1_000_000) {
      console.log(`Using cached ${cachePath} (${existing.size} bytes)`);
      return readFile(cachePath);
    }
  } catch {
    // Download below.
  }

  console.log(`Downloading ${SOURCE_URL}`);
  const response = await fetch(SOURCE_URL, {
    headers: { "User-Agent": "PopulationNow/1.0 dataset refresh" },
    signal: AbortSignal.timeout(180_000),
  });
  if (!response.ok || !response.body) {
    throw new Error(`UN download failed: ${response.status}`);
  }
  await pipeline(Readable.fromWeb(response.body), createWriteStream(cachePath));
  return readFile(cachePath);
}

function levelFor(typeName) {
  return LEVEL_BY_TYPE[typeName] ?? null;
}

async function main() {
  const gzipped = await ensureSource();
  const sha256 = createHash("sha256").update(gzipped).digest("hex");
  const csv = gunzipSync(gzipped).toString("utf8");
  const table = parseCsv(csv);
  const header = table[0].map((name) => name.replace(/^\uFEFF/, ""));
  const index = Object.fromEntries(header.map((name, i) => [name, i]));

  const required = [
    "LocID",
    "ISO3_code",
    "ISO2_code",
    "LocTypeName",
    "ParentID",
    "Location",
    "Variant",
    "Time",
    "PopTotal",
  ];
  for (const column of required) {
    if (index[column] === undefined) {
      throw new Error(`Missing column ${column}`);
    }
  }

  const names = new Map();
  const meta = new Map();
  const series = new Map();

  for (const cells of table.slice(1)) {
    if (cells.length === 1 && cells[0] === "") continue;
    if (cells[index.Variant] !== "Medium") continue;

    const locId = cells[index.LocID];
    const name = cells[index.Location];
    names.set(locId, name);

    const typeName = cells[index.LocTypeName];
    const level = levelFor(typeName);
    if (!level) continue;

    const year = Number(cells[index.Time]);
    if (!Number.isInteger(year) || year < START_YEAR || year > END_YEAR) continue;

    let record = meta.get(locId);
    if (!record) {
      record = {
        locId: Number(locId),
        iso3: cells[index.ISO3_code] || null,
        iso2: cells[index.ISO2_code] || null,
        name,
        level,
        typeName,
        parentId: cells[index.ParentID] ? Number(cells[index.ParentID]) : null,
      };
      meta.set(locId, record);
      series.set(locId, new Map());
    }

    series.get(locId).set(year, thousandsToPersons(cells[index.PopTotal]));
  }

  const locations = [];
  for (const record of meta.values()) {
    const byYear = series.get(String(record.locId)) ?? series.get(record.locId);
    const pop = [];
    for (let year = START_YEAR; year <= END_YEAR; year += 1) {
      const value = byYear.get(year);
      if (value === undefined) {
        throw new Error(`${record.name} is missing ${year}`);
      }
      pop.push(value);
    }
    locations.push({
      ...record,
      parentName: record.parentId ? names.get(String(record.parentId)) ?? null : null,
      pop,
    });
  }

  locations.sort((a, b) => a.name.localeCompare(b.name) || a.locId - b.locId);

  const dataset = {
    revision: "World Population Prospects 2024",
    variant: "Medium",
    variantId: 2,
    citation:
      "United Nations, Department of Economic and Social Affairs, Population Division (2024). World Population Prospects 2024, Online Edition.",
    license: "CC BY 3.0 IGO",
    licenseUrl: "https://creativecommons.org/licenses/by/3.0/igo/",
    sourceUrl: "https://population.un.org/wpp/",
    methodologyUrl: "https://population.un.org/wpp/assets/Files/WPP2024_Methodology.pdf",
    downloadUrl: SOURCE_URL,
    indicator:
      "Total population by sex (PopTotal), both sexes, medium variant. Historical years are estimates; later years are projections.",
    unitInSource: "thousands of persons",
    unitStored: "persons",
    referenceDate: "1 July",
    estimateThroughYear: ESTIMATE_THROUGH_YEAR,
    projectionFromYear: ESTIMATE_THROUGH_YEAR + 1,
    startYear: START_YEAR,
    endYear: END_YEAR,
    retrievedAt: "2026-10-25",
    sourceSha256: sha256,
    locationCount: locations.length,
    locations,
  };

  const gazetteer = {
    revision: dataset.revision,
    retrievedAt: dataset.retrievedAt,
    locations: locations.map((location) => {
      const entry = { ...location };
      delete entry.pop;
      delete entry.typeName;
      return entry;
    }),
  };

  await mkdir(path.dirname(seriesPath), { recursive: true });
  await writeFile(seriesPath, JSON.stringify(dataset));
  await writeFile(gazetteerPath, JSON.stringify(gazetteer));

  const japan = locations.find((location) => location.iso3 === "JPN");
  const yearIndex = (year) => year - START_YEAR;
  console.log(
    JSON.stringify(
      {
        sha256,
        locations: locations.length,
        countries: locations.filter((location) => location.level === "country").length,
        bytes: Buffer.byteLength(JSON.stringify(dataset)),
        japan: japan && {
          1970: japan.pop[yearIndex(1970)],
          1990: japan.pop[yearIndex(1990)],
          2023: japan.pop[yearIndex(2023)],
          2024: japan.pop[yearIndex(2024)],
          2025: japan.pop[yearIndex(2025)],
          2050: japan.pop[yearIndex(2050)],
          2100: japan.pop[yearIndex(2100)],
        },
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

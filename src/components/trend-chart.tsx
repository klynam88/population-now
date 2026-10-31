"use client";

import { useEffect, useId, useState } from "react";
import { formatCompact, formatPeople, kindLabel } from "@/lib/format";
import type { ChartPoint } from "@/lib/types";

const WIDTH = 800;
const HEIGHT = 280;
const PAD = { top: 18, right: 12, bottom: 32, left: 52 };

export function TrendChart({
  points,
  year,
  estimateThrough,
  onSelectYear,
}: {
  points: ChartPoint[];
  year: number;
  estimateThrough: number;
  onSelectYear?: (year: number) => void;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const [pendingYear, setPendingYear] = useState(year);
  const labelId = useId();

  useEffect(() => {
    setPendingYear(year);
  }, [year]);
  const start = points[0]?.year ?? year;
  const end = points[points.length - 1]?.year ?? year;
  const values = points.flatMap((point) =>
    point.worldBank === null ? [point.un] : [point.un, point.worldBank],
  );
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const y0 = min - span * 0.08;
  const y1 = max + span * 0.12;
  const plotW = WIDTH - PAD.left - PAD.right;
  const plotH = HEIGHT - PAD.top - PAD.bottom;

  const xFor = (value: number) => PAD.left + ((value - start) / (end - start)) * plotW;
  const yFor = (value: number) => PAD.top + (1 - (value - y0) / (y1 - y0)) * plotH;

  const estimate = points.filter((point) => point.year <= estimateThrough);
  const projection = points.filter((point) => point.year >= estimateThrough);
  const line = (series: ChartPoint[], key: "un" | "worldBank") =>
    series
      .filter((point) => point[key] !== null)
      .map((point, index) => {
        const amount = point[key] as number;
        return `${index === 0 ? "M" : "L"}${xFor(point.year).toFixed(1)} ${yFor(amount).toFixed(1)}`;
      })
      .join(" ");

  const ticks = [0, 1, 2, 3].map((step) => y0 + ((y1 - y0) * step) / 3);
  const xTicks = [1950, 1975, 2000, 2025, 2050, 2075, 2100].filter(
    (tick) => tick >= start && tick <= end,
  );
  const active = points.find((point) => point.year === (hover ?? pendingYear)) ?? points[0];

  function yearFromClientX(clientX: number, width: number) {
    const ratio = Math.min(1, Math.max(0, clientX / width));
    const approx = start + ratio * (end - start);
    return points.reduce((best, point) =>
      Math.abs(point.year - approx) < Math.abs(best.year - approx) ? point : best,
    ).year;
  }

  return (
    <figure className="mt-6" aria-labelledby={labelId}>
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <figcaption id={labelId} className="text-xs tracking-[0.14em] text-muted-foreground uppercase">
          Annual series
        </figcaption>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-2">
            <span className="h-px w-5 bg-primary" /> UN estimate
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-px w-5 border-t border-dashed border-[#e7c98a]" /> UN projection
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-px w-5 bg-[#9ec1ff]" /> World Bank
          </span>
        </div>
      </div>
      <div className="relative">
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="h-auto w-full touch-none"
          role="img"
          aria-label={`Population from ${start} to ${end}. Selected year ${year}.`}
          onPointerMove={(event) => {
            const rect = event.currentTarget.getBoundingClientRect();
            setHover(yearFromClientX(event.clientX - rect.left, rect.width));
          }}
          onPointerLeave={() => setHover(null)}
          onClick={(event) => {
            if (!onSelectYear) return;
            const rect = event.currentTarget.getBoundingClientRect();
            onSelectYear(yearFromClientX(event.clientX - rect.left, rect.width));
          }}
        >
          {ticks.map((tick) => (
            <g key={tick}>
              <line
                x1={PAD.left}
                x2={WIDTH - PAD.right}
                y1={yFor(tick)}
                y2={yFor(tick)}
                stroke="rgba(157,255,195,0.12)"
              />
              <text
                x={PAD.left - 8}
                y={yFor(tick) + 4}
                textAnchor="end"
                fill="#8b9a93"
                fontSize="11"
                fontFamily="ui-monospace, monospace"
              >
                {formatCompact(tick)}
              </text>
            </g>
          ))}
          <line
            x1={xFor(estimateThrough + 0.5)}
            x2={xFor(estimateThrough + 0.5)}
            y1={PAD.top}
            y2={HEIGHT - PAD.bottom}
            stroke="rgba(231,201,138,0.45)"
            strokeDasharray="3 4"
          />
          <text
            x={xFor(estimateThrough + 0.5) + 6}
            y={PAD.top + 10}
            fill="#e7c98a"
            fontSize="11"
            fontFamily="ui-monospace, monospace"
          >
            projections
          </text>
          <path d={line(estimate, "un")} fill="none" stroke="#9dffc3" strokeWidth="2" />
          <path
            d={line(projection, "un")}
            fill="none"
            stroke="#e7c98a"
            strokeWidth="2"
            strokeDasharray="5 4"
          />
          <path d={line(points, "worldBank")} fill="none" stroke="#9ec1ff" strokeWidth="1.5" />
          {active ? (
            <>
              <line
                x1={xFor(active.year)}
                x2={xFor(active.year)}
                y1={PAD.top}
                y2={HEIGHT - PAD.bottom}
                stroke="rgba(215,226,220,0.45)"
              />
              <circle cx={xFor(active.year)} cy={yFor(active.un)} r="3.5" fill="#f4fff8" />
            </>
          ) : null}
          {xTicks.map((tick) => (
            <text
              key={tick}
              x={xFor(tick)}
              y={HEIGHT - 8}
              textAnchor="middle"
              fill="#8b9a93"
              fontSize="11"
              fontFamily="ui-monospace, monospace"
            >
              {tick}
            </text>
          ))}
        </svg>
        {active ? (
          <div className="pointer-events-none absolute top-2 right-2 border border-border bg-card/95 px-3 py-2 text-xs">
            <div className="text-foreground">{active.year}</div>
            <div className="mt-1 text-primary">
              UN {kindLabel(active.unKind).toLowerCase()} {formatPeople(active.un)}
            </div>
            <div className="text-[#9ec1ff]">
              {active.worldBank === null
                ? "World Bank —"
                : `World Bank ${formatPeople(active.worldBank)}`}
            </div>
          </div>
        ) : null}
      </div>
      {onSelectYear ? (
        <label className="mt-3 block text-[11px] tracking-wide text-muted-foreground uppercase">
          Select year
          <input
            className="mt-2 w-full accent-primary"
            type="range"
            min={start}
            max={end}
            value={pendingYear}
            onChange={(event) => setPendingYear(Number(event.target.value))}
            onPointerUp={(event) => {
              const next = Number(event.currentTarget.value);
              if (next !== year) onSelectYear(next);
            }}
            onKeyUp={(event) => {
              const next = Number(event.currentTarget.value);
              if (next !== year) onSelectYear(next);
            }}
          />
        </label>
      ) : null}
    </figure>
  );
}

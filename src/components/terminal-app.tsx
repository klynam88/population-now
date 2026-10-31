"use client";

import dynamic from "next/dynamic";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ResultView } from "@/components/result-view";
import { parseQuery } from "@/lib/parse-query";
import { suggestPlaces, type Suggestion } from "@/lib/suggest";
import type { LookupResponse } from "@/lib/types";

const PopulationGlobe = dynamic(
  () => import("@/components/population-globe").then((module) => module.PopulationGlobe),
  {
    ssr: false,
    loading: () => (
      <div className="border border-border bg-[#070b12]/80">
        <div className="flex h-[280px] items-center justify-center text-[11px] tracking-[0.16em] text-muted-foreground uppercase sm:h-[340px]">
          Drawing the globe
        </div>
        <p className="border-t border-border px-3 py-2 text-[11px] text-muted-foreground">
          Drag to turn · click a country
        </p>
      </div>
    ),
  },
);

const EXAMPLES = [
  "population Japan 2050",
  "United States population 1990",
  "population Canada 2025",
  "population Germany 1970",
  "population World 2100",
  "population France now",
];

const HISTORY_KEY = "population.now.history";

export function TerminalApp({
  initialQuery,
  initialResult,
}: {
  initialQuery: string;
  initialResult: LookupResponse | null;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [result, setResult] = useState<LookupResponse | null>(initialResult);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [highlight, setHighlight] = useState(-1);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();
  const suggestions = useMemo(() => suggestPlaces(query), [query]);

  useEffect(() => {
    inputRef.current?.focus();
    try {
      const stored = window.localStorage.getItem(HISTORY_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setHistory(parsed.filter((item) => typeof item === "string").slice(0, 30));
        }
      }
    } catch {
      // History is a convenience. A blocked storage API should not break lookup.
    }
  }, []);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        inputRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function remember(value: string) {
    const next = [value, ...history.filter((item) => item !== value)].slice(0, 30);
    setHistory(next);
    try {
      window.localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
    } catch {
      // Ignore storage failures.
    }
  }

  async function run(nextQuery: string, loc?: string) {
    const q = nextQuery.trim();
    if (!q && !loc) return;
    setQuery(q);
    setOpen(false);
    setHighlight(-1);
    setHistoryIndex(-1);
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (loc) params.set("loc", loc);
    try {
      const response = await fetch(`/api/lookup?${params.toString()}`);
      const body = (await response.json()) as LookupResponse;
      setResult(body);
      if (q) {
        window.history.replaceState(null, "", `/?q=${encodeURIComponent(q)}`);
        remember(q);
      }
    } catch {
      setResult({
        status: "error",
        message: "The lookup did not complete. Nothing was estimated in its place.",
      });
    } finally {
      setLoading(false);
    }
  }

  function applySuggestion(suggestion: Suggestion) {
    const parsed = parseQuery(query);
    const year = parsed.year;
    const next = year ? `population ${suggestion.name} ${year}` : `population ${suggestion.name}`;
    if (!suggestion.supported && !year) {
      void run(`${next} 2023`, suggestion.id);
      return;
    }
    if (year || !suggestion.supported) {
      void run(next, suggestion.id);
      return;
    }
    setQuery(`${next} `);
    setOpen(false);
    setHighlight(-1);
    inputRef.current?.focus();
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      if (open) setOpen(false);
      else setQuery("");
      setHighlight(-1);
      return;
    }
    if (event.key === "ArrowDown" && suggestions.length > 0) {
      event.preventDefault();
      setOpen(true);
      setHighlight((index) => Math.min(index + 1, suggestions.length - 1));
      return;
    }
    if (event.key === "ArrowUp") {
      if (open && highlight >= 0) {
        event.preventDefault();
        setHighlight((index) => index - 1);
        return;
      }
      if (history.length > 0) {
        event.preventDefault();
        const next = historyIndex < 0 ? 0 : Math.min(historyIndex + 1, history.length - 1);
        setHistoryIndex(next);
        setQuery(history[next] ?? query);
      }
    }
    if (event.key === "Enter" && open && highlight >= 0 && suggestions[highlight]) {
      event.preventDefault();
      applySuggestion(suggestions[highlight]);
    }
  }

  const focus =
    result?.status === "ok" && result.result.place.level === "country"
      ? { locId: result.result.place.locId, name: result.result.place.name }
      : {
          locId: null,
          name: result?.status === "ok" ? result.result.place.name : null,
        };

  function onGlobeSelect(place: { name: string; locId: number }) {
    const parsed = parseQuery(query);
    const next = parsed.year ? `population ${place.name} ${parsed.year}` : `population ${place.name} now`;
    void run(next, `un:${place.locId}`);
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6 sm:py-12">
      <section className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-8">
        <div className="min-w-0">
        <p className="text-[11px] tracking-[0.22em] text-primary uppercase">
          Records · 1950–2100
        </p>
        <h1 className="mt-3 text-4xl tracking-tight text-foreground sm:text-6xl">
          POPULATION<span className="text-primary">.</span>NOW
        </h1>
        <p className="mt-3 text-sm text-muted-foreground sm:text-base">Past. Present. Future.</p>
        <p className="mt-4 max-w-xl text-sm leading-6 text-muted-foreground">
          Ask for a country, a UN region, or the world, plus a year. Figures come from published
          estimates and projections. This is not a live population clock.
        </p>
        </div>

        <div className="lg:sticky lg:top-6 lg:row-span-2">
          <PopulationGlobe focusLocId={focus.locId} focusName={focus.name} onSelect={onGlobeSelect} />
        </div>

        <div className="min-w-0">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void run(query);
          }}
        >
          <label htmlFor="population-query" className="text-[11px] tracking-[0.18em] text-muted-foreground uppercase">
            Query
          </label>
          <div className="relative mt-2">
            <div className="flex flex-col gap-2 border border-border bg-background/80 p-2 sm:flex-row sm:items-center">
              <span aria-hidden className="px-2 text-lg text-primary sm:text-xl">
                &gt;
              </span>
              <Input
                ref={inputRef}
                id="population-query"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setHighlight(-1);
                  setHistoryIndex(-1);
                  setOpen(true);
                }}
                onFocus={() => setOpen(true)}
                onKeyDown={onKeyDown}
                placeholder="population Japan 2050"
                autoComplete="off"
                autoCapitalize="off"
                spellCheck={false}
                aria-autocomplete="list"
                aria-controls={listId}
                aria-activedescendant={
                  highlight >= 0 ? `${listId}-${highlight}` : undefined
                }
                className="h-12 rounded-none border-0 bg-transparent px-1 text-lg shadow-none focus-visible:ring-0 md:text-xl"
              />
              <Button type="submit" disabled={loading} className="h-11 px-4 font-mono sm:w-28">
                {loading ? "Reading" : "Run"}
              </Button>
            </div>
            {open && suggestions.length > 0 ? (
              <ul
                id={listId}
                role="listbox"
                className="absolute z-20 mt-1 max-h-80 w-full overflow-auto border border-border bg-popover"
              >
                {suggestions.map((suggestion, index) => (
                  <li key={suggestion.id} id={`${listId}-${index}`} role="option" aria-selected={index === highlight}>
                    <button
                      type="button"
                      className={`flex w-full items-baseline justify-between gap-3 px-3 py-2 text-left text-sm ${
                        index === highlight ? "bg-accent text-accent-foreground" : "hover:bg-accent/70"
                      }`}
                      onMouseDown={(event) => {
                        event.preventDefault();
                        applySuggestion(suggestion);
                      }}
                    >
                      <span>{suggestion.name}</span>
                      <span className="text-[11px] text-muted-foreground">{suggestion.detail}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
          <p className="mt-2 text-[11px] tracking-wide text-muted-foreground">
            Enter runs · ↑ history · ↓ suggestions · Esc clears · ⌘K or Ctrl K focuses
          </p>
        </form>

        <div className="mt-4 flex flex-wrap gap-2">
          {EXAMPLES.map((example) => (
            <Button
              key={example}
              type="button"
              variant="outline"
              size="sm"
              className="font-mono"
              onClick={() => void run(example)}
            >
              {example}
            </Button>
          ))}
        </div>
        {history.length > 0 ? (
          <div className="mt-4">
            <p className="text-[11px] tracking-[0.16em] text-muted-foreground uppercase">Recent</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {history.slice(0, 6).map((item) => (
                <Button
                  key={item}
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="font-mono text-muted-foreground"
                  onClick={() => void run(item)}
                >
                  {item}
                </Button>
              ))}
            </div>
          </div>
        ) : null}
        </div>
      </section>

      <section className="mx-auto w-full max-w-3xl" aria-live="polite">
        {loading ? (
          <p className="mb-3 text-sm text-primary">Reading published series…</p>
        ) : null}
        <div className={loading ? "opacity-60" : undefined}>
          {result ? <StatusView result={result} onRun={run} onSelectYear={(year) => {
            if (result.status !== "ok") return;
            void run(`population ${result.result.place.name} ${year}`, `un:${result.result.place.locId}`);
          }} /> : null}
        </div>
      </section>
    </div>
  );
}

function StatusView({
  result,
  onRun,
  onSelectYear,
}: {
  result: LookupResponse;
  onRun: (query: string, loc?: string) => void;
  onSelectYear: (year: number) => void;
}) {
  if (result.status === "ok") {
    return <ResultView result={result.result} onSelectYear={onSelectYear} />;
  }

  return (
    <div className="border border-border bg-card/80 px-4 py-5 sm:px-6" role="status">
      <p className="text-[11px] tracking-[0.16em] text-[#e7c98a] uppercase">{result.status.replaceAll("_", " ")}</p>
      <p className="mt-3 text-base leading-7 text-foreground">
        {"message" in result ? result.message : "The query could not be answered."}
      </p>
      {"detail" in result && result.detail ? (
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{result.detail}</p>
      ) : null}
      {"examples" in result ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {result.examples.map((example) => (
            <Button key={example} type="button" variant="outline" size="sm" className="font-mono" onClick={() => onRun(example)}>
              {example}
            </Button>
          ))}
        </div>
      ) : null}
      {"alternatives" in result ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {result.alternatives.map((alternative) => (
            <Button
              key={alternative.query}
              type="button"
              variant="outline"
              size="sm"
              className="font-mono"
              onClick={() => onRun(alternative.query)}
            >
              {alternative.query}
            </Button>
          ))}
        </div>
      ) : null}
      {"options" in result ? (
        <ul className="mt-4 divide-y divide-border border border-border">
          {result.options.map((option, index) => (
            <li key={option.id}>
              <button
                type="button"
                className="flex w-full items-baseline justify-between gap-3 px-3 py-3 text-left hover:bg-accent"
                onClick={() => onRun(option.query, option.id)}
              >
                <span>
                  <span className="mr-3 text-muted-foreground">{index + 1}</span>
                  {option.name}
                </span>
                <span className="text-[11px] text-muted-foreground">{option.detail}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {"suggestions" in result && result.suggestions.length > 0 ? (
        <ul className="mt-4 divide-y divide-border border border-border">
          {result.suggestions.map((option) => (
            <li key={option.id}>
              <button
                type="button"
                className="flex w-full items-baseline justify-between gap-3 px-3 py-3 text-left hover:bg-accent"
                onClick={() => onRun(option.query, option.supported ? option.id : option.id)}
              >
                <span>{option.name}</span>
                <span className="text-[11px] text-muted-foreground">{option.detail}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

const people = new Intl.NumberFormat("en-US");

export function formatPeople(value: number): string {
  return people.format(value);
}

export function formatCompact(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 1_000_000_000) {
    const scaled = abs / 1_000_000_000;
    return `${sign}${scaled >= 10 ? scaled.toFixed(0) : scaled.toFixed(1)}B`;
  }
  if (abs >= 1_000_000) {
    const scaled = abs / 1_000_000;
    return `${sign}${scaled >= 10 ? scaled.toFixed(0) : scaled.toFixed(1)}M`;
  }
  if (abs >= 10_000) return `${sign}${Math.round(abs / 1000)}k`;
  return people.format(value);
}

export function formatLongDate(isoDate: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return `${day} ${months[month - 1]} ${year}`;
}

export function levelLabel(level: "country" | "region" | "world"): string {
  if (level === "country") return "Country or area";
  if (level === "region") return "Region";
  return "World";
}

export function kindLabel(kind: "estimate" | "projection"): string {
  return kind === "estimate" ? "Estimate" : "Projection";
}

export function formatDelta(input: {
  delta: number;
  fromYear: number;
  fromKind: "estimate" | "projection";
  sourceLabel: string;
}): string {
  const magnitude = formatPeople(Math.abs(input.delta));
  if (input.delta === 0) {
    return `Unchanged from the ${input.fromYear} ${input.fromKind} in the ${input.sourceLabel} series.`;
  }
  const direction = input.delta > 0 ? "more than" : "fewer than";
  return `${magnitude} ${direction} the ${input.fromYear} ${input.fromKind} in the same ${input.sourceLabel} series.`;
}

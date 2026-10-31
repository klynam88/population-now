import { lookupQuery } from "@/lib/lookup";
import { allowRequest, clientIp } from "@/lib/rate-limit";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!allowRequest(clientIp(request))) {
    return NextResponse.json(
      {
        status: "error",
        message: "Too many lookups from this network. Wait a minute and try again.",
      },
      { status: 429, headers: { "Cache-Control": "no-store" } },
    );
  }

  const url = new URL(request.url);
  const q = url.searchParams.get("q") ?? "";
  const loc = url.searchParams.get("loc");
  const yearRaw = url.searchParams.get("year");
  let year: number | null = null;

  if (yearRaw) {
    if (!/^\d{4}$/.test(yearRaw)) {
      return NextResponse.json(
        { status: "invalid", message: "Year must be a four-digit number." },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }
    year = Number(yearRaw);
  }

  if (!q.trim() && !loc) {
    return NextResponse.json(
      { status: "invalid", message: "Enter a place and a year." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const body = await lookupQuery({ q, loc, year });
    return NextResponse.json(body, {
      headers: {
        "Cache-Control":
          body.status === "ok"
            ? "public, s-maxage=3600, stale-while-revalidate=86400"
            : "no-store",
      },
    });
  } catch {
    return NextResponse.json(
      { status: "error", message: "The lookup failed before a figure could be read." },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}

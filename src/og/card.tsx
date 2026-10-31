import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { ReactElement } from "react";
import { OG_HEIGHT, OG_WIDTH } from "@/lib/site";
import type { ShareCard } from "@/lib/share";

let backgroundUrl: string | null = null;
let regularFont: ArrayBuffer | null = null;
let boldFont: ArrayBuffer | null = null;

function asArrayBuffer(buffer: Buffer): ArrayBuffer {
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
}

export async function loadOgAssets(): Promise<{
  backgroundUrl: string;
  fonts: { name: string; data: ArrayBuffer; weight: 400 | 700; style: "normal" }[];
}> {
  if (!backgroundUrl || !regularFont || !boldFont) {
    const [image, regular, bold] = await Promise.all([
      readFile(join(process.cwd(), "src/og/background.jpg")),
      readFile(join(process.cwd(), "src/fonts/JetBrainsMono-Regular.ttf")),
      readFile(join(process.cwd(), "src/fonts/JetBrainsMono-Bold.ttf")),
    ]);
    backgroundUrl = `data:image/jpeg;base64,${image.toString("base64")}`;
    regularFont = asArrayBuffer(regular);
    boldFont = asArrayBuffer(bold);
  }
  return {
    backgroundUrl,
    fonts: [
      { name: "JetBrains Mono", data: regularFont, weight: 400, style: "normal" },
      { name: "JetBrains Mono", data: boldFont, weight: 700, style: "normal" },
    ],
  };
}

function headlineSize(text: string): number {
  if (text.length > 36) return 42;
  if (text.length > 26) return 52;
  if (text.length > 18) return 64;
  return 76;
}

function figureSize(text: string): number {
  if (text.length > 14) return 58;
  if (text.length > 12) return 68;
  return 84;
}

export function ogCard(card: ShareCard, backgroundUrl: string): ReactElement {
  const detailColor = card.tone === "projection" ? "#e7c98a" : "#9dffc3";
  return (
    <div
      style={{
        width: OG_WIDTH,
        height: OG_HEIGHT,
        display: "flex",
        position: "relative",
        background: "#070b12",
        color: "#d7e2dc",
        fontFamily: "JetBrains Mono",
      }}
    >
      {/* Satori renders this share image. next/image is not available here. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        alt=""
        src={backgroundUrl}
        width={OG_WIDTH}
        height={OG_HEIGHT}
        style={{ position: "absolute", top: 0, left: 0, objectFit: "cover" }}
      />
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: 820,
          height: OG_HEIGHT,
          background: "linear-gradient(90deg, rgba(7,11,18,0.94) 0%, rgba(7,11,18,0.78) 62%, rgba(7,11,18,0) 100%)",
        }}
      />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          width: 740,
          height: OG_HEIGHT,
          padding: "52px 64px",
        }}
      >
        <div style={{ display: "flex", fontSize: 20, letterSpacing: 3, color: "#9dffc3" }}>
          {card.tone === "brand" ? "PAST. PRESENT. FUTURE." : "POPULATION.NOW"}
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 22, letterSpacing: 2, color: "#8b9a93" }}>{card.eyebrow.toUpperCase()}</div>
          {card.tone === "brand" ? (
            <div style={{ display: "flex", marginTop: 18, fontSize: 68, fontWeight: 700, color: "#f4fff8" }}>
              <span>POPULATION</span>
              <span style={{ color: "#9dffc3" }}>.</span>
              <span>NOW</span>
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                marginTop: 14,
                fontSize: headlineSize(card.headline),
                fontWeight: 700,
                color: "#f4fff8",
                lineHeight: 1.05,
              }}
            >
              {card.headline}
            </div>
          )}
          {card.figure ? (
            <div
              style={{
                display: "flex",
                marginTop: 16,
                fontSize: figureSize(card.figure),
                fontWeight: 700,
                color: "#9dffc3",
                letterSpacing: -1,
              }}
            >
              {card.figure}
            </div>
          ) : null}
          <div style={{ display: "flex", marginTop: 18, fontSize: 22, color: detailColor }}>{card.detail}</div>
        </div>
        <div style={{ display: "flex", fontSize: 18, color: "#8b9a93" }}>
          {card.tone === "brand" ? "UN WPP 2024 · World Bank · not a live count" : "Published figure. Not a live count."}
        </div>
      </div>
    </div>
  );
}

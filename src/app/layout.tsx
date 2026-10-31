import type { Metadata, Viewport } from "next";
import { Geist_Mono } from "next/font/google";
import Link from "next/link";
import { OG_ALT, OG_HEIGHT, OG_WIDTH, SITE_DESCRIPTION, SITE_NAME, SITE_TITLE, siteUrl } from "@/lib/site";
import "./globals.css";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const origin = await siteUrl();
  return {
    metadataBase: origin,
    title: {
      default: SITE_TITLE,
      template: "%s · Population.Now",
    },
    description: SITE_DESCRIPTION,
    applicationName: SITE_NAME,
    keywords: [
      "population",
      "population projection",
      "world population",
      "country population by year",
      "World Population Prospects",
      "United Nations population",
      "World Bank population",
    ],
    category: "reference",
    robots: { index: true, follow: true },
    alternates: { canonical: "/" },
    openGraph: {
      type: "website",
      locale: "en_US",
      siteName: SITE_NAME,
      title: SITE_TITLE,
      description: SITE_DESCRIPTION,
      url: "/",
      images: [{ url: "/og", width: OG_WIDTH, height: OG_HEIGHT, alt: OG_ALT }],
    },
    twitter: {
      card: "summary_large_image",
      title: SITE_TITLE,
      description: SITE_DESCRIPTION,
      images: [{ url: "/og", width: OG_WIDTH, height: OG_HEIGHT, alt: OG_ALT }],
    },
  };
}

export const viewport: Viewport = {
  themeColor: "#070b12",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const origin = await siteUrl();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: origin.origin,
    description: SITE_DESCRIPTION,
  };
  return (
    <html lang="en" className={`dark ${geistMono.variable}`}>
      <body>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        <div className="relative z-10 flex min-h-screen flex-col">
          <header className="border-b border-border/80">
            <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
              <Link href="/" className="text-sm tracking-[0.18em] text-foreground uppercase">
                Population<span className="text-primary">.</span>Now
              </Link>
              <nav className="flex items-center gap-4 text-xs tracking-[0.14em] text-muted-foreground uppercase">
                <Link href="/" className="hover:text-primary">
                  Query
                </Link>
                <Link href="/about" className="hover:text-primary">
                  About the data
                </Link>
              </nav>
            </div>
          </header>
          <main className="flex-1">{children}</main>
          <footer className="border-t border-border/80">
            <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 py-5 text-[11px] leading-5 text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <p>UN WPP 2024 · CC BY 3.0 IGO · World Bank WDI SP.POP.TOTL · CC BY 4.0</p>
              <p>Estimates and projections. Not a real-time count.</p>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}

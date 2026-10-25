import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Population.Now",
    template: "%s · Population.Now",
  },
  description:
    "Past, present, and projected population for countries, UN regions, and the world. United Nations World Population Prospects 2024 and World Bank SP.POP.TOTL.",
  applicationName: "Population.Now",
  openGraph: {
    title: "Population.Now",
    description: "Past. Present. Future. Published population estimates and projections.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`dark ${geistMono.variable}`}>
      <body>
        <div className="relative z-10 flex min-h-screen flex-col">
          <header className="border-b border-border/80">
            <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
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
            <div className="mx-auto flex w-full max-w-5xl flex-col gap-2 px-4 py-5 text-[11px] leading-5 text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <p>UN WPP 2024 · CC BY 3.0 IGO · World Bank WDI SP.POP.TOTL · CC BY 4.0</p>
              <p>Estimates and projections. Not a real-time count.</p>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}

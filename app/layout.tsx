import type { Metadata } from "next";
import { Manrope, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";

const body = Manrope({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
});

// Same family for display — a clean grotesque used large and light.
const display = Manrope({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "HaloLabs",
  description: "A personal grooming analysis — read-only viewer for analyze-faces results.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body className="min-h-screen font-sans">
        <Header />
        <main className="mx-auto max-w-5xl px-6 pb-8 pt-6">{children}</main>
        <footer className="overflow-hidden border-t border-line">
          <div className="mx-auto grid max-w-[1500px] gap-10 px-6 py-12 sm:px-10 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-label text-ink-soft">
                HaloLabs /
              </p>
              <p className="mt-4 max-w-md text-xs leading-relaxed text-ink-soft">
                Every observation and suggestion is written in Claude Code by
                the <span className="font-mono text-ink">analyze-faces</span>{" "}
                skill — this viewer only reads the file. Tags describe each
                suggestion, never the person.
              </p>
              <p className="mt-3 max-w-md text-xs leading-relaxed text-ink-soft">
                18+ only. No scores, no rankings, no surgery — and your photos
                never leave this machine. Nothing here is medical advice; if
                appearance worries are weighing on you, talking to someone you
                trust beats any plan.
              </p>
            </div>
            <nav className="grid grid-cols-2 gap-8">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-label text-ink-soft">
                  Explore /
                </p>
                <ul className="mt-4 space-y-2.5 text-sm">
                  <li>
                    <a href="/#why-halolabs" className="text-ink-soft transition-colors hover:text-ink">
                      Why HaloLabs
                    </a>
                  </li>
                  <li>
                    <a href="/#how-it-works" className="text-ink-soft transition-colors hover:text-ink">
                      How it works
                    </a>
                  </li>
                  <li>
                    <a href="/#faq" className="text-ink-soft transition-colors hover:text-ink">
                      FAQ
                    </a>
                  </li>
                </ul>
              </div>
              <div>
                <p className="font-mono text-[10px] uppercase tracking-label text-ink-soft">
                  App /
                </p>
                <ul className="mt-4 space-y-2.5 text-sm">
                  <li>
                    <a href="/start" className="text-ink-soft transition-colors hover:text-ink">
                      Start my plan
                    </a>
                  </li>
                  <li>
                    <a href="/profiles" className="text-ink-soft transition-colors hover:text-ink">
                      Profiles
                    </a>
                  </li>
                </ul>
              </div>
            </nav>
          </div>
          <p
            aria-hidden
            className="mx-auto -mb-[0.23em] max-w-[1500px] select-none whitespace-nowrap bg-gradient-to-br from-pine via-panel to-[#8FA3AD] bg-clip-text px-2 text-center font-display text-[19.5vw] font-semibold leading-none tracking-tight text-transparent lg:text-[280px]"
          >
            HALOLABS
          </p>
        </footer>
      </body>
    </html>
  );
}

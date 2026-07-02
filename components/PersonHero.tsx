"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Person } from "@/lib/types";
import { ADVICE_CATEGORIES } from "@/lib/types";
import { isQuickWin } from "@/lib/badges";
import { photoUrl } from "@/lib/photo";
import { hasPlan } from "@/lib/plan";

const CATEGORY_LABEL: Record<string, string> = {
  hair: "Hair",
  skin: "Skin",
  style: "Style",
  fitness: "Fitness",
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * The report cover — same blue-grey studio band as the landing hero: identity
 * and a plain-language summary on the left, an honest photo viewer (main
 * photo + thumbnail selector + lightbox) on the right, and a hairline-divided
 * stat row along the bottom. No mesh overlays, no fake comparisons —
 * decoration that looks like measurement erodes trust.
 */
export default function PersonHero({ person }: { person: Person }) {
  const photos = person.photos;
  const [selected, setSelected] = useState(0);
  const [lightbox, setLightbox] = useState(false);

  useEffect(() => {
    if (!lightbox) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setLightbox(false);
      if (e.key === "ArrowRight") setSelected((i) => (i + 1) % photos.length);
      if (e.key === "ArrowLeft")
        setSelected((i) => (i - 1 + photos.length) % photos.length);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox, photos.length]);

  const totalIdeas = ADVICE_CATEGORIES.reduce(
    (n, c) => n + (person.advice[c]?.length ?? 0),
    0
  );
  const quickWins = ADVICE_CATEGORIES.reduce(
    (n, c) => n + (person.advice[c] ?? []).filter(isQuickWin).length,
    0
  );

  // Two-tone name: first word inked, the rest in the lighter surface tone —
  // same treatment as the landing hero headline.
  const [firstName, ...rest] = person.displayName.split(" ");

  const jumpLinks: { href: string; label: string }[] = [
    ...ADVICE_CATEGORIES.filter((c) => (person.advice[c]?.length ?? 0) > 0).map(
      (cat) => ({
        href: `#${cat}`,
        label: `${CATEGORY_LABEL[cat]} · ${person.advice[cat]!.length}`,
      })
    ),
    ...(hasPlan(person)
      ? [
          { href: "#routine", label: "Routine" },
          { href: "#roadmap", label: "Roadmap" },
        ]
      : []),
  ];

  const stats: [string, string][] = [
    ["Analyzed", formatDate(person.analyzedAt)],
    ["Source", `${person.photoCount} photo${person.photoCount === 1 ? "" : "s"}`],
    ["Suggestions", String(totalIdeas)],
    ["Quick wins", String(quickWins)],
  ];

  return (
    <header className="relative overflow-hidden bg-gradient-to-br from-panel via-[#AEBEC7] to-[#8FA3AD]">
      <div className="mx-auto grid max-w-[1300px] gap-10 px-6 pb-12 pt-20 sm:px-10 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:pb-16 lg:pt-24">
        {/* Left: identity + summary */}
        <div className="order-2 lg:order-1">
          <Link
            href="/profiles"
            className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-label text-pine-deep/70 transition-colors hover:text-pine-deep"
          >
            <span aria-hidden>←</span> All profiles
          </Link>

          <p className="mt-6">
            <span className="inline-flex rounded-full border border-pine-deep/25 px-3 py-1 font-mono text-[10px] uppercase tracking-label text-pine-deep/80">
              HaloLabs report /
            </span>
          </p>

          <h1 className="mt-5 font-display text-5xl font-medium leading-[0.98] tracking-tight text-ink sm:text-6xl">
            {firstName}
            {rest.length > 0 && (
              <>
                <br />
                <span className="text-surface/90">{rest.join(" ")}</span>
              </>
            )}
          </h1>

          {/* What came out of the analysis, in one readable sentence. */}
          <p className="mt-6 max-w-md text-[15px] leading-relaxed text-pine-deep">
            The analysis found{" "}
            <span className="font-semibold text-ink">{totalIdeas} suggestions</span>
            {quickWins > 0 && (
              <>
                , including{" "}
                <span className="font-semibold text-ink">
                  {quickWins} quick win{quickWins === 1 ? "" : "s"}
                </span>{" "}
                you can do this week
              </>
            )}
            .
          </p>

          {jumpLinks.length > 0 && (
            <nav className="mt-8" aria-label="Jump to a section">
              <p className="font-mono text-[10px] uppercase tracking-label text-pine-deep/70">
                Jump to /
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {jumpLinks.map((l) => (
                  <a
                    key={l.href}
                    href={l.href}
                    className="rounded-full border border-pine-deep/25 bg-surface/20 px-3.5 py-1.5 text-sm text-pine-deep backdrop-blur-sm transition-colors hover:bg-surface/40"
                  >
                    {l.label}
                  </a>
                ))}
              </div>
            </nav>
          )}
        </div>

        {/* Right: photo viewer */}
        <div className="order-1 lg:order-2">
          <button
            type="button"
            onClick={() => setLightbox(true)}
            className="group relative block aspect-[4/5] w-full overflow-hidden rounded-xl bg-panel focus:outline-none focus:ring-2 focus:ring-pine"
            aria-label="Enlarge photo"
          >
            {photos[selected] && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photoUrl(photos[selected])}
                alt={`${person.displayName}, photo ${selected + 1}`}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
              />
            )}
            <span className="panel-label left-4 top-4">
              Photo {selected + 1} / {photos.length}
            </span>
          </button>

          {photos.length > 1 && (
            <div className="mt-3 grid grid-cols-7 gap-2">
              {photos.map((p, i) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setSelected(i)}
                  aria-label={`Show photo ${i + 1}`}
                  aria-pressed={i === selected}
                  className={`aspect-square overflow-hidden rounded-lg bg-panel transition-all focus:outline-none focus:ring-2 focus:ring-pine ${
                    i === selected
                      ? "ring-2 ring-pine"
                      : "opacity-70 hover:opacity-100"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photoUrl(p)}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Stat row — the landing hero's trust-row pattern, with real numbers. */}
      <div className="relative border-t border-pine-deep/15">
        <dl className="mx-auto grid max-w-[1300px] grid-cols-2 divide-pine-deep/15 px-6 sm:grid-cols-4 sm:divide-x sm:px-10">
          {stats.map(([label, value]) => (
            <div key={label} className="py-5 sm:px-6 sm:first:pl-0">
              <dt className="font-mono text-[10px] uppercase tracking-label text-pine-deep/70">
                {label}
              </dt>
              <dd className="mt-1 text-sm font-semibold text-ink">{value}</dd>
            </div>
          ))}
        </dl>
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/85 p-4 backdrop-blur-sm"
          onClick={() => setLightbox(false)}
          role="dialog"
          aria-modal="true"
          aria-label={`${person.displayName}, enlarged photo`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photoUrl(photos[selected])}
            alt={`${person.displayName}, enlarged`}
            className="max-h-full max-w-full rounded-xl object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            type="button"
            onClick={() => setLightbox(false)}
            className="absolute right-5 top-5 rounded-full bg-paper px-4 py-1.5 font-mono text-xs uppercase tracking-label text-ink hover:bg-white"
          >
            Close
          </button>
        </div>
      )}
    </header>
  );
}

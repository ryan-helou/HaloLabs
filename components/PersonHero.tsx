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
 * Person-page header: identity + a plain-language summary of what the
 * analysis produced, next to an honest photo viewer (main photo + thumbnail
 * selector + lightbox). No mesh overlays, no fake comparisons — decoration
 * that looks like measurement erodes trust.
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

  // Two-tone name: first word inked, the rest in the muted accent.
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

  return (
    <header>
      <Link
        href="/profiles"
        className="eyebrow inline-flex items-center gap-1.5 hover:text-ink"
      >
        <span aria-hidden>←</span> All profiles
      </Link>

      <div className="mt-6 grid items-center gap-8 sm:grid-cols-2 sm:gap-12">
        {/* Left: identity + summary */}
        <div className="order-2 sm:order-1">
          <span className="inline-flex rounded-full border border-line px-3 py-1 font-mono text-[10px] uppercase tracking-label text-ink-soft">
            LookLab analysis
          </span>
          <h1 className="mt-5 font-display text-5xl font-medium leading-[0.98] tracking-tight text-ink sm:text-6xl">
            {firstName}
            {rest.length > 0 && (
              <>
                <br />
                <span className="text-pine">{rest.join(" ")}</span>
              </>
            )}
          </h1>

          <p className="mt-4 text-sm text-ink-soft">
            Analyzed {formatDate(person.analyzedAt)} · from{" "}
            {person.photoCount} photo{person.photoCount === 1 ? "" : "s"}
          </p>

          {/* What came out of the analysis, in one readable sentence. */}
          <p className="mt-5 max-w-md rounded-2xl border border-line bg-surface px-5 py-4 text-[15px] leading-relaxed text-ink shadow-card">
            The analysis found{" "}
            <span className="font-semibold">{totalIdeas} suggestions</span>
            {quickWins > 0 && (
              <>
                , including{" "}
                <span className="font-semibold text-clay">
                  {quickWins} quick win{quickWins === 1 ? "" : "s"}
                </span>{" "}
                you can do this week
              </>
            )}
            .
          </p>

          {jumpLinks.length > 0 && (
            <nav className="mt-6" aria-label="Jump to a section">
              <p className="eyebrow">Jump to</p>
              <div className="mt-2.5 flex flex-wrap gap-2">
                {jumpLinks.map((l) => (
                  <a
                    key={l.href}
                    href={l.href}
                    className="rounded-full border border-line bg-surface px-3.5 py-1.5 text-sm text-ink-soft transition-colors hover:border-pine hover:text-ink"
                  >
                    {l.label}
                  </a>
                ))}
              </div>
            </nav>
          )}
        </div>

        {/* Right: photo viewer */}
        <div className="order-1 sm:order-2">
          <button
            type="button"
            onClick={() => setLightbox(true)}
            className="group relative block aspect-[4/5] w-full overflow-hidden rounded-2xl bg-panel focus:outline-none focus:ring-2 focus:ring-pine"
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

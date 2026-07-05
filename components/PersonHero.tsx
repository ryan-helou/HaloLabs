"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Person } from "@/lib/types";
import { ADVICE_CATEGORIES } from "@/lib/types";
import { isQuickWin } from "@/lib/badges";
import { photoUrl } from "@/lib/photo";

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
 * The report cover — a calm studio band: identity on the left, an honest photo
 * viewer (main photo + thumbnails + lightbox) on the right, a quiet stat row
 * below. No scan-sweep, no measurement mesh, no ticking counters — decoration
 * that mimics measurement erodes trust. Just the person, their photos, and a
 * few real counts. The plan itself lives in the tabs beneath.
 */
export default function PersonHero({
  person,
  unlocked = true,
}: {
  person: Person;
  /** Paid view leads with "your plan"; the locked teaser with "your scan". */
  unlocked?: boolean;
}) {
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

  const [firstName, ...rest] = person.displayName.split(" ");
  const builtFor = person.builtFor ?? [];

  const stats: [string, string][] = [
    ["Analyzed", formatDate(person.analyzedAt)],
    ["Source", `${person.photoCount} photo${person.photoCount === 1 ? "" : "s"}`],
    ["Moves", String(totalIdeas)],
    ["Quick wins", String(quickWins)],
  ];

  return (
    <header className="relative overflow-hidden bg-gradient-to-br from-panel via-[#AEBEC7] to-[#8FA3AD]">
      <div className="mx-auto grid max-w-[1300px] gap-10 px-6 pb-12 pt-20 sm:px-10 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:pb-16 lg:pt-24">
        {/* Left: identity */}
        <div className="order-2 flex flex-col justify-center lg:order-1">
          <Link
            href="/profiles"
            className="inline-flex items-center gap-1.5 text-[13px] font-medium text-pine-deep/70 transition-colors hover:text-pine-deep"
          >
            <span aria-hidden>←</span> All profiles
          </Link>

          <p className="mt-8 text-[13px] font-semibold uppercase tracking-[0.06em] text-pine-deep/70">
            {unlocked ? "Your plan" : "Your scan"}
          </p>
          <h1 className="mt-3 font-display text-5xl font-medium leading-[0.98] tracking-tight text-ink sm:text-6xl">
            {unlocked ? (
              <>
                Here&apos;s your plan,
                <br />
                <span className="text-surface/90">{firstName}.</span>
              </>
            ) : (
              <>
                {firstName}
                {rest.length > 0 && (
                  <>
                    <br />
                    <span className="text-surface/90">{rest.join(" ")}</span>
                  </>
                )}
              </>
            )}
          </h1>

          {builtFor.length > 0 && (
            <div className="mt-7">
              <p className="text-[12px] font-semibold uppercase tracking-[0.05em] text-pine-deep/60">
                Built for
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {builtFor.map((b) => (
                  <span
                    key={b}
                    className="rounded-full border border-pine-deep/20 bg-surface/20 px-3.5 py-1.5 text-[13px] text-pine-deep backdrop-blur-sm"
                  >
                    {b}
                  </span>
                ))}
              </div>
            </div>
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
                className="h-full w-full object-cover object-[center_30%] transition-transform duration-500 group-hover:scale-[1.02]"
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
                    i === selected ? "ring-2 ring-pine" : "opacity-70 hover:opacity-100"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photoUrl(p)} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Stat row — quiet, real counts. */}
      <div className="relative border-t border-pine-deep/15">
        <dl className="mx-auto grid max-w-[1300px] grid-cols-2 divide-pine-deep/15 px-6 sm:grid-cols-4 sm:divide-x sm:px-10">
          {stats.map(([label, value]) => (
            <div key={label} className="py-5 sm:px-6 sm:first:pl-0">
              <dt className="text-[12px] font-semibold uppercase tracking-[0.05em] text-pine-deep/70">
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
            className="absolute right-5 top-5 rounded-full bg-paper px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.05em] text-ink hover:bg-white"
          >
            Close
          </button>
        </div>
      )}
    </header>
  );
}

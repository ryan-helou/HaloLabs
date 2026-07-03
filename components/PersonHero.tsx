"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Person } from "@/lib/types";
import { ADVICE_CATEGORIES } from "@/lib/types";
import { isQuickWin } from "@/lib/badges";
import { photoUrl } from "@/lib/photo";
import { hasPlan } from "@/lib/plan";
import LandmarkOverlay from "@/components/LandmarkOverlay";

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

/** Count from 0 to `target` once on mount (instant under reduced motion). */
function useCountUp(target: number, ms = 1100): number {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (
      target === 0 ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setN(target);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min((t - t0) / ms, 1);
      setN(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return n;
}

/**
 * The report cover — same blue-grey studio band as the landing hero: identity
 * and a plain-language summary on the left, an honest photo viewer (main
 * photo + thumbnail selector + lightbox) on the right, and a hairline-divided
 * stat row along the bottom. The drama is real data staged theatrically — a
 * one-time scan sweep + landmark motif over the photo, count-up findings, and
 * a per-category signal readout. Counts of findings only, never a rating of
 * the face.
 */
export default function PersonHero({ person }: { person: Person }) {
  const photos = person.photos;
  const [selected, setSelected] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  // Drives the load choreography: bars grow + mesh fades once mounted, the
  // "scan complete" stamp lands after the sweep finishes.
  const [mounted, setMounted] = useState(false);
  const [swept, setSwept] = useState(false);

  useEffect(() => {
    setMounted(true);
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    const t = setTimeout(() => setSwept(true), reduced ? 0 : 2500);
    return () => clearTimeout(t);
  }, []);

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
  const totalShown = useCountUp(totalIdeas);
  const quickShown = useCountUp(quickWins, 1400);

  // Per-category signal readout: how many findings each area produced and how
  // many are high-impact. Real counts about the plan, never a face score.
  const catStats = ADVICE_CATEGORIES.map((cat) => {
    const items = person.advice[cat] ?? [];
    return {
      cat,
      label: CATEGORY_LABEL[cat],
      count: items.length,
      high: items.filter((s) => s.impact === "high").length,
    };
  }).filter((c) => c.count > 0);
  const maxCount = Math.max(1, ...catStats.map((c) => c.count));
  const topCat = [...catStats].sort(
    (a, b) => b.high - a.high || b.count - a.count
  )[0];

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

          {/* What came out of the analysis, in one readable sentence — the
              numbers tick up from 0 so the finding lands as an event. */}
          <p className="mt-6 max-w-md text-[15px] leading-relaxed text-pine-deep">
            The analysis found{" "}
            <span className="font-semibold tabular-nums text-ink">
              {totalShown} suggestions
            </span>
            {quickWins > 0 && (
              <>
                , including{" "}
                <span className="font-semibold tabular-nums text-ink">
                  {quickShown} quick win{quickWins === 1 ? "" : "s"}
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

          {/* Signal readout — where the findings cluster, staged like a
              diagnostic printout: bars grow in on load, staggered. */}
          {catStats.length > 0 && (
            <div className="mt-10 max-w-lg">
              <p className="font-mono text-[10px] uppercase tracking-label text-pine-deep/70">
                Scan readout /
              </p>
              <dl className="mt-4 space-y-3.5">
                {catStats.map((c, i) => (
                  <div
                    key={c.cat}
                    className="grid grid-cols-[3.75rem_1fr_12rem] items-center gap-x-3"
                  >
                    <dt className="text-[13px] font-medium text-ink">
                      {c.label}
                    </dt>
                    <dd
                      className="relative h-1.5 overflow-hidden rounded-full bg-pine-deep/15"
                      aria-hidden
                    >
                      <span
                        className="absolute inset-y-0 left-0 rounded-full bg-pine transition-[width] duration-1000 ease-out"
                        style={{
                          width: mounted
                            ? `${Math.round((c.count / maxCount) * 100)}%`
                            : "0%",
                          transitionDelay: `${350 + i * 160}ms`,
                        }}
                      />
                    </dd>
                    <dd className="whitespace-nowrap font-mono text-[10px] uppercase tracking-label text-pine-deep/70">
                      {c.count} found
                      {c.high > 0 && (
                        <span className="text-clay"> · {c.high} high-impact</span>
                      )}
                    </dd>
                  </div>
                ))}
              </dl>

              {/* The headline finding — where the leverage is. A named area
                  with a live pulse, never a rating. */}
              {topCat && topCat.high > 0 && (
                <p className="mt-5 flex items-start gap-2.5 border-t border-pine-deep/15 pt-4 text-sm leading-snug text-pine-deep">
                  <span
                    aria-hidden
                    className="relative mt-1 flex h-2 w-2 shrink-0"
                  >
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-clay opacity-60" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-clay" />
                  </span>
                  <span>
                    <span className="font-semibold text-ink">
                      Biggest leverage: {topCat.label.toLowerCase()}
                    </span>{" "}
                    — {topCat.high} high-impact move
                    {topCat.high === 1 ? "" : "s"} flagged in your photos.
                  </span>
                </p>
              )}
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
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
              />
            )}

            {/* Analysis theatre: the landmark motif fades in behind a one-time
                scan sweep, then settles to a faint schematic. Ornamental — the
                mesh is fixed, and nothing here implies a score. Its points
                trace a FRONTAL face, so it only renders on the first photo
                (the guided sequence's front shot); on angle shots it would sit
                visibly misaligned and read as broken. */}
            {selected === 0 && (
              <LandmarkOverlay
                className={`transition-opacity duration-1000 ${
                  mounted ? "opacity-35" : "opacity-0"
                } group-hover:opacity-55`}
              />
            )}
            {!swept && (
              <span
                aria-hidden
                className="scan-sweep pointer-events-none absolute inset-x-0"
              >
                <span className="block h-px bg-white shadow-[0_0_16px_3px_rgba(255,255,255,0.65)]" />
                <span className="block h-10 bg-gradient-to-b from-white/25 to-transparent" />
              </span>
            )}
            <span className="panel-label left-4 top-4">
              Photo {selected + 1} / {photos.length}
            </span>
            <span
              className={`panel-label right-4 top-4 flex items-center gap-1.5 transition-opacity duration-500 ${
                swept ? "opacity-100" : "opacity-0"
              }`}
            >
              <span
                aria-hidden
                className="h-1.5 w-1.5 rounded-full bg-pine-deep/80"
              />
              Scan complete
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

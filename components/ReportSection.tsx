/**
 * One numbered act of the report — the Qoves framed split: a left rail with
 * the bracket numeral, two-tone heading, and blurb; content on the right
 * behind a hairline divider. Acts stack flush with border-t so the report
 * reads as one continuous framed document (the page adds the final border-b).
 *
 * Content renders edge-to-edge so acts can run their own divided grids
 * (divide-x columns, divide-y rows) out to the frame; pad inside if needed.
 *
 * When `collapsible` is set the act starts closed (unless `defaultOpen`), so
 * the report stays a short glance until you open the deeper reference. A
 * collapsed act still renders its content in the DOM (hidden), so hash-jumps
 * into it — from the roadmap, the routine, the shopping list — auto-open it.
 *
 * When `lockedContent` is set, the header/numeral/blurb rail stays sharp and
 * only the content column is blurred behind the paywall (see LockedSection).
 */
"use client";

import { useEffect, useRef, useState } from "react";
import LockedSection from "./LockedSection";

export default function ReportSection({
  num,
  titleA,
  titleB,
  blurb,
  rail,
  id,
  children,
  lockedContent = false,
  lockNote,
  collapsible = false,
  defaultOpen = true,
  collapsedHint,
}: {
  num: string;
  titleA: string;
  titleB: string;
  blurb?: React.ReactNode;
  /** Pinned to the bottom of the rail, Qoves-style (legend, links, progress). */
  rail?: React.ReactNode;
  id?: string;
  children: React.ReactNode;
  /** Blur + disable the content column behind the paywall. */
  lockedContent?: boolean;
  /** Short line for the lock chip when locked. */
  lockNote?: string;
  /** Render a show/hide toggle; the act collapses to just its rail. */
  collapsible?: boolean;
  /** Start expanded. Ignored unless `collapsible`. */
  defaultOpen?: boolean;
  /** One-line teaser shown in the content column while collapsed. */
  collapsedHint?: React.ReactNode;
}) {
  const [open, setOpen] = useState(collapsible ? defaultOpen : true);
  const contentRef = useRef<HTMLDivElement>(null);

  // Auto-open when a hash targets something inside this act, so jumps from the
  // routine / roadmap / shopping list into a collapsed section still land.
  useEffect(() => {
    if (!collapsible) return;
    function reveal() {
      const hash = window.location.hash.slice(1);
      if (!hash) return;
      const el = document.getElementById(hash);
      if (el && contentRef.current?.contains(el)) setOpen(true);
    }
    reveal();
    window.addEventListener("hashchange", reveal);
    return () => window.removeEventListener("hashchange", reveal);
  }, [collapsible]);

  return (
    <section id={id} className="scroll-mt-24 border-t border-line">
      <div className="mx-auto grid max-w-[1300px] border-line lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] lg:border-x">
        <div className="border-b border-line px-6 py-10 sm:px-10 lg:border-b-0 lg:border-r lg:py-12">
          {/* Sticky so the numeral + heading stay in view while a long
              content column (protocol, roadmap) scrolls past. */}
          <div className="lg:sticky lg:top-24">
            <p className="font-mono text-xs text-ink-soft">[{num}]</p>
            <h2 className="mt-5 font-display text-3xl font-medium leading-[1.08] tracking-tight text-ink sm:text-4xl">
              {titleA}
              <br />
              <span className="text-pine">{titleB}</span>
            </h2>
            {blurb && (
              <p className="mt-5 max-w-sm text-[15px] leading-relaxed text-ink-soft">
                {blurb}
              </p>
            )}
            {collapsible && (
              <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                aria-expanded={open}
                className="mt-6 inline-flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-2 font-mono text-[11px] uppercase tracking-label text-pine transition-colors hover:border-pine/40"
              >
                {open ? "Hide" : "Show"}
                <span
                  aria-hidden
                  className={`transition-transform ${open ? "rotate-180" : ""}`}
                >
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </span>
              </button>
            )}
            {rail && <div className="mt-8">{rail}</div>}
          </div>
        </div>
        <div className="min-w-0">
          {collapsible && !open && collapsedHint && (
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="block w-full px-6 py-10 text-left text-[15px] leading-relaxed text-ink-soft transition-colors hover:text-ink sm:px-8"
            >
              {collapsedHint}
              <span className="ml-1 text-pine">Show →</span>
            </button>
          )}
          <div ref={contentRef} className={collapsible && !open ? "hidden" : undefined}>
            {lockedContent ? (
              <LockedSection note={lockNote}>{children}</LockedSection>
            ) : (
              children
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

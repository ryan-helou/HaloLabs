"use client";

import { useEffect, useId, useState } from "react";
import type { Suggestion } from "@/lib/types";
import { isQuickWin, strengthFor } from "@/lib/badges";
import TagBadge from "./TagBadge";
import PreviewImage from "./PreviewImage";

// Left rail color keyed to impact — lets you scan for the big moves.
const RAIL: Record<string, string> = {
  strong: "bg-pine",
  soft: "bg-pine/40",
  muted: "bg-line",
};

export default function SuggestionRow({
  suggestion,
  anchorId,
}: {
  suggestion: Suggestion;
  anchorId?: string;
}) {
  const rail = RAIL[strengthFor("impact", suggestion.impact)];
  const quickWin = isQuickWin(suggestion);
  const [open, setOpen] = useState(false);
  const panelId = useId();

  // Open automatically when linked to from the matrix or the shortlist so the
  // detail is visible the moment you jump to it.
  useEffect(() => {
    if (!anchorId) return;
    const matches = () => window.location.hash === `#${anchorId}`;
    if (matches()) setOpen(true);
    const onHash = () => matches() && setOpen(true);
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, [anchorId]);

  return (
    <article
      id={anchorId}
      className="suggestion relative scroll-mt-24 overflow-hidden border border-line bg-surface transition-colors"
    >
      <span className={`absolute inset-y-0 left-0 w-1.5 ${rail}`} aria-hidden />

      {/* Header — the whole bar toggles the detail. */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex w-full items-start gap-3 px-5 py-4 text-left"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <h4 className="font-display text-lg leading-snug text-ink">
              {suggestion.title}
            </h4>
            {quickWin && (
              <span className="mt-0.5 shrink-0 rounded-full bg-clay-soft px-2 py-1 font-mono text-[10px] uppercase tracking-[0.08em] text-clay">
                Quick win
              </span>
            )}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <TagBadge kind="impact" level={suggestion.impact} />
            <TagBadge kind="effort" level={suggestion.effort} />
            <TagBadge kind="cost" level={suggestion.cost} />
            {suggestion.image && (
              <span className="font-mono text-[10px] uppercase tracking-label text-ink-soft/70">
                · example
              </span>
            )}
          </div>
        </div>

        {/* Chevron affordance. */}
        <span
          aria-hidden
          className={`mt-1 shrink-0 text-ink-soft transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        >
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </span>
      </button>

      {/* Detail — revealed on expand. */}
      {open && (
        <div id={panelId} className="px-5 pb-5">
          <div className="flex gap-4">
            <div className="min-w-0 max-w-prose flex-1 space-y-4">
              <p className="text-[15px] leading-relaxed text-ink-soft">
                {suggestion.detail}
              </p>

              {suggestion.why && (
                <p className="rounded-xl bg-sage/40 px-4 py-3 text-sm leading-relaxed text-pine-deep">
                  <span className="font-medium">Why you: </span>
                  {suggestion.why}
                </p>
              )}

              {suggestion.how && suggestion.how.length > 0 && (
                <div>
                  <p className="eyebrow">How to do it</p>
                  <ol className="mt-2 space-y-1.5">
                    {suggestion.how.map((step, i) => (
                      <li key={i} className="flex items-baseline gap-2.5 text-sm text-ink">
                        <span className="w-7 shrink-0 font-mono text-xs text-pine">
                          [{i + 1}]
                        </span>
                        <span className="leading-relaxed">{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {suggestion.products && suggestion.products.length > 0 && (
                <div>
                  <p className="eyebrow">What to use</p>
                  <ul className="mt-2 flex flex-wrap gap-2">
                    {suggestion.products.map((p) => (
                      <li
                        key={p}
                        className="rounded-full border border-line bg-paper px-3 py-1.5 text-xs text-ink-soft"
                      >
                        {p}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {(suggestion.timeline || suggestion.frequency || suggestion.evidence) && (
                <p className="flex flex-wrap gap-x-4 gap-y-1 border-t border-line pt-3 font-mono text-[10px] uppercase tracking-label text-ink-soft">
                  {suggestion.frequency && <span>⟳ {suggestion.frequency}</span>}
                  {suggestion.timeline && <span>Results: {suggestion.timeline}</span>}
                  {suggestion.evidence && (
                    <span
                      className={
                        suggestion.evidence === "strong" ? "text-pine" : undefined
                      }
                    >
                      Evidence: {suggestion.evidence}
                    </span>
                  )}
                </p>
              )}
            </div>
            {suggestion.image && (
              <PreviewImage
                src={suggestion.image}
                alt={`Example: ${suggestion.title}`}
              />
            )}
          </div>
        </div>
      )}
    </article>
  );
}

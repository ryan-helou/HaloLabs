"use client";

import { useCheckout } from "./useCheckout";

/**
 * Wraps the content column of a locked report act. The act's header, numeral,
 * and blurb (the ReportSection left rail) stay razor sharp — only the specifics
 * here get a CSS blur, so the shape of the plan shows through but nothing is
 * legible or interactive until the plan is unlocked.
 *
 * The whole blurred area is one big unlock affordance: clicking (or keyboard-
 * activating) anywhere on it starts Stripe Checkout, same as the PaywallBar
 * and UnlockCard buttons.
 *
 * A future refinement can blur per field (product names, how[] steps, timelines)
 * while keeping sub-headers sharp; for now the whole column blurs behind a light
 * scrim, which reads clearly as a paywall while preserving the row geometry.
 */
export default function LockedSection({
  children,
  note = "Included in the full plan",
}: {
  children: React.ReactNode;
  /** Short line shown on the lock chip over the blurred content. */
  note?: string;
}) {
  const { startCheckout, loading, error } = useCheckout();

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Unlock the full plan"
      onClick={() => {
        if (!loading) startCheckout();
      }}
      onKeyDown={(e) => {
        if ((e.key === "Enter" || e.key === " ") && !loading) {
          e.preventDefault();
          startCheckout();
        }
      }}
      className="group relative isolate cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-pine"
    >
      {/* The real content, blurred and inert. aria-hidden so screen readers
          skip the scrambled copy — the lock chip carries the message. */}
      <div
        aria-hidden
        className="pointer-events-none select-none blur-[5px] saturate-[0.85]"
      >
        {children}
      </div>

      {/* Light scrim + centered lock chip. pointer-events-none so clicks fall
          through to the wrapper, which opens checkout. */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-paper/25">
        <div className="flex items-center gap-2 rounded-full border border-line bg-paper/90 px-4 py-2 shadow-float backdrop-blur-sm transition-colors group-hover:border-pine">
          <svg
            viewBox="0 0 24 24"
            className="h-3.5 w-3.5 text-pine"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          <span className="font-mono text-[10px] uppercase tracking-label text-ink-soft">
            {loading
              ? "Opening checkout…"
              : error
                ? "Couldn't open checkout — tap to retry"
                : note}
          </span>
        </div>
      </div>
    </div>
  );
}

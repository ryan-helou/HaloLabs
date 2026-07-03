"use client";

import { useCheckout } from "./useCheckout";

/**
 * The inline value section on a locked plan — the calm, honest counterpart to
 * the sticky PaywallBar. It states plainly what membership unlocks (the routine,
 * roadmap, shopping list, and the reasoning behind every move) rather than
 * dangling a "rating". No countdowns, no fake scarcity, no "unlock your true
 * self" — that's the STRATEGY §3.7 line we don't cross. It reuses the HaloGlance
 * dark band so the unlock reads as a membership moment, not a wall.
 */

const INCLUDED = [
  {
    title: "Your full AM / PM / weekly routine",
    body: "An ordered schedule you can actually follow, laid out by time of day.",
  },
  {
    title: "A phased roadmap you check off",
    body: "This week, the next 90 days, then maintain — with progress that sticks.",
  },
  {
    title: "A shopping list with named examples",
    body: "Product categories with example brands and price bands. Examples, never ads.",
  },
  {
    title: "Every suggestion in full",
    body: "The why (tied to your photos), the how-to steps, and what to use.",
  },
  {
    title: "Progress tracking over time",
    body: "Re-photo checkpoints and check-offs as your plan comes together.",
  },
];

function Check() {
  return (
    <span
      aria-hidden
      className="mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-paper/15"
    >
      <svg
        viewBox="0 0 24 24"
        className="h-3 w-3 text-paper"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M20 6 9 17l-5-5" />
      </svg>
    </span>
  );
}

export default function UnlockCard({
  totalCount,
  price = "$9.99",
  cadence = "/mo",
}: {
  /** Total suggestions in the full plan — quietly anchors the value. */
  totalCount: number;
  price?: string;
  cadence?: string;
}) {
  const { startCheckout, loading, error } = useCheckout();

  return (
    <section className="scroll-mt-24 border-t border-line bg-gradient-to-br from-[#3A3F44] via-pine-deep to-[#5B7280] text-paper">
      <div className="mx-auto max-w-[1300px] px-6 py-16 sm:px-10 lg:py-20">
        <div className="grid gap-x-12 gap-y-10 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
          {/* Left — the pitch + what's included. */}
          <div>
            <span className="inline-flex rounded-full border border-paper/25 px-3 py-1 font-mono text-[10px] uppercase tracking-label text-paper/70">
              Membership / full plan
            </span>
            <h2 className="mt-7 font-display text-4xl font-medium leading-[1.04] tracking-tight sm:text-5xl">
              Your full plan is{" "}
              <span className="text-paper/60">ready to open</span>
            </h2>
            <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-paper/70">
              You&apos;ve seen what already works for you and your first move.
              Membership opens the rest{totalCount > 0 ? ` — all ${totalCount} suggestions` : ""}:
              the routine, the roadmap, the shopping list, and the reasoning
              behind every one.
            </p>

            <ul className="mt-9 grid gap-x-8 gap-y-4 sm:grid-cols-2">
              {INCLUDED.map((item) => (
                <li key={item.title} className="flex items-start gap-3">
                  <Check />
                  <span className="min-w-0">
                    <span className="block text-[14px] font-medium leading-snug text-paper">
                      {item.title}
                    </span>
                    <span className="mt-0.5 block text-[13px] leading-snug text-paper/55">
                      {item.body}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Right — the price + CTA card. */}
          <div className="lg:border-l lg:border-paper/15 lg:pl-12">
            <div className="rounded-2xl border border-paper/15 bg-paper/[0.06] p-6 sm:p-7">
              <p className="font-mono text-[10px] uppercase tracking-label text-paper/55">
                HaloLabs membership /
              </p>
              <div className="mt-4 flex items-baseline gap-1.5">
                <span className="font-display text-5xl font-medium tracking-tight">
                  {price}
                </span>
                <span className="text-sm text-paper/55">{cadence}</span>
              </div>

              <button
                type="button"
                onClick={startCheckout}
                disabled={loading}
                className="mt-6 w-full rounded-full bg-paper px-6 py-3.5 text-center text-sm font-semibold text-pine-deep transition-colors hover:bg-white disabled:opacity-60"
              >
                {loading ? "Opening checkout…" : "Unlock full plan"}
              </button>

              {error && (
                <p className="mt-3 text-xs text-clay-soft" role="alert">
                  {error}
                </p>
              )}

              <ul className="mt-6 space-y-2.5 border-t border-paper/12 pt-5 text-[13px] text-paper/55">
                <li className="flex items-center gap-2.5">
                  <Dot /> Cancel anytime
                </li>
                <li className="flex items-center gap-2.5">
                  <Dot /> No score, no ranking — just your plan
                </li>
                <li className="flex items-center gap-2.5">
                  <Dot /> Your photos stay yours
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Dot() {
  return (
    <span
      aria-hidden
      className="h-1.5 w-1.5 shrink-0 rounded-full bg-paper/40"
    />
  );
}

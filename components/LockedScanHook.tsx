"use client";

import type { Person } from "@/lib/types";
import { ADVICE_CATEGORIES } from "@/lib/types";
import { flattenAdvice, pickFreeReveal } from "@/lib/plan";
import { isQuickWin } from "@/lib/badges";
import { CATEGORY_META } from "@/lib/categories";
import { useCheckout } from "./useCheckout";

/**
 * The free-scan hook — the top of a locked plan, and the surface cold UGC
 * traffic (looksmaxxing TikTok/IG) actually lands on. It sells "you have real
 * upside" hard — but the honest, defensible way: it proves the scan saw them
 * (strengths first), names WHERE their biggest leverage is (a category, never a
 * rating), quantifies the deliverable (moves / quick wins / evidence), hands
 * over one real move free, and stacks the honest magnitude framing ("small
 * alone, they add up"). No attractiveness score, no "gain N points", no
 * pay-to-reveal-your-worth — those are the STRATEGY §3 lines, and the number is
 * the competitor's weakness, not ours.
 */
export default function LockedScanHook({ person }: { person: Person }) {
  const { startCheckout, loading, error } = useCheckout();
  const plan = person.plan;

  const flat = flattenAdvice(person.advice);
  const total = flat.length;
  const quickWins = flat.filter((f) => isQuickWin(f.suggestion)).length;
  const strong = flat.filter((f) => f.suggestion.evidence === "strong").length;
  const free = pickFreeReveal(person.advice);
  const strengths = plan?.strengths ?? [];

  // Biggest leverage area: the category with the most high-impact moves (ties
  // broken by total). A named area, derived from the plan — not a score.
  const catStats = ADVICE_CATEGORIES.map((cat) => {
    const items = person.advice[cat] ?? [];
    return {
      cat,
      high: items.filter((s) => s.impact === "high").length,
      count: items.length,
    };
  }).filter((c) => c.count > 0);
  const topCat = [...catStats].sort(
    (a, b) => b.high - a.high || b.count - a.count
  )[0];
  const topArea = topCat ? CATEGORY_META[topCat.cat].label.toLowerCase() : null;

  if (total === 0 && strengths.length === 0) return null;

  const stats = [
    { n: total, label: `move${total === 1 ? "" : "s"}` },
    ...(quickWins > 0 ? [{ n: quickWins, label: "quick wins" }] : []),
    ...(strong > 0 ? [{ n: strong, label: "strong-evidence" }] : []),
  ];

  return (
    <section className="bg-gradient-to-br from-[#3A3F44] via-pine-deep to-[#5B7280] text-paper">
      <div className="mx-auto grid max-w-[1300px] gap-x-12 gap-y-10 px-6 py-16 sm:px-10 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:py-20">
        {/* ── Left: the sell ─────────────────────────────────────────── */}
        <div>
          <span className="inline-flex rounded-full border border-paper/25 px-3 py-1 font-mono text-[10px] uppercase tracking-label text-paper/70">
            Your free scan
          </span>

          <h2 className="mt-6 font-display text-4xl font-medium leading-[1.04] tracking-tight sm:text-5xl lg:text-6xl">
            You&apos;ve got real{" "}
            <span className="text-paper/60">upside.</span>
          </h2>

          <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-paper/80">
            {topArea ? (
              <>
                Your biggest leverage to level up is in{" "}
                <span className="font-medium text-paper">your {topArea}</span> —
                and it&apos;s all grooming, habits, and style. No surgery, no
                filters, no fake number. Just {total} specific move
                {total === 1 ? "" : "s"} built from your photos.
              </>
            ) : (
              <>Built from your photos — specific moves, no surgery, no scores.</>
            )}
          </p>

          {/* Quantified deliverable — numbers about the plan, never the face. */}
          <div className="mt-8 flex flex-wrap gap-x-8 gap-y-4">
            {stats.map((s) => (
              <div key={s.label}>
                <div className="font-display text-3xl font-medium tabular-nums">
                  {s.n}
                </div>
                <div className="mt-0.5 font-mono text-[10px] uppercase tracking-label text-paper/55">
                  {s.label}
                </div>
              </div>
            ))}
            <div>
              <div className="font-display text-3xl font-medium">Today</div>
              <div className="mt-0.5 font-mono text-[10px] uppercase tracking-label text-paper/55">
                first move
              </div>
            </div>
          </div>

          {/* One real move, free — proof the paid depth is real. */}
          {free && (
            <div className="mt-9 rounded-2xl border border-paper/15 bg-paper/[0.06] p-5 sm:p-6">
              <p className="font-mono text-[10px] uppercase tracking-label text-paper/55">
                Your first move — free /
              </p>
              <h3 className="mt-2.5 font-display text-xl font-medium leading-snug">
                {free.suggestion.title}
              </h3>
              {free.suggestion.why && (
                <p className="mt-2 text-sm leading-relaxed text-paper/75">
                  <span className="font-medium text-paper/90">Why you: </span>
                  {free.suggestion.why}
                </p>
              )}
              {free.suggestion.how && free.suggestion.how.length > 0 && (
                <p className="mt-2.5 text-sm leading-relaxed text-paper/70">
                  <span className="font-medium text-paper/90">Start here: </span>
                  {free.suggestion.how[0]}
                </p>
              )}
            </div>
          )}

          {/* Honest magnitude — how you say "you can get better, a lot". */}
          <p className="mt-7 text-sm leading-relaxed text-paper/60">
            <span className="font-medium text-paper/85">The honest part: </span>
            any single change is small on its own. The gains come from stacking
            many reliable ones over a few months — that&apos;s the whole idea,
            and that&apos;s what the other {Math.max(total - 1, 0)} moves are.
          </p>

          {/* Bridge to unlock. */}
          <div className="mt-8">
            <button
              type="button"
              onClick={startCheckout}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-full bg-paper px-7 py-3.5 text-sm font-semibold text-pine-deep transition-colors hover:bg-white disabled:opacity-60"
            >
              {loading ? "Opening checkout…" : `Unlock all ${total} moves`}
              {!loading && <span aria-hidden>→</span>}
            </button>
            <p className="mt-3 text-xs text-paper/55">
              Your AM/PM routine, a shopping list with named products, and a
              90-day roadmap you check off. Cancel anytime.
            </p>
            {error && (
              <p className="mt-2 text-xs text-clay-soft" role="alert">
                {error}
              </p>
            )}
          </div>
        </div>

        {/* ── Right: proof it saw you (strengths first) ──────────────── */}
        {strengths.length > 0 && (
          <div className="border-t border-paper/15 pt-8 lg:border-l lg:border-t-0 lg:pl-12 lg:pt-0">
            <p className="font-mono text-[10px] uppercase tracking-label text-paper/55">
              Already working for you /
            </p>
            <ul className="mt-5 space-y-2.5">
              {strengths.map((s) => (
                <li
                  key={s}
                  className="flex items-start gap-3 rounded-xl border border-paper/12 bg-paper/[0.06] px-4 py-3.5"
                >
                  <span
                    aria-hidden
                    className="mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-paper/15"
                  >
                    <svg viewBox="0 0 24 24" className="h-3 w-3 text-paper" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                  </span>
                  <span className="text-[14px] leading-snug text-paper/90">{s}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs leading-relaxed text-paper/45">
              We lead with what already works — because most of it does, and
              enhancing beats chasing someone else&apos;s face.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

"use client";

import type { Person } from "@/lib/types";
import { flattenAdvice } from "@/lib/plan";
import { startingMoves } from "@/lib/glance";
import { useProgress } from "./ProgressProvider";
import ShareButton from "./ShareButton";

/**
 * The Overview tab — the calm landing. It orients without repeating the
 * checklist: what the plan is about (the summary), what already works
 * (strengths, always first), how far along you are (one honest progress line),
 * and a short "start here this week" nudge that routes into Your Plan. The doing
 * lives in the Plan tab; this is the soft entry before it.
 */
export default function HaloGlance({
  person,
  locked = false,
}: {
  person: Person;
  /** Locked view hides the check-off progress bar (nothing to track yet). */
  locked?: boolean;
}) {
  const { isDone } = useProgress();
  const plan = person.plan;
  const strengths = plan?.strengths ?? [];
  const start = startingMoves(person, 3);

  const allMoves = flattenAdvice(person.advice);
  const total = allMoves.length;
  const done = allMoves.filter((m) => isDone(m.id)).length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <section className="mx-auto max-w-[760px] px-5 pb-16 pt-10 sm:px-6">
      {/* Summary — what this plan is about, in the plan's own honest voice. */}
      {plan?.summary?.trim() && (
        <div className="max-w-[54ch]">
          <p className="text-xs font-semibold uppercase tracking-[0.06em] text-ink-soft">
            Your plan, in short
          </p>
          <p className="mt-3 text-[16.5px] leading-relaxed text-ink">{plan.summary}</p>
        </div>
      )}

      {/* Share — a PII-safe card (counts + composition, never a score or photo). */}
      {total > 0 && (
        <div className="mt-6 flex items-center gap-3">
          <ShareButton personId={person.id} kind="plan" />
          <span className="text-xs text-ink-soft">
            Shares a scores-free summary card — no photos, no personal details.
          </span>
        </div>
      )}

      {/* Progress — one line, moves you've checked off across the whole plan. */}
      {!locked && total > 0 && (
        <div className="mt-9 rounded-2xl border border-line bg-surface p-5">
          <div className="flex items-baseline justify-between text-[13.5px]">
            <span className="font-medium text-ink">Your progress</span>
            <span className="tabular-nums text-ink-soft">{done} of {total} moves done</span>
          </div>
          <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-line">
            <div className="h-full rounded-full bg-pine transition-[width] duration-500" style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}

      {/* Strengths — lead with what already works. */}
      {strengths.length > 0 && (
        <div className="mt-11">
          <h2 className="font-display text-xl font-medium tracking-tight text-ink">
            What&apos;s already working for you
          </h2>
          <ul className="mt-5 grid gap-2.5 sm:grid-cols-2">
            {strengths.map((s) => (
              <li key={s} className="flex items-start gap-3 text-[15px] leading-snug text-ink">
                <span aria-hidden className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sage text-pine-deep">
                  <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                </span>
                {s}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Start here — the smallest possible push into the plan. */}
      {start.length > 0 && (
        <div className="mt-11 rounded-2xl border border-line bg-gradient-to-br from-pine-deep to-pine p-6 text-paper sm:p-7">
          <p className="text-xs font-semibold uppercase tracking-[0.06em] text-paper/60">
            Start here this week
          </p>
          <ul className="mt-4 grid gap-2.5">
            {start.map((m, i) => (
              <li key={m.id} className="flex items-baseline gap-3">
                <span className="w-4 shrink-0 text-[13px] tabular-nums text-paper/45">{i + 1}</span>
                <span className="text-[15.5px] leading-snug text-paper/95">{m.suggestion.title}</span>
              </li>
            ))}
          </ul>
          <a
            href="#plan"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-paper px-5 py-2.5 text-[14px] font-semibold text-pine-deep transition-colors hover:bg-white"
          >
            See your full plan
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </a>
        </div>
      )}
    </section>
  );
}

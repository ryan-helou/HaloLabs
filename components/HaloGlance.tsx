"use client";

import { useState } from "react";
import type { AdviceCategory, Person } from "@/lib/types";
import type { FlatSuggestion } from "@/lib/plan";
import type { FocusArea } from "@/lib/glance";
import { CATEGORY_META } from "@/lib/categories";
import { startingMoves, focusAreas } from "@/lib/glance";
import { useProgress } from "./ProgressProvider";

/**
 * The digest — the one thing to read. A single dark focal band that answers
 * "what do I do?" at a glance. It leads with what already works (strengths
 * first, per STRATEGY §"Strengths first" — the most-loved framing and a
 * wellbeing safeguard), then the few starting moves you can check off (each
 * expands inline for the why/how/what-to-use), and a composition bar of what
 * the plan is made of. The composition is a NEUTRAL COUNT of moves per area,
 * never a per-feature score (STRATEGY NEVER-3.1). Everything deeper lives
 * collapsed below.
 */
export default function HaloGlance({ person }: { person: Person }) {
  const plan = person.plan;
  const moves = startingMoves(person, 3);
  const focus = focusAreas(person);
  const strengths = plan?.strengths ?? [];

  if (moves.length === 0 && focus.length === 0 && strengths.length === 0)
    return null;

  return (
    <section className="bg-gradient-to-br from-[#3A3F44] via-pine-deep to-[#5B7280] text-paper">
      <div className="mx-auto max-w-[1300px] px-6 py-14 sm:px-10 lg:py-16">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <span className="inline-flex rounded-full border border-paper/25 px-3 py-1 font-mono text-[10px] uppercase tracking-label text-paper/70">
            Your plan / at a glance
          </span>
          {person.builtFor && person.builtFor.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {person.builtFor.map((b) => (
                <span
                  key={b}
                  className="rounded-full border border-paper/20 bg-paper/10 px-3 py-1 font-mono text-[10px] uppercase tracking-label text-paper/75"
                >
                  {b}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* ── Strengths first — lead with what already works. ───────────── */}
        {strengths.length > 0 && (
          <div className="mt-9">
            <p className="font-mono text-[10px] uppercase tracking-label text-paper/55">
              Already working for you /
            </p>
            <ul className="mt-4 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
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
          </div>
        )}

        <div className="mt-10 grid gap-x-12 gap-y-10 border-t border-paper/15 pt-10 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
          {/* Left — start here, the checkable moves. */}
          <div>
            <h2 className="font-display text-4xl font-medium leading-[1.04] tracking-tight sm:text-5xl">
              Start with{" "}
              <span className="text-paper/60">
                {moves.length} move{moves.length === 1 ? "" : "s"}
              </span>
            </h2>
            {plan?.summary?.trim() && (
              <p className="mt-4 line-clamp-2 max-w-xl text-[15px] leading-relaxed text-paper/70">
                {plan.summary}
              </p>
            )}

            <ol className="mt-7 space-y-2.5">
              {moves.map((m, i) => (
                <GlanceMove key={m.id} flat={m} index={i} />
              ))}
            </ol>

            {plan?.expectations?.trim() && (
              <p className="mt-7 border-t border-paper/15 pt-5 text-sm leading-relaxed text-paper/60">
                <span className="font-medium text-paper/80">
                  What to expect:{" "}
                </span>
                {plan.expectations}
              </p>
            )}
          </div>

          {/* Right — what the plan is made of (neutral counts, not scores). */}
          {focus.length > 0 && (
            <div className="lg:border-l lg:border-paper/15 lg:pl-12">
              <PlanComposition focus={focus} />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

// Lifted category colors so the composition bar reads on the dark band; the
// same hues as CATEGORY_META, just brighter for contrast.
const BAR_COLOR: Record<AdviceCategory, string> = {
  hair: "#8AA2B2",
  skin: "#A6BCC4",
  style: "#C9906F",
  fitness: "#AEB47F",
};

/** One stacked bar of what the plan is made of, plus a neutral count legend. */
function PlanComposition({ focus }: { focus: FocusArea[] }) {
  const total = focus.reduce((n, f) => n + f.count, 0);
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <p className="font-mono text-[10px] uppercase tracking-label text-paper/55">
          What your plan focuses on /
        </p>
        <span className="font-mono text-[10px] uppercase tracking-label text-paper/45">
          {total} moves
        </span>
      </div>

      {/* Single composition bar — segments sized by share of the whole plan. */}
      <div className="mt-4 flex h-2.5 gap-0.5 overflow-hidden rounded-full">
        {focus.map((f) => (
          <div
            key={f.cat}
            className="h-full first:rounded-l-full last:rounded-r-full"
            style={{ width: `${f.share * 100}%`, backgroundColor: BAR_COLOR[f.cat] }}
            title={`${f.label}: ${f.count}`}
          />
        ))}
      </div>

      {/* Legend — the neutral counts. */}
      <ul className="mt-5 space-y-3">
        {focus.map((f) => (
          <li key={f.cat} className="flex items-center gap-3">
            <span
              aria-hidden
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: BAR_COLOR[f.cat] }}
            />
            <span className="flex-1 text-sm text-paper/85">{f.label}</span>
            <span className="font-mono text-[13px] tabular-nums text-paper/60">
              {f.count}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** One checkable starting move; taps open the why/how/what-to-use inline. */
function GlanceMove({ flat, index }: { flat: FlatSuggestion; index: number }) {
  const { isDone, toggle } = useProgress();
  const [open, setOpen] = useState(false);
  const s = flat.suggestion;
  const done = isDone(flat.id);
  const meta = [CATEGORY_META[flat.category].label, s.frequency, s.timeline]
    .filter(Boolean)
    .join(" · ");

  return (
    <li className="overflow-hidden rounded-xl border border-paper/15 bg-paper/[0.06] transition-colors hover:border-paper/25 hover:bg-paper/[0.09]">
      <div className="flex items-start gap-3 px-4 py-3.5">
        <button
          type="button"
          role="checkbox"
          aria-checked={done}
          aria-label={`Mark "${s.title}" ${done ? "not done" : "done"}`}
          onClick={() => toggle(flat.id)}
          className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border text-xs transition-colors ${
            done
              ? "border-paper bg-paper text-pine-deep"
              : "border-paper/40 text-transparent hover:border-paper/70"
          }`}
        >
          ✓
        </button>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="flex min-w-0 flex-1 items-start justify-between gap-3 text-left"
        >
          <span className="min-w-0">
            <span className="flex items-baseline gap-2">
              <span className="font-mono text-[11px] text-paper/40">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span
                className={`text-[15px] leading-snug ${
                  done ? "text-paper/45 line-through" : "text-paper"
                }`}
              >
                {s.title}
              </span>
            </span>
            {meta && (
              <span className="mt-1 block pl-[26px] font-mono text-[10px] uppercase tracking-label text-paper/45">
                {meta}
              </span>
            )}
          </span>
          <span
            aria-hidden
            className={`mt-1 shrink-0 text-paper/50 transition-transform ${
              open ? "rotate-180" : ""
            }`}
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="m6 9 6 6 6-6" />
            </svg>
          </span>
        </button>
      </div>

      {open && (
        <div className="space-y-3 border-t border-paper/12 px-4 pb-4 pt-3 text-sm leading-relaxed text-paper/75">
          <p>{s.detail}</p>
          {s.why && (
            <p className="text-paper/85">
              <span className="font-medium text-paper">Why you: </span>
              {s.why}
            </p>
          )}
          {s.how && s.how.length > 0 && (
            <ol className="space-y-1.5">
              {s.how.map((step, i) => (
                <li key={i} className="flex items-baseline gap-2.5">
                  <span className="w-5 shrink-0 font-mono text-[11px] text-paper/50">
                    {i + 1}.
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          )}
          {s.products && s.products.length > 0 && (
            <ul className="flex flex-wrap gap-2 pt-1">
              {s.products.map((p) => (
                <li
                  key={p}
                  className="rounded-full border border-paper/15 bg-paper/[0.06] px-3 py-1 text-xs text-paper/70"
                >
                  {p}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </li>
  );
}

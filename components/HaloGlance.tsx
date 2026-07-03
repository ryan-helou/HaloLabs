"use client";

import { useState } from "react";
import type { Person } from "@/lib/types";
import type { FlatSuggestion } from "@/lib/plan";
import { CATEGORY_META } from "@/lib/categories";
import { startingMoves, focusAreas } from "@/lib/glance";
import { useProgress } from "./ProgressProvider";

/**
 * The digest — the one thing to read. A single dark focal band that answers
 * "what do I do?" at a glance: a few starting moves you can check off (each
 * expands inline for the why/how/what-to-use), a meter map of where the plan
 * focuses, and what already works. Everything deeper lives collapsed below.
 */
export default function HaloGlance({ person }: { person: Person }) {
  const plan = person.plan;
  const moves = startingMoves(person, 3);
  const focus = focusAreas(person);
  const strengths = plan?.strengths ?? [];

  if (moves.length === 0 && focus.length === 0) return null;

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

        <div className="mt-9 grid gap-x-12 gap-y-10 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
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
              {moves.map((m) => (
                <GlanceMove key={m.id} flat={m} />
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

          {/* Right — the map: where the plan focuses + what already works. */}
          <div className="space-y-9 lg:border-l lg:border-paper/15 lg:pl-12">
            {focus.length > 0 && (
              <div>
                <p className="font-mono text-[10px] uppercase tracking-label text-paper/55">
                  Where your plan focuses /
                </p>
                <ul className="mt-5 space-y-4">
                  {focus.map((f) => (
                    <li key={f.label}>
                      <div className="mb-1.5 flex items-baseline justify-between text-sm">
                        <span className="text-paper/90">{f.label}</span>
                        <span className="font-mono text-[11px] text-paper/45">
                          {f.count}
                        </span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-paper/12">
                        <div
                          className="h-full rounded-full bg-paper/70"
                          style={{ width: `${Math.max(8, f.fill * 100)}%` }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {strengths.length > 0 && (
              <div>
                <p className="font-mono text-[10px] uppercase tracking-label text-paper/55">
                  Already working for you /
                </p>
                <ul className="mt-4 flex flex-wrap gap-2">
                  {strengths.map((s) => (
                    <li
                      key={s}
                      className="rounded-full border border-paper/20 bg-paper/[0.07] px-3 py-1.5 text-[13px] leading-snug text-paper/85"
                    >
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

/** One checkable starting move; taps open the why/how/what-to-use inline. */
function GlanceMove({ flat }: { flat: FlatSuggestion }) {
  const { isDone, toggle } = useProgress();
  const [open, setOpen] = useState(false);
  const s = flat.suggestion;
  const done = isDone(flat.id);
  const meta = [CATEGORY_META[flat.category].label, s.frequency, s.timeline]
    .filter(Boolean)
    .join(" · ");

  return (
    <li className="overflow-hidden rounded-xl border border-paper/15 bg-paper/[0.06]">
      <div className="flex items-start gap-3 px-4 py-3">
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
            <span
              className={`block text-[15px] leading-snug ${
                done ? "text-paper/45 line-through" : "text-paper"
              }`}
            >
              {s.title}
            </span>
            {meta && (
              <span className="mt-1 block font-mono text-[10px] uppercase tracking-label text-paper/45">
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

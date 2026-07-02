"use client";

import { useMemo, useState } from "react";
import type {
  Advice,
  Plan,
  ProgressEntry,
  RoutineSlot,
} from "@/lib/types";
import { CATEGORY_META } from "@/lib/categories";
import { flattenAdvice } from "@/lib/plan";

/**
 * Acts 04–06 of the person page: the actionable plan.
 *   04 · Your routine    — AM / PM / weekly schedule
 *   05 · Roadmap         — phased suggestions with check-offs (progress.json)
 *   06 · Shopping list & checkpoints
 *
 * Check-offs are optimistic; the API write is fire-and-forget with rollback
 * on failure. Progress tracks the suggestion, and like every tag in the app
 * it never rates the person.
 */

function ActHeader({ num, title, id }: { num: string; title: string; id?: string }) {
  return (
    <div
      id={id}
      className="mb-5 flex scroll-mt-24 items-baseline gap-3 border-b border-line pb-3"
    >
      <span className="font-mono text-xs text-ink-soft">{num}</span>
      <h2 className="font-display text-2xl text-ink">{title}</h2>
    </div>
  );
}

const SLOT_META: Record<RoutineSlot, { title: string; sub: string; icon: string }> = {
  am: { title: "Morning", sub: "Every day", icon: "☀" },
  pm: { title: "Evening", sub: "Every night", icon: "☾" },
  weekly: { title: "Weekly", sub: "A few times a week", icon: "↻" },
};

export default function PlanBoard({
  personId,
  plan,
  advice,
  initialProgress,
}: {
  personId: string;
  plan: Plan;
  advice: Advice;
  initialProgress: Record<string, ProgressEntry>;
}) {
  const [progress, setProgress] =
    useState<Record<string, ProgressEntry>>(initialProgress);

  const byId = useMemo(() => {
    const map = new Map<string, { title: string; category: string; anchor: string }>();
    for (const f of flattenAdvice(advice)) {
      map.set(f.id, {
        title: f.suggestion.title,
        category: CATEGORY_META[f.category].label,
        anchor: f.anchor,
      });
    }
    return map;
  }, [advice]);

  async function toggle(suggestionId: string) {
    const next = !(progress[suggestionId]?.done ?? false);
    const prev = progress;
    setProgress({
      ...progress,
      [suggestionId]: { done: next, doneAt: new Date().toISOString() },
    });
    try {
      const res = await fetch("/api/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personId, suggestionId, done: next }),
      });
      if (!res.ok) setProgress(prev);
    } catch {
      setProgress(prev);
    }
  }

  const routineBySlot = (slot: RoutineSlot) =>
    (plan.routine ?? []).filter((r) => r.slot === slot);

  const totalPlanned = plan.phases.reduce((n, p) => n + p.suggestionIds.length, 0);
  const totalDone = plan.phases.reduce(
    (n, p) => n + p.suggestionIds.filter((sid) => progress[sid]?.done).length,
    0
  );

  return (
    <div className="space-y-14">
      {/* ── Act 04 · Routine ─────────────────────────────────────────── */}
      {plan.routine.length > 0 && (
        <section>
          <ActHeader num="04" title="Your routine" id="routine" />
          <p className="-mt-1 mb-5 max-w-xl text-[15px] leading-relaxed text-ink-soft">
            The repeating part of the plan, in the order to apply things.
            Introduce one new product at a time — give each two weeks before
            adding the next.
          </p>
          <div className="grid gap-4 md:grid-cols-3">
            {(Object.keys(SLOT_META) as RoutineSlot[]).map((slot) => {
              const steps = routineBySlot(slot);
              if (steps.length === 0) return null;
              const meta = SLOT_META[slot];
              return (
                <div
                  key={slot}
                  className="rounded-2xl border border-line bg-surface p-5 shadow-card"
                >
                  <div className="flex items-baseline justify-between">
                    <h3 className="font-display text-lg text-ink">
                      <span aria-hidden className="mr-2 text-pine">
                        {meta.icon}
                      </span>
                      {meta.title}
                    </h3>
                    <span className="font-mono text-[10px] uppercase tracking-label text-ink-soft">
                      {meta.sub}
                    </span>
                  </div>
                  <ol className="mt-4 space-y-2.5">
                    {steps.map((step, i) => (
                      <li key={i} className="flex items-baseline gap-3">
                        <span className="font-mono text-xs text-pine">{i + 1}</span>
                        <span className="flex-1 text-sm leading-relaxed text-ink">
                          {step.step}
                          {step.suggestionId && byId.has(step.suggestionId) && (
                            <a
                              href={`#${byId.get(step.suggestionId)!.anchor}`}
                              className="ml-1.5 font-mono text-[10px] text-pine hover:text-pine-deep"
                              aria-label={`Details: ${byId.get(step.suggestionId)!.title}`}
                            >
                              ↗
                            </a>
                          )}
                        </span>
                      </li>
                    ))}
                  </ol>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Act 05 · Roadmap ─────────────────────────────────────────── */}
      {plan.phases.length > 0 && (
        <section>
          <ActHeader num="05" title="Roadmap" id="roadmap" />
          <div className="-mt-1 mb-5 flex flex-wrap items-center justify-between gap-3">
            <p className="max-w-xl text-[15px] leading-relaxed text-ink-soft">
              Work the phases in order — early wins fund the patience the
              slower changes need. Check things off as they become habits.
            </p>
            <span className="rounded-full border border-line bg-surface px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-label text-ink-soft">
              {totalDone}/{totalPlanned} done
            </span>
          </div>

          <div className="space-y-4">
            {plan.phases.map((phase) => {
              // A phase with nothing in it (e.g. nothing to maintain yet) is
              // noise — skip it rather than render an empty box.
              if (phase.suggestionIds.length === 0) return null;
              const done = phase.suggestionIds.filter((sid) => progress[sid]?.done).length;
              const pct = phase.suggestionIds.length
                ? Math.round((done / phase.suggestionIds.length) * 100)
                : 0;
              return (
                <div
                  key={phase.number}
                  className="overflow-hidden rounded-2xl border border-line bg-surface shadow-card"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line px-5 py-4 sm:px-6">
                    <div className="flex items-baseline gap-3">
                      <span className="font-mono text-xs text-pine">
                        P{phase.number}
                      </span>
                      <h3 className="font-display text-xl text-ink">{phase.title}</h3>
                      <span className="font-mono text-[10px] uppercase tracking-label text-ink-soft">
                        {phase.window}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="h-1.5 w-28 overflow-hidden rounded-full bg-line">
                        <div
                          className="h-full rounded-full bg-pine transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="font-mono text-[10px] text-ink-soft">
                        {done}/{phase.suggestionIds.length}
                      </span>
                    </div>
                  </div>
                  <p className="border-b border-line px-5 py-3 text-sm text-ink-soft sm:px-6">
                    {phase.focus}
                  </p>
                  <ul className="divide-y divide-line">
                    {phase.suggestionIds.map((sid) => {
                      const info = byId.get(sid);
                      const isDone = progress[sid]?.done ?? false;
                      if (!info) return null;
                      return (
                        <li key={sid} className="flex items-center gap-4 px-5 py-3 sm:px-6">
                          <button
                            type="button"
                            role="checkbox"
                            aria-checked={isDone}
                            aria-label={`Mark "${info.title}" ${isDone ? "not done" : "done"}`}
                            onClick={() => toggle(sid)}
                            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border transition-colors ${
                              isDone
                                ? "border-pine bg-pine text-paper"
                                : "border-line bg-paper text-transparent hover:border-pine/50"
                            }`}
                          >
                            ✓
                          </button>
                          <a
                            href={`#${info.anchor}`}
                            className={`flex-1 text-[15px] transition-colors hover:text-pine ${
                              isDone ? "text-ink-soft line-through decoration-line" : "text-ink"
                            }`}
                          >
                            {info.title}
                          </a>
                          <span className="font-mono text-[10px] uppercase tracking-label text-ink-soft">
                            {info.category}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Act 06 · Shopping list & checkpoints ─────────────────────── */}
      {(plan.shoppingList.length > 0 || plan.checkpoints.length > 0) && (
        <section>
          <ActHeader num="06" title="Shopping list & checkpoints" id="shopping" />
          <div className="grid gap-4 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
            {plan.shoppingList.length > 0 && (
              <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
                <div className="border-b border-line px-5 py-4 sm:px-6">
                  <h3 className="font-display text-lg text-ink">What to buy</h3>
                  <p className="mt-1 text-xs text-ink-soft">
                    Examples, not endorsements — no affiliate links, ever. Any
                    equivalent with the same active/spec works.
                  </p>
                </div>
                <ul className="divide-y divide-line">
                  {plan.shoppingList.map((item) => {
                    const info = item.suggestionId ? byId.get(item.suggestionId) : undefined;
                    return (
                      <li
                        key={item.item}
                        className="grid gap-1 px-5 py-3.5 sm:grid-cols-[1fr_auto] sm:items-baseline sm:gap-4 sm:px-6"
                      >
                        <div className="min-w-0">
                          <p className="text-[15px] text-ink">
                            {item.item}
                            {info && (
                              <a
                                href={`#${info.anchor}`}
                                className="ml-1.5 font-mono text-[10px] text-pine hover:text-pine-deep"
                                aria-label={`Details: ${info.title}`}
                              >
                                ↗
                              </a>
                            )}
                          </p>
                          <p className="mt-0.5 text-xs text-ink-soft">e.g. {item.examples}</p>
                        </div>
                        <span className="shrink-0 font-mono text-xs text-ink-soft">
                          {item.approxCost}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {plan.checkpoints.length > 0 && (
              <div className="rounded-2xl border border-line bg-surface p-5 shadow-card sm:p-6">
                <h3 className="font-display text-lg text-ink">Checkpoints</h3>
                <p className="mt-1 text-xs text-ink-soft">
                  Re-photo in the same spot and light as your originals —
                  consistency is what makes progress visible.
                </p>
                <ol className="mt-5 space-y-4">
                  {plan.checkpoints.map((cp) => (
                    <li key={cp.week} className="flex gap-4">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sage font-mono text-[10px] uppercase text-pine">
                        w{cp.week}
                      </span>
                      <p className="text-sm leading-relaxed text-ink-soft">{cp.lookFor}</p>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

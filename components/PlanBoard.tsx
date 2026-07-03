"use client";

import { useMemo } from "react";
import type { Advice, Plan, RoutineSlot } from "@/lib/types";
import { CATEGORY_META } from "@/lib/categories";
import { flattenAdvice } from "@/lib/plan";
import ReportSection from "./ReportSection";
import { useProgress } from "./ProgressProvider";

/**
 * Acts [04]–[06] of the report: the actionable plan.
 *   [04] Your daily routine    — AM / PM / weekly as hairline-divided columns
 *   [05] Your phased roadmap   — the Qoves protocol-timeline pattern: phase
 *        columns with mono window labels and check-offs (progress.json)
 *   [06] Shopping list & checkpoints
 *
 * Check-offs are optimistic; the API write is fire-and-forget with rollback
 * on failure. Progress tracks the suggestion, and like every tag in the app
 * it never rates the person.
 */

const SLOT_META: Record<RoutineSlot, { title: string; sub: string; icon: string }> = {
  am: { title: "Morning", sub: "Every day", icon: "☀" },
  pm: { title: "Evening", sub: "Every night", icon: "☾" },
  weekly: { title: "Weekly", sub: "A few times a week", icon: "↻" },
};

export default function PlanBoard({
  plan,
  advice,
  startNum = 4,
  locked = false,
}: {
  plan: Plan;
  advice: Advice;
  /** First section number; subsequent rendered sections count up from here. */
  startNum?: number;
  /** Blur the routine/roadmap/shopping specifics behind the paywall. */
  locked?: boolean;
}) {
  const { isDone, toggle } = useProgress();

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

  const routineBySlot = (slot: RoutineSlot) =>
    (plan.routine ?? []).filter((r) => r.slot === slot);

  // A phase with nothing in it (e.g. nothing to maintain yet) is noise —
  // skip it rather than render an empty column.
  const phases = plan.phases.filter((p) => p.suggestionIds.length > 0);
  const totalPlanned = phases.reduce((n, p) => n + p.suggestionIds.length, 0);
  const totalDone = phases.reduce(
    (n, p) => n + p.suggestionIds.filter((sid) => isDone(sid)).length,
    0
  );
  const totalPct = totalPlanned ? Math.round((totalDone / totalPlanned) * 100) : 0;

  // Number only the sections that actually render, counting up from startNum.
  const pad = (x: number) => String(x).padStart(2, "0");
  const showRoutine = plan.routine.length > 0;
  const showRoadmap = phases.length > 0;
  const showShopping = plan.shoppingList.length > 0 || plan.checkpoints.length > 0;
  let secN = startNum;
  const routineNum = showRoutine ? pad(secN++) : "";
  const roadmapNum = showRoadmap ? pad(secN++) : "";
  const shoppingNum = showShopping ? pad(secN++) : "";

  return (
    <>
      {/* ── [04] Routine ─────────────────────────────────────────────── */}
      {plan.routine.length > 0 && (
        <ReportSection
          num={routineNum}
          titleA="Your daily"
          titleB="routine"
          id="routine"
          blurb="The repeating part of the plan, in the order to apply things. Introduce one new product at a time — give each two weeks before adding the next."
          lockedContent={locked}
          lockNote="Your full routine"
        >
          <div className="grid divide-y divide-line md:grid-flow-col md:auto-cols-fr md:divide-x md:divide-y-0">
            {(Object.keys(SLOT_META) as RoutineSlot[]).map((slot) => {
              const steps = routineBySlot(slot);
              if (steps.length === 0) return null;
              const meta = SLOT_META[slot];
              return (
                <div key={slot} className="px-6 py-8 sm:px-8">
                  <p className="font-mono text-[10px] uppercase tracking-label text-ink-soft">
                    {meta.sub} /
                  </p>
                  <h3 className="mt-2 font-display text-2xl text-ink">
                    <span aria-hidden className="mr-2 text-pine">
                      {meta.icon}
                    </span>
                    {meta.title}
                  </h3>
                  <ol className="mt-5 space-y-3">
                    {steps.map((step, i) => (
                      <li key={i} className="flex items-baseline gap-4">
                        <span className="w-7 shrink-0 font-mono text-xs text-pine">
                          [{i + 1}]
                        </span>
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
        </ReportSection>
      )}

      {/* ── [05] Roadmap — the protocol timeline ─────────────────────── */}
      {phases.length > 0 && (
        <ReportSection
          num={roadmapNum}
          titleA="Your phased"
          titleB="roadmap"
          id="roadmap"
          blurb="Work the phases in order — early wins fund the patience the slower changes need. Check things off as they become habits."
          lockedContent={locked}
          lockNote="Your 3-phase roadmap"
          rail={
            <div>
              <div className="flex items-baseline justify-between font-mono text-[10px] uppercase tracking-label text-ink-soft">
                <span>Progress</span>
                <span>
                  {totalDone}/{totalPlanned} done
                </span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line">
                <div
                  className="h-full rounded-full bg-pine transition-all"
                  style={{ width: `${totalPct}%` }}
                />
              </div>
            </div>
          }
        >
          <div className="grid divide-y divide-line lg:grid-flow-col lg:auto-cols-fr lg:divide-x lg:divide-y-0">
            {phases.map((phase) => {
              const done = phase.suggestionIds.filter((sid) => isDone(sid)).length;
              return (
                <div key={phase.number} className="px-6 py-8 sm:px-8">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="font-mono text-[10px] uppercase tracking-label text-pine">
                      Phase {phase.number} / {phase.window}
                    </p>
                    <span className="font-mono text-[10px] text-ink-soft">
                      {done}/{phase.suggestionIds.length}
                    </span>
                  </div>
                  <h3 className="mt-2 font-display text-2xl text-ink">{phase.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                    {phase.focus}
                  </p>
                  <ul className="mt-6 divide-y divide-line border-t border-line">
                    {phase.suggestionIds.map((sid) => {
                      const info = byId.get(sid);
                      const done = isDone(sid);
                      if (!info) return null;
                      return (
                        <li key={sid} className="flex items-center gap-3 py-3">
                          <button
                            type="button"
                            role="checkbox"
                            aria-checked={done}
                            aria-label={`Mark "${info.title}" ${done ? "not done" : "done"}`}
                            onClick={() => toggle(sid)}
                            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border transition-colors ${
                              done
                                ? "border-pine bg-pine text-paper"
                                : "border-line bg-paper text-transparent hover:border-pine/50"
                            }`}
                          >
                            ✓
                          </button>
                          <div className="min-w-0 flex-1">
                            <a
                              href={`#${info.anchor}`}
                              className={`block text-sm transition-colors hover:text-pine ${
                                done
                                  ? "text-ink-soft line-through decoration-line"
                                  : "text-ink"
                              }`}
                            >
                              {info.title}
                            </a>
                            <p className="mt-0.5 font-mono text-[9px] uppercase tracking-label text-ink-soft">
                              {info.category}
                            </p>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </div>
        </ReportSection>
      )}

      {/* ── [06] Shopping list & checkpoints ─────────────────────────── */}
      {(plan.shoppingList.length > 0 || plan.checkpoints.length > 0) && (
        <ReportSection
          num={shoppingNum}
          titleA="Shopping list"
          titleB="& checkpoints"
          id="shopping"
          blurb="Examples, not endorsements — no affiliate links, ever. Any equivalent with the same active or spec works."
          lockedContent={locked}
          lockNote="Your shopping list"
          collapsible={!locked}
          defaultOpen={false}
          collapsedHint={
            plan.shoppingList.length > 0
              ? `${plan.shoppingList.length} product ${
                  plan.shoppingList.length === 1 ? "category" : "categories"
                } to buy, with price bands and re-photo checkpoints. `
              : "Your re-photo checkpoints. "
          }
        >
          <div className="grid divide-y divide-line lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:divide-x lg:divide-y-0">
            {plan.shoppingList.length > 0 && (
              <div>
                <p className="border-b border-line px-6 py-4 font-mono text-[10px] uppercase tracking-label text-ink-soft sm:px-8">
                  What to buy /
                </p>
                <ul className="divide-y divide-line">
                  {plan.shoppingList.map((item) => {
                    const info = item.suggestionId ? byId.get(item.suggestionId) : undefined;
                    return (
                      <li
                        key={item.item}
                        className="grid gap-1 px-6 py-4 sm:grid-cols-[1fr_auto] sm:items-baseline sm:gap-4 sm:px-8"
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
              <div className="px-6 py-8 sm:px-8">
                <p className="font-mono text-[10px] uppercase tracking-label text-ink-soft">
                  Checkpoints /
                </p>
                <p className="mt-3 max-w-sm text-sm leading-relaxed text-ink-soft">
                  Re-photo in the same spot and light as your originals —
                  consistency is what makes progress visible.
                </p>
                <ol className="mt-6 space-y-5">
                  {plan.checkpoints.map((cp) => (
                    <li key={cp.week} className="flex items-baseline gap-6">
                      <span className="w-10 shrink-0 font-mono text-xs text-pine">
                        [w{cp.week}]
                      </span>
                      <p className="text-sm leading-relaxed text-ink">{cp.lookFor}</p>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        </ReportSection>
      )}
    </>
  );
}

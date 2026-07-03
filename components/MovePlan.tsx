"use client";

import { useMemo, useState } from "react";
import type { Advice, Plan, RoutineSlot } from "@/lib/types";
import type { FlatSuggestion } from "@/lib/plan";
import { flattenAdvice } from "@/lib/plan";
import { CATEGORY_META } from "@/lib/categories";
import { isQuickWin } from "@/lib/badges";
import { useProgress } from "./ProgressProvider";

/**
 * The "Your plan" tab — move-centric. Instead of showing the same ~13 moves
 * three times (routine by time, roadmap by phase, protocol by category), each
 * move lives once as a checkable card tagged with its facets, and the reader
 * gets a simple default plus depth on demand:
 *   • This week  — the phase-1 moves, few, each expands to why/how/what-to-use.
 *   • Daily rhythm — the same moves as an AM/PM/weekly sequence (a view, not a
 *     second to-do list).
 *   • Coming up  — later phases, collapsed; check them off as they become habit.
 * The full browse-everything reference + the impact map live in the Analysis tab.
 */

const SLOT_META: Record<RoutineSlot, { title: string; sub: string; icon: string }> = {
  am: { title: "Morning", sub: "Every day", icon: "☀" },
  pm: { title: "Evening", sub: "Every night", icon: "☾" },
  weekly: { title: "Weekly", sub: "A few times a week", icon: "↻" },
};

const COST_GLYPH: Record<string, string> = { low: "$", medium: "$$", high: "$$$" };

export default function MovePlan({
  plan,
  advice,
}: {
  plan: Plan;
  advice: Advice;
  /** Kept for signature parity with PlanBoard (calendar export etc.). */
  personId?: string;
}) {
  const [view, setView] = useState<"week" | "rhythm">("week");
  const { isDone, toggle } = useProgress();

  const byId = useMemo(() => {
    const m = new Map<string, FlatSuggestion>();
    for (const f of flattenAdvice(advice)) m.set(f.id, f);
    return m;
  }, [advice]);

  const phases = (plan.phases ?? [])
    .filter((p) => p.suggestionIds.length > 0)
    .sort((a, b) => a.number - b.number);
  const phase1 = phases.find((p) => p.number === 1) ?? phases[0];
  const laterPhases = phases.filter((p) => p !== phase1);

  const movesFor = (ids: string[]) =>
    ids.map((id) => byId.get(id)).filter((f): f is FlatSuggestion => Boolean(f));

  const thisWeek = phase1 ? movesFor(phase1.suggestionIds) : [];
  const weekDone = thisWeek.filter((m) => isDone(m.id)).length;

  const routineBySlot = (slot: RoutineSlot) =>
    (plan.routine ?? []).filter((r) => r.slot === slot);
  const hasRoutine = (plan.routine ?? []).length > 0;

  const hasShopping =
    (plan.shoppingList ?? []).length > 0 || (plan.checkpoints ?? []).length > 0;

  return (
    <section className="mx-auto max-w-[1300px] px-5 py-9 sm:px-10 sm:py-12">
      {/* View toggle + this-week progress */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div
          role="tablist"
          aria-label="Plan view"
          className="inline-flex rounded-full border border-line bg-surface p-1 text-sm"
        >
          <button
            type="button"
            role="tab"
            aria-selected={view === "week"}
            onClick={() => setView("week")}
            className={`rounded-full px-4 py-1.5 transition-colors ${
              view === "week" ? "bg-pine text-paper" : "text-ink-soft hover:text-ink"
            }`}
          >
            This week
          </button>
          {hasRoutine && (
            <button
              type="button"
              role="tab"
              aria-selected={view === "rhythm"}
              onClick={() => setView("rhythm")}
              className={`rounded-full px-4 py-1.5 transition-colors ${
                view === "rhythm" ? "bg-pine text-paper" : "text-ink-soft hover:text-ink"
              }`}
            >
              Daily rhythm
            </button>
          )}
        </div>

        {view === "week" && thisWeek.length > 0 && (
          <div className="min-w-[160px]">
            <div className="flex items-baseline justify-between font-mono text-[10px] uppercase tracking-label text-ink-soft">
              <span>This week</span>
              <span>
                {weekDone}/{thisWeek.length} done
              </span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-line">
              <div
                className="h-full rounded-full bg-pine transition-all"
                style={{ width: `${(weekDone / thisWeek.length) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* ── THIS WEEK ─────────────────────────────────────────────────── */}
      {view === "week" && (
        <div className="mt-8">
          {phase1 && (
            <div className="flex items-baseline gap-3">
              <h3 className="font-display text-2xl text-ink sm:text-3xl">
                {phase1.title || "Start here"}
              </h3>
              <span className="font-mono text-[10px] uppercase tracking-label text-ink-soft">
                {phase1.window}
              </span>
            </div>
          )}
          {phase1?.focus && (
            <p className="mt-2 max-w-prose text-sm leading-relaxed text-ink-soft">
              {phase1.focus}
            </p>
          )}

          <ol className="mt-6 space-y-2.5">
            {thisWeek.map((m) => (
              <MoveCard key={m.id} flat={m} done={isDone(m.id)} onToggle={toggle} />
            ))}
          </ol>

          {/* Coming up — later phases, collapsed. */}
          {laterPhases.length > 0 && (
            <div className="mt-10">
              <p className="font-mono text-[10px] uppercase tracking-label text-ink-soft">
                Then, as these become habit /
              </p>
              <div className="mt-4 overflow-hidden rounded-2xl border border-line">
                {laterPhases.map((p) => {
                  const moves = movesFor(p.suggestionIds);
                  const done = moves.filter((m) => isDone(m.id)).length;
                  return (
                    <details key={p.number} className="group border-b border-line last:border-b-0">
                      <summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-4 hover:bg-[#FCFCFD] focus-visible:outline focus-visible:outline-2 focus-visible:outline-pine">
                        <span className="font-medium text-[15px] text-ink">
                          {p.title}
                        </span>
                        <span className="font-mono text-[10px] uppercase tracking-label text-ink-soft">
                          {p.window}
                        </span>
                        <span className="ml-auto font-mono text-[11px] text-ink-soft">
                          {done}/{moves.length}
                        </span>
                        <span
                          aria-hidden
                          className="text-ink-soft transition-transform group-open:rotate-180"
                        >
                          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                            <path d="m6 9 6 6 6-6" />
                          </svg>
                        </span>
                      </summary>
                      <ul className="divide-y divide-line border-t border-line">
                        {moves.map((m) => (
                          <li key={m.id} className="flex items-center gap-3 px-5 py-3">
                            <CheckButton done={isDone(m.id)} onClick={() => toggle(m.id)} title={m.suggestion.title} />
                            <div className="min-w-0 flex-1">
                              <p className={`text-sm ${isDone(m.id) ? "text-ink-soft line-through decoration-line" : "text-ink"}`}>
                                {m.suggestion.title}
                              </p>
                            </div>
                            <span className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-label text-ink-soft">
                              <i
                                className="h-2 w-2 rounded-full"
                                style={{ backgroundColor: CATEGORY_META[m.category].color }}
                              />
                              {CATEGORY_META[m.category].label}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </details>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── DAILY RHYTHM ──────────────────────────────────────────────── */}
      {view === "rhythm" && hasRoutine && (
        <div className="mt-8">
          <p className="max-w-prose text-sm leading-relaxed text-ink-soft">
            The same moves as a daily sequence — the order to apply things.
            Introduce one new product at a time; give each two weeks before the
            next.
          </p>
          <div className="mt-6 grid divide-y divide-line rounded-2xl border border-line md:grid-flow-col md:auto-cols-fr md:divide-x md:divide-y-0">
            {(Object.keys(SLOT_META) as RoutineSlot[]).map((slot) => {
              const steps = routineBySlot(slot);
              if (steps.length === 0) return null;
              const meta = SLOT_META[slot];
              return (
                <div key={slot} className="px-6 py-7">
                  <p className="font-mono text-[10px] uppercase tracking-label text-ink-soft">
                    {meta.sub} /
                  </p>
                  <h3 className="mt-2 font-display text-xl text-ink">
                    <span aria-hidden className="mr-2 text-pine">
                      {meta.icon}
                    </span>
                    {meta.title}
                  </h3>
                  <ol className="mt-4 space-y-2.5">
                    {steps.map((step, i) => (
                      <li key={i} className="flex items-baseline gap-3 text-sm leading-relaxed text-ink">
                        <span className="w-4 shrink-0 font-mono text-xs text-pine">
                          {i + 1}
                        </span>
                        <span>{step.step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── SHOPPING + CHECKPOINTS — collapsed reference ──────────────── */}
      {hasShopping && (
        <details className="group mt-10 overflow-hidden rounded-2xl border border-line">
          <summary className="flex cursor-pointer list-none items-center gap-3 px-6 py-5 hover:bg-[#FCFCFD] focus-visible:outline focus-visible:outline-2 focus-visible:outline-pine">
            <div>
              <p className="font-display text-lg text-ink">Shopping list &amp; checkpoints</p>
              <p className="mt-0.5 text-sm text-ink-soft">
                {(plan.shoppingList ?? []).length > 0
                  ? `${plan.shoppingList.length} product ${
                      plan.shoppingList.length === 1 ? "category" : "categories"
                    } to buy, with price bands`
                  : "Your re-photo checkpoints"}
                . Examples, not endorsements — no affiliate links, ever.
              </p>
            </div>
            <span
              aria-hidden
              className="ml-auto shrink-0 text-ink-soft transition-transform group-open:rotate-180"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="m6 9 6 6 6-6" />
              </svg>
            </span>
          </summary>

          <div className="grid divide-y divide-line border-t border-line lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:divide-x lg:divide-y-0">
            {(plan.shoppingList ?? []).length > 0 && (
              <ul className="divide-y divide-line">
                {plan.shoppingList.map((item) => (
                  <li
                    key={item.item}
                    className="grid gap-1 px-6 py-4 sm:grid-cols-[1fr_auto] sm:items-baseline sm:gap-4"
                  >
                    <div className="min-w-0">
                      <p className="text-[15px] text-ink">{item.item}</p>
                      <p className="mt-0.5 text-xs text-ink-soft">e.g. {item.examples}</p>
                    </div>
                    <span className="shrink-0 font-mono text-xs text-ink-soft">
                      {item.approxCost}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {(plan.checkpoints ?? []).length > 0 && (
              <div className="px-6 py-6">
                <p className="font-mono text-[10px] uppercase tracking-label text-ink-soft">
                  Checkpoints /
                </p>
                <ol className="mt-4 space-y-4">
                  {plan.checkpoints.map((cp) => (
                    <li key={cp.week} className="flex items-baseline gap-4">
                      <span className="w-9 shrink-0 font-mono text-xs text-pine">
                        w{cp.week}
                      </span>
                      <p className="text-sm leading-relaxed text-ink">{cp.lookFor}</p>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        </details>
      )}

      <p className="mt-8 text-xs leading-relaxed text-ink-soft">
        Every move&apos;s full detail — and the impact-vs-effort map — lives in the
        Analysis tab.
      </p>
    </section>
  );
}

/** Small check-off button shared by the this-week cards and the coming-up rows. */
function CheckButton({
  done,
  onClick,
  title,
}: {
  done: boolean;
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={done}
      aria-label={`Mark "${title}" ${done ? "not done" : "done"}`}
      onClick={onClick}
      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border text-xs transition-colors ${
        done
          ? "border-pine bg-pine text-paper"
          : "border-line bg-paper text-transparent hover:border-pine/50"
      }`}
    >
      ✓
    </button>
  );
}

/** A this-week move: check it off, or tap the body to open the full detail. */
function MoveCard({
  flat,
  done,
  onToggle,
}: {
  flat: FlatSuggestion;
  done: boolean;
  onToggle: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const s = flat.suggestion;
  const slot = s.routineSlot ? SLOT_META[s.routineSlot].title : null;
  const quick = isQuickWin(s);

  return (
    <li className="overflow-hidden rounded-xl border border-line bg-surface transition-colors hover:border-pine/30">
      <div className="flex items-start gap-3 px-4 py-3.5">
        <CheckButton done={done} onClick={() => onToggle(flat.id)} title={s.title} />
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="flex min-w-0 flex-1 items-start justify-between gap-3 text-left"
        >
          <span className="min-w-0">
            <span
              className={`block text-[15px] font-medium leading-snug ${
                done ? "text-ink-soft line-through decoration-line" : "text-ink"
              }`}
            >
              {s.title}
            </span>
            <span className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-label text-ink-soft">
                <i
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: CATEGORY_META[flat.category].color }}
                />
                {CATEGORY_META[flat.category].label}
              </span>
              {slot && (
                <span className="font-mono text-[10px] uppercase tracking-label text-ink-soft">
                  {slot}
                </span>
              )}
              <span className="font-mono text-[10px] uppercase tracking-label text-ink-soft">
                {COST_GLYPH[s.cost] ?? "$"}
              </span>
              {quick && (
                <span className="rounded-full bg-clay-soft px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.08em] text-clay">
                  Quick win
                </span>
              )}
            </span>
          </span>
          <span
            aria-hidden
            className={`mt-1 shrink-0 text-ink-soft transition-transform ${
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
        <div className="space-y-3 border-t border-line px-4 pb-4 pt-3 pl-[52px] text-sm leading-relaxed text-ink-soft">
          <p>{s.detail}</p>
          {s.why && (
            <p className="rounded-xl bg-sage/50 px-4 py-3 text-pine-deep">
              <span className="font-medium">Why you: </span>
              {s.why}
            </p>
          )}
          {s.how && s.how.length > 0 && (
            <div>
              <p className="font-mono text-[10px] uppercase tracking-label text-ink-soft">
                How to do it
              </p>
              <ol className="mt-2 space-y-1.5">
                {s.how.map((step, i) => (
                  <li key={i} className="flex items-baseline gap-2.5 text-ink">
                    <span className="w-5 shrink-0 font-mono text-[11px] text-pine">
                      {i + 1}.
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
          {s.products && s.products.length > 0 && (
            <div>
              <p className="font-mono text-[10px] uppercase tracking-label text-ink-soft">
                What to use
              </p>
              <ul className="mt-2 flex flex-wrap gap-2">
                {s.products.map((p) => (
                  <li
                    key={p}
                    className="rounded-full border border-line bg-paper px-3 py-1 text-xs text-ink-soft"
                  >
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {(s.frequency || s.timeline || s.evidence) && (
            <p className="flex flex-wrap gap-x-4 gap-y-1 border-t border-line pt-3 font-mono text-[10px] uppercase tracking-label text-ink-soft">
              {s.frequency && <span>⟳ {s.frequency}</span>}
              {s.timeline && <span>Results: {s.timeline}</span>}
              {s.evidence && (
                <span className={s.evidence === "strong" ? "text-pine" : undefined}>
                  Evidence: {s.evidence}
                </span>
              )}
            </p>
          )}
        </div>
      )}
    </li>
  );
}

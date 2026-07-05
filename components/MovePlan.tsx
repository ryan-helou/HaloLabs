"use client";

import { useMemo, useState } from "react";
import type { Advice, Plan, RoutineSlot, Suggestion } from "@/lib/types";
import type { FlatSuggestion } from "@/lib/plan";
import { flattenAdvice } from "@/lib/plan";
import { CATEGORY_META } from "@/lib/categories";
import { useProgress } from "./ProgressProvider";

/**
 * The "Your plan" tab — a hand-held sequence, not a report. It walks the reader
 * through the plan the way a coach would: buy a few things, start this week,
 * keep a simple daily rhythm, then build from there. Four numbered steps,
 * because the order is real (you buy before you start, you start before it
 * becomes daily). Every surface stays simple; the full how-to for any move is
 * one tap away.
 *
 *   ① First, buy these      — the shopping list up front, with prices.
 *   ② This week, start these — the phase-1 moves, checkable, each expands.
 *   ③ Every day             — the AM/PM/weekly rhythm as a read sequence.
 *   ④ Then, as these stick   — later phases, collapsed until you're ready.
 */

const SLOT_META: Record<RoutineSlot, { title: string; cap: string; glyph: string }> = {
  am: { title: "Morning", cap: "Every morning", glyph: "☀" },
  pm: { title: "Evening", cap: "Every night", glyph: "☾" },
  weekly: { title: "Weekly", cap: "A few times a week", glyph: "↻" },
};

/** First sentence of a string, trimmed to a friendly length for a one-liner. */
function oneLiner(text?: string, max = 96): string {
  if (!text) return "";
  const first = text.split(/(?<=[.!?])\s/)[0].trim();
  if (first.length <= max) return first;
  const cut = first.slice(0, max);
  return cut.slice(0, cut.lastIndexOf(" ")).trim() + "…";
}

export default function MovePlan({
  plan,
  advice,
}: {
  plan: Plan;
  advice: Advice;
  /** Kept for signature parity (calendar export etc.). */
  personId?: string;
}) {
  const { isDone, toggle } = useProgress();

  const byId = useMemo(() => {
    const m = new Map<string, FlatSuggestion>();
    for (const f of flattenAdvice(advice)) m.set(f.id, f);
    return m;
  }, [advice]);
  const titleById = (id?: string) => (id ? byId.get(id)?.suggestion.title : undefined);

  const phases = (plan.phases ?? [])
    .filter((p) => p.suggestionIds.length > 0)
    .sort((a, b) => a.number - b.number);
  const phase1 = phases.find((p) => p.number === 1) ?? phases[0];
  const laterPhases = phases.filter((p) => p !== phase1);

  const movesFor = (ids: string[]) =>
    ids.map((id) => byId.get(id)).filter((f): f is FlatSuggestion => Boolean(f));

  const thisWeek = phase1 ? movesFor(phase1.suggestionIds) : [];
  const weekDone = thisWeek.filter((m) => isDone(m.id)).length;

  const shopping = plan.shoppingList ?? [];
  const routineBySlot = (slot: RoutineSlot) =>
    (plan.routine ?? []).filter((r) => r.slot === slot);
  const hasRoutine = (plan.routine ?? []).length > 0;

  return (
    <section className="mx-auto max-w-[760px] px-5 pb-16 pt-9 sm:px-6">
      {/* Orienting line — the coach's opening. */}
      <div className="max-w-[52ch]">
        <h2 className="font-display text-2xl font-medium tracking-tight text-ink sm:text-[28px]">
          Here&apos;s exactly what to do.
        </h2>
        <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">
          Four steps, in order. Buy a few things, start this week, keep a simple
          daily rhythm, then build from there. Tap any move for the full how-to.
        </p>
      </div>

      {/* ── ① BUY ─────────────────────────────────────────────────────── */}
      {shopping.length > 0 && (
        <Step
          num={1}
          title="First, buy these"
          sub="Everything to run the plan — roughly $25–75 a month. Examples, never affiliate links. Grab the non-optional ones first."
        >
          <BuyList shopping={shopping} titleById={titleById} />
        </Step>
      )}

      {/* ── ② THIS WEEK ───────────────────────────────────────────────── */}
      {thisWeek.length > 0 && (
        <Step
          num={2}
          title={phase1?.title?.trim() ? phase1.title : "This week, start these"}
          sub={phase1?.focus || "Free-to-cheap changes that show up in the mirror this week."}
          meta={`${weekDone} of ${thisWeek.length}`}
        >
          <div className="grid gap-2.5">
            {thisWeek.map((m) => (
              <MoveCard key={m.id} flat={m} done={isDone(m.id)} onToggle={toggle} />
            ))}
          </div>
        </Step>
      )}

      {/* ── ③ EVERY DAY ───────────────────────────────────────────────── */}
      {hasRoutine && (
        <Step
          num={3}
          title="Every day, this is the rhythm"
          sub="The order to apply things once you have the products. Introduce one new product at a time — give each two weeks before the next."
        >
          <div className="grid gap-3 sm:grid-cols-3">
            {(Object.keys(SLOT_META) as RoutineSlot[]).map((slot) => {
              const steps = routineBySlot(slot);
              if (steps.length === 0) return null;
              const meta = SLOT_META[slot];
              return (
                <div key={slot} className="rounded-2xl border border-line bg-surface p-5">
                  <p className="text-xs font-medium text-ink-soft">{meta.cap}</p>
                  <h4 className="mt-1 flex items-center gap-2 font-display text-lg font-medium text-ink">
                    <span aria-hidden className="text-pine">{meta.glyph}</span>
                    {meta.title}
                  </h4>
                  <ol className="mt-4 grid gap-2.5">
                    {steps.map((step, i) => (
                      <li key={i} className="flex gap-2.5 text-[13.5px] leading-snug text-ink">
                        <span className="w-3.5 shrink-0 font-medium text-pine tabular-nums">
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
        </Step>
      )}

      {/* ── ④ LATER ───────────────────────────────────────────────────── */}
      {laterPhases.length > 0 && (
        <Step
          num={4}
          title="Then, as these stick"
          sub="The bigger levers — start these once this week's moves feel automatic. No rush; the stack is what works, not the speed."
        >
          <div className="overflow-hidden rounded-2xl border border-line">
            {laterPhases.map((p) => {
              const moves = movesFor(p.suggestionIds);
              const done = moves.filter((m) => isDone(m.id)).length;
              return (
                <details
                  key={p.number}
                  open={p.number === 2}
                  className="group border-b border-line last:border-b-0"
                >
                  <summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-4 hover:bg-[#FCFCFD]">
                    <span className="font-medium text-[15px] text-ink">{p.title}</span>
                    <span className="text-[13px] text-ink-soft">{p.window}</span>
                    <span className="ml-auto text-[13px] tabular-nums text-ink-soft">
                      {done}/{moves.length}
                    </span>
                    <Chevron className="group-open:rotate-180" />
                  </summary>
                  <ul className="border-t border-line">
                    {moves.map((m) => (
                      <li key={m.id} className="flex items-center gap-3 border-t border-line px-5 py-3 first:border-t-0">
                        <Check done={isDone(m.id)} onClick={() => toggle(m.id)} label={m.suggestion.title} />
                        <span
                          className={`flex-1 text-sm ${
                            isDone(m.id) ? "text-ink-soft line-through decoration-line" : "text-ink"
                          }`}
                        >
                          {m.suggestion.title}
                        </span>
                        <span className="flex items-center gap-1.5 text-[11px] text-ink-soft">
                          <i className="h-2 w-2 rounded-full" style={{ backgroundColor: CATEGORY_META[m.category].color }} />
                          {CATEGORY_META[m.category].label}
                        </span>
                      </li>
                    ))}
                  </ul>
                </details>
              );
            })}
          </div>
        </Step>
      )}

      {/* Milestones — quiet, collapsed. What to look for as you go. */}
      {(plan.checkpoints ?? []).length > 0 && (
        <details className="group mt-8 overflow-hidden rounded-2xl border border-line bg-surface">
          <summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-4">
            <span className="font-medium text-[15px] text-ink">What to look for along the way</span>
            <span className="ml-auto text-[13px] text-ink-soft">{plan.checkpoints.length} checkpoints</span>
            <Chevron className="group-open:rotate-180" />
          </summary>
          <ol className="border-t border-line">
            {plan.checkpoints.map((cp) => (
              <li key={cp.week} className="flex gap-4 border-t border-line px-5 py-4 first:border-t-0">
                <span className="w-10 shrink-0 font-medium text-pine">wk {cp.week}</span>
                <p className="text-sm leading-relaxed text-ink-soft">{cp.lookFor}</p>
              </li>
            ))}
          </ol>
        </details>
      )}
    </section>
  );
}

/* ── One numbered step block ──────────────────────────────────────────── */
function Step({
  num,
  title,
  sub,
  meta,
  children,
}: {
  num: number;
  title: string;
  sub?: string;
  meta?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-11 border-t border-line pt-9 first-of-type:mt-10">
      <div className="flex items-center gap-4">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sage font-display text-[15px] font-semibold text-pine">
          {num}
        </span>
        <h3 className="font-display text-xl font-medium tracking-tight text-ink">{title}</h3>
        {meta && <span className="ml-auto text-[13px] tabular-nums text-ink-soft">{meta}</span>}
      </div>
      {sub && <p className="ml-12 mt-1.5 max-w-[52ch] text-[14.5px] leading-relaxed text-ink-soft">{sub}</p>}
      <div className="ml-0 mt-6 sm:ml-12">{children}</div>
    </div>
  );
}

/* ── Step ① buy list ──────────────────────────────────────────────────── */
function BuyList({
  shopping,
  titleById,
}: {
  shopping: Plan["shoppingList"];
  titleById: (id?: string) => string | undefined;
}) {
  const [bought, setBought] = useState<Record<string, boolean>>({});
  return (
    <div className="grid gap-2.5">
      {shopping.map((item) => {
        const optional = /^optional:?\s*/i.test(item.item);
        const name = item.item.replace(/^optional:?\s*/i, "");
        const forMove = titleById(item.suggestionId);
        const on = bought[item.item] ?? false;
        return (
          <div
            key={item.item}
            className={`flex items-start gap-3.5 rounded-xl border bg-surface px-4 py-3.5 transition-colors ${
              on ? "border-line" : "border-line hover:border-[#d3d8dc]"
            }`}
          >
            <Check done={on} onClick={() => setBought((b) => ({ ...b, [item.item]: !on }))} label={name} />
            <div className="min-w-0 flex-1">
              <p className={`text-[15px] font-medium ${on ? "text-ink-soft line-through decoration-line" : "text-ink"}`}>
                {name}
                {optional && (
                  <span className="ml-2 rounded-full border border-line px-2 py-0.5 align-middle text-[11px] font-normal text-ink-soft">
                    optional
                  </span>
                )}
              </p>
              <p className="mt-0.5 text-[13px] leading-snug text-ink-soft">
                {forMove ? <>For <span className="text-ink">{forMove.toLowerCase()}</span> · </> : null}
                e.g. {item.examples}
              </p>
            </div>
            <span className="shrink-0 self-center rounded-full bg-clay-soft px-2.5 py-1 text-[12.5px] font-semibold tabular-nums text-clay">
              {item.approxCost}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ── Step ② move card (expandable) ────────────────────────────────────── */
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
  const why1 = oneLiner(s.why || s.detail);

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-surface transition-colors hover:border-[#d3d8dc]">
      <div className="flex items-start gap-3.5 px-4 py-3.5">
        <Check done={done} onClick={() => onToggle(flat.id)} label={s.title} />
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="flex min-w-0 flex-1 items-start justify-between gap-3 text-left"
        >
          <span className="min-w-0">
            <span className={`block text-[15px] font-medium leading-snug ${done ? "text-ink-soft line-through decoration-line" : "text-ink"}`}>
              {s.title}
            </span>
            {why1 && <span className="mt-1 block text-[13.5px] leading-snug text-ink-soft">{why1}</span>}
          </span>
          <Chevron className={`mt-0.5 ${open ? "rotate-180" : ""}`} />
        </button>
      </div>

      {open && (
        <div className="border-t border-line px-4 pb-5 pt-4 sm:pl-[54px]">
          <p className="text-[14.5px] leading-relaxed text-ink-soft">{s.detail}</p>

          {s.why && (
            <p className="mt-3.5 rounded-xl bg-sage px-4 py-3 text-[14px] leading-relaxed text-pine-deep">
              <span className="font-semibold">Why you: </span>
              {s.why}
            </p>
          )}

          {s.how && s.how.length > 0 && (
            <div className="mt-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-soft">How to do it</p>
              <ol className="mt-2.5 grid gap-2">
                {s.how.map((step, i) => (
                  <li key={i} className="flex gap-3 text-[14px] leading-relaxed text-ink">
                    <span className="w-4 shrink-0 font-semibold text-pine tabular-nums">{i + 1}</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {s.products && s.products.length > 0 && (
            <div className="mt-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-soft">What to use</p>
              <ul className="mt-2.5 flex flex-wrap gap-2">
                {s.products.map((p) => (
                  <li key={p} className="rounded-full border border-line bg-paper px-3 py-1.5 text-[12.5px] text-ink">
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {(s.frequency || s.timeline) && (
            <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1.5 border-t border-line pt-3.5 text-[13px] text-ink-soft">
              {s.frequency && <span><span className="font-semibold text-ink">How often</span> · {s.frequency}</span>}
              {s.timeline && <span><span className="font-semibold text-ink">Results</span> · {s.timeline}</span>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── shared bits ──────────────────────────────────────────────────────── */
function Check({ done, onClick, label }: { done: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={done}
      aria-label={`Mark "${label}" ${done ? "not done" : "done"}`}
      onClick={onClick}
      className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-[7px] border transition-colors ${
        done ? "border-pine bg-pine text-paper" : "border-line bg-paper text-transparent hover:border-pine/50"
      }`}
    >
      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 6 9 17l-5-5" />
      </svg>
    </button>
  );
}

function Chevron({ className = "" }: { className?: string }) {
  return (
    <span aria-hidden className={`shrink-0 text-ink-soft transition-transform ${className}`}>
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="m6 9 6 6 6-6" />
      </svg>
    </span>
  );
}

import type { Level, Person } from "./types";
import { ADVICE_CATEGORIES } from "./types";
import { CATEGORY_META } from "./categories";
import { flattenAdvice, type FlatSuggestion } from "./plan";
import { isQuickWin } from "./badges";

const IMPACT_WEIGHT: Record<Level, number> = { high: 3, medium: 2, low: 1 };

/**
 * The 2–3 highest-leverage moves to start with — the "this week" digest.
 * Drawn from plan phase 1 when present, else quick wins, else top impact.
 */
export function startingMoves(person: Person, max = 3): FlatSuggestion[] {
  const flat = flattenAdvice(person.advice);
  if (flat.length === 0) return [];
  const byId = new Map(flat.map((f) => [f.id, f]));

  const phase1 = person.plan?.phases?.find((p) => p.number === 1);
  let picks = (phase1?.suggestionIds ?? [])
    .map((id) => byId.get(id))
    .filter((f): f is FlatSuggestion => Boolean(f));

  if (picks.length === 0) picks = flat.filter((f) => isQuickWin(f.suggestion));
  if (picks.length === 0)
    picks = [...flat].sort(
      (a, b) =>
        IMPACT_WEIGHT[b.suggestion.impact] - IMPACT_WEIGHT[a.suggestion.impact]
    );

  return picks.slice(0, max);
}

export interface FocusArea {
  label: string;
  color: string;
  count: number;
  /** 0..1 share of plan emphasis (impact-weighted) — drives the meter fill. */
  fill: number;
}

/**
 * Where the plan concentrates — impact-weighted emphasis per category,
 * highest first. Describes the PLAN's focus, never a score of the person.
 */
export function focusAreas(person: Person): FocusArea[] {
  const raw = ADVICE_CATEGORIES.map((cat) => {
    const items = person.advice[cat] ?? [];
    const weight = items.reduce((n, s) => n + (IMPACT_WEIGHT[s.impact] ?? 0), 0);
    return { cat, weight, count: items.length };
  }).filter((r) => r.count > 0);

  const max = Math.max(1, ...raw.map((r) => r.weight));
  return raw
    .map((r) => ({
      label: CATEGORY_META[r.cat].label,
      color: CATEGORY_META[r.cat].color,
      count: r.count,
      fill: r.weight / max,
    }))
    .sort((a, b) => b.fill - a.fill);
}

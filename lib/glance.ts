import type { AdviceCategory, Level, Person } from "./types";
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
  cat: AdviceCategory;
  label: string;
  color: string;
  /** How many moves the plan spends here — a neutral count, never a score. */
  count: number;
  /** 0..1 share of the whole plan by move count — drives one composition bar. */
  share: number;
}

/**
 * What the plan is made of — the count of moves per category, largest first.
 * This describes the PLAN's composition (a neutral count), never a score or
 * ranking of the person or their features. Rendered as a single stacked bar,
 * so no per-feature "fill level" can read as a rating.
 */
export function focusAreas(person: Person): FocusArea[] {
  const raw = ADVICE_CATEGORIES.map((cat) => ({
    cat,
    count: (person.advice[cat] ?? []).length,
  })).filter((r) => r.count > 0);

  const total = raw.reduce((n, r) => n + r.count, 0) || 1;
  return raw
    .map((r) => ({
      cat: r.cat,
      label: CATEGORY_META[r.cat].label,
      color: CATEGORY_META[r.cat].color,
      count: r.count,
      share: r.count / total,
    }))
    .sort((a, b) => b.count - a.count);
}

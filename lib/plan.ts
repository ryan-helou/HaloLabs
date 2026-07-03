import type {
  Advice,
  AdviceCategory,
  Level,
  Person,
  Suggestion,
} from "./types";
import { ADVICE_CATEGORIES } from "./types";

/** A suggestion plus where it lives (category + index + resolved id). */
export interface FlatSuggestion {
  suggestion: Suggestion;
  category: AdviceCategory;
  index: number;
  /** Stable id: the suggestion's own id, else the legacy anchor slug. */
  id: string;
  /** DOM anchor used by the matrix / hash-jumps (legacy format kept). */
  anchor: string;
}

/** Legacy anchor for a suggestion (matches AdviceBoard's #sug-<cat>-<i>). */
export function anchorFor(category: AdviceCategory, index: number): string {
  return `sug-${category}-${index}`;
}

/** Resolve a suggestion's stable id (falls back to the legacy anchor). */
export function suggestionId(
  s: Suggestion,
  category: AdviceCategory,
  index: number
): string {
  return s.id ?? anchorFor(category, index);
}

/** Flatten advice into a single ordered list with resolved ids/anchors. */
export function flattenAdvice(advice: Advice): FlatSuggestion[] {
  const out: FlatSuggestion[] = [];
  for (const category of ADVICE_CATEGORIES) {
    (advice[category] ?? []).forEach((suggestion, index) => {
      out.push({
        suggestion,
        category,
        index,
        id: suggestionId(suggestion, category, index),
        anchor: anchorFor(category, index),
      });
    });
  }
  return out;
}

/** Look up a flat suggestion by its stable id. */
export function findSuggestion(
  advice: Advice,
  id: string
): FlatSuggestion | undefined {
  return flattenAdvice(advice).find((f) => f.id === id);
}

/**
 * Pick the single suggestion revealed for free on a locked plan.
 *
 * Deterministic so the free item never changes between renders:
 *   1. The suggestion the skill flagged with `freeReveal` (first one wins).
 *   2. Otherwise the best candidate — highest impact, then lowest effort,
 *      then lowest cost — with original order breaking any remaining tie.
 *
 * Returns undefined only when there is no advice at all.
 */
export function pickFreeReveal(advice: Advice): FlatSuggestion | undefined {
  const flat = flattenAdvice(advice);
  if (flat.length === 0) return undefined;

  const flagged = flat.find((f) => f.suggestion.freeReveal);
  if (flagged) return flagged;

  const rank: Record<Level, number> = { high: 2, medium: 1, low: 0 };
  // Impact dominates, then low effort, then low cost. Weights are spaced so a
  // higher tier never loses to accumulated lower-tier wins.
  const score = (s: Suggestion) =>
    rank[s.impact] * 100 + (2 - rank[s.effort]) * 10 + (2 - rank[s.cost]);

  // Stable sort keeps flat order (category, then index) on ties, so equal
  // candidates always resolve to the same one.
  return [...flat].sort(
    (a, b) => score(b.suggestion) - score(a.suggestion)
  )[0];
}

/** Does this person have a v2 plan worth rendering? */
export function hasPlan(person: Person): boolean {
  const p = person.plan;
  return Boolean(
    p && (p.phases?.length || p.routine?.length || p.summary?.trim())
  );
}

/**
 * Has the expensive PAID plan been generated (routine/roadmap), vs just the free
 * teaser (summary + strengths + a tagged move list)? Drives the "building your
 * full plan" state after purchase. See lib/analyze split-generation.
 */
export function hasFullPlan(person: Person): boolean {
  const p = person.plan;
  const phases = (p?.phases ?? []).filter((ph) => ph.suggestionIds.length > 0);
  return Boolean(phases.length > 0 || (p?.routine?.length ?? 0) > 0);
}

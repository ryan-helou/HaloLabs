import type {
  Advice,
  AdviceCategory,
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

/** Does this person have a v2 plan worth rendering? */
export function hasPlan(person: Person): boolean {
  const p = person.plan;
  return Boolean(
    p && (p.phases?.length || p.routine?.length || p.summary?.trim())
  );
}

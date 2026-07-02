import type { Level, Suggestion } from "./types";

export type BadgeKind = "impact" | "effort" | "cost";

/** How favorable a level reads for a given tag. */
export type Strength = "strong" | "soft" | "muted";

/**
 * - impact: high is best.
 * - effort / cost: low is best (scale reversed).
 */
export function strengthFor(kind: BadgeKind, level: Level): Strength {
  const rank: Record<Level, number> = { high: 2, medium: 1, low: 0 };
  const score = kind === "impact" ? rank[level] : 2 - rank[level];
  return score === 2 ? "strong" : score === 1 ? "soft" : "muted";
}

/**
 * A "quick win": clearly worth doing and easy to start — meaningful impact
 * with both low effort and low cost. Used to flag the easiest high-value moves.
 */
export function isQuickWin(s: Suggestion): boolean {
  return s.impact !== "low" && s.effort === "low" && s.cost === "low";
}

const IMPACT_RANK: Record<Level, number> = { high: 2, medium: 1, low: 0 };

/** Sort a copy of suggestions by impact, high → low (quick wins break ties). */
export function byImpact(list: Suggestion[]): Suggestion[] {
  return [...list].sort((a, b) => {
    const d = IMPACT_RANK[b.impact] - IMPACT_RANK[a.impact];
    if (d !== 0) return d;
    return Number(isQuickWin(b)) - Number(isQuickWin(a));
  });
}

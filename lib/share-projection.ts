import type { Person } from "./types";
import { flattenAdvice } from "./plan";
import { focusAreas } from "./glance";
import { isQuickWin } from "./badges";

/**
 * Pure builder for the public share projection — no DB, no I/O — so it can be
 * unit-tested for PII safety in isolation. lib/share.ts loads the record +
 * progress from the DB, then calls this. Every field here is a neutral scalar
 * count / label / delta; NOTHING derived from photos, names, onboarding, or the
 * written plan (why/how/observations) may appear. See the PII-leak guard test.
 */

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export interface ShareFocus {
  label: string;
  count: number;
  share: number;
  color: string;
}

export interface ShareProjection {
  kind: "plan" | "progress";
  totalMoves: number;
  quickWins: number;
  focus: ShareFocus[];
  phaseTitles: string[];
  progress?: { weekN: number; movesDone: number; total: number; checkins: number };
}

export interface ProgressInput {
  movesDone: number;
  checkinCount: number;
  latestCheckinTs: number | null;
  now?: number;
}

export function buildShareProjection(
  record: Person,
  kind: "plan" | "progress",
  progress?: ProgressInput
): ShareProjection {
  const flat = flattenAdvice(record.advice);
  const totalMoves = flat.length;
  const quickWins = flat.filter((f) => isQuickWin(f.suggestion)).length;
  const focus: ShareFocus[] = focusAreas(record).map((f) => ({
    label: f.label,
    count: f.count,
    share: f.share,
    color: f.color,
  }));
  // Phase titles are generic ("This week", "Weeks 2–12") by design — safe.
  const phaseTitles = (record.plan?.phases ?? []).map((p) => p.title).filter(Boolean);

  const projection: ShareProjection = { kind, totalMoves, quickWins, focus, phaseTitles };

  if (kind === "progress" && progress) {
    const now = progress.now ?? Date.now();
    const base = Date.parse(record.analyzedAt) || now;
    const latestTs = progress.latestCheckinTs ?? now;
    const weekN = Math.max(1, Math.round((latestTs - base) / WEEK_MS));
    projection.progress = {
      weekN,
      movesDone: progress.movesDone,
      total: totalMoves,
      checkins: progress.checkinCount,
    };
  }

  return projection;
}

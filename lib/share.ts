import { randomBytes } from "node:crypto";
import { prisma } from "./db";
import { flattenAdvice } from "./plan";
import { focusAreas } from "./glance";
import { isQuickWin } from "./badges";
import { loadCheckins } from "./checkins";
import type { Person } from "./types";

/**
 * Privacy-safe share projection. A shared link exposes ONLY neutral counts, the
 * plan's composition, and progress deltas — never a face, a name, the written
 * why/how, observations, or onboarding answers (STRATEGY §3: no scores, no PII
 * on a public URL). The share token is opaque and distinct from Person.id, so
 * the private /person/<id> page is never reachable from a share.
 *
 * `loadShareProjection` is the ONLY reader of a shareToken and it is an
 * allowlist: every field below is a scalar count/label/delta. If you ever need
 * to add a field, it must pass the same bar.
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

/** Resolve a share token to its PII-stripped projection, or null. */
export async function loadShareProjection(token: string): Promise<ShareProjection | null> {
  if (!token) return null;
  const person = await prisma.person.findUnique({ where: { shareToken: token } });
  if (!person || !person.shareToken) return null;

  const latest = await prisma.analysisResult.findFirst({
    where: { personId: person.id },
    orderBy: { createdAt: "desc" },
  });
  if (!latest) return null;
  const record = latest.data as unknown as Person;

  const flat = flattenAdvice(record.advice);
  const totalMoves = flat.length;
  const quickWins = flat.filter((f) => isQuickWin(f.suggestion)).length;
  const focus: ShareFocus[] = focusAreas(record).map((f) => ({
    label: f.label,
    count: f.count,
    share: f.share,
    color: f.color,
  }));
  const phaseTitles = (record.plan?.phases ?? []).map((p) => p.title).filter(Boolean);

  const kind = person.shareKind === "progress" ? "progress" : "plan";

  const projection: ShareProjection = { kind, totalMoves, quickWins, focus, phaseTitles };

  if (kind === "progress") {
    const [doneCount, checkins] = await Promise.all([
      prisma.progress.count({
        where: { personId: person.id, userId: person.userId, done: true },
      }),
      loadCheckins(person.id),
    ]);
    const base = Date.parse(record.analyzedAt) || Date.now();
    const latestTs = checkins[0]?.ts ?? Date.now();
    const weekN = Math.max(1, Math.round((latestTs - base) / WEEK_MS));
    projection.progress = {
      weekN,
      movesDone: doneCount,
      total: totalMoves,
      checkins: checkins.length,
    };
  }

  return projection;
}

/** Owner check + how many check-ins a person has (gates progress sharing). */
export async function checkinCountForOwner(userId: string, personId: string): Promise<number | null> {
  const person = await prisma.person.findFirst({ where: { id: personId, userId } });
  if (!person) return null;
  const checkins = await loadCheckins(personId);
  return checkins.length;
}

/**
 * Mint (or reuse) a share token for a person the caller owns, and set which card
 * it shows. Idempotent — reuses the existing token if there is one, so the URL a
 * user already posted keeps working when they switch plan↔progress. Returns the
 * token, or null if the caller doesn't own the person.
 */
export async function mintShareToken(
  userId: string,
  personId: string,
  kind: "plan" | "progress"
): Promise<string | null> {
  const person = await prisma.person.findFirst({ where: { id: personId, userId } });
  if (!person) return null;
  const token = person.shareToken ?? randomBytes(18).toString("base64url");
  await prisma.person.update({
    where: { id: person.id },
    data: { shareToken: token, shareKind: kind },
  });
  return token;
}

/** Revoke a person's share link (delete = delete). No-op if not owned. */
export async function revokeShareToken(userId: string, personId: string): Promise<boolean> {
  const person = await prisma.person.findFirst({ where: { id: personId, userId } });
  if (!person) return false;
  await prisma.person.update({
    where: { id: person.id },
    data: { shareToken: null, shareKind: null },
  });
  return true;
}

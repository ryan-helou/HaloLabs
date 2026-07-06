import { randomBytes } from "node:crypto";
import { prisma } from "./db";
import { loadCheckins } from "./checkins";
import { buildShareProjection, type ShareProjection } from "./share-projection";
import type { Person } from "./types";

export type { ShareProjection, ShareFocus } from "./share-projection";

/**
 * Privacy-safe share links. A shared link exposes ONLY neutral counts, the
 * plan's composition, and progress deltas — never a face, a name, the written
 * why/how, observations, or onboarding answers (STRATEGY §3: no scores, no PII
 * on a public URL). The share token is opaque and distinct from Person.id, so
 * the private /person/<id> page is never reachable from a share.
 *
 * The projection shape + PII allowlist live in lib/share-projection (pure, unit-
 * tested). This file only loads the record + progress from the DB and hands them
 * to buildShareProjection.
 */

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

  const kind = person.shareKind === "progress" ? "progress" : "plan";
  if (kind !== "progress") return buildShareProjection(record, "plan");

  const [doneCount, checkins] = await Promise.all([
    prisma.progress.count({
      where: { personId: person.id, userId: person.userId, done: true },
    }),
    loadCheckins(person.id),
  ]);
  return buildShareProjection(record, "progress", {
    movesDone: doneCount,
    checkinCount: checkins.length,
    latestCheckinTs: checkins[0]?.ts ?? null,
  });
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

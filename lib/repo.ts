import { prisma } from "./db";
import type { Person } from "./types";

/**
 * User-scoped reads of the plan data from Postgres. Each Person's latest
 * AnalysisResult holds the full viewer payload (same shape as results.json's
 * person object), so mapping back to the `Person` type the viewer renders is a
 * straight cast — no reshaping.
 *
 * This is the "port the viewer onto Postgres, keyed by user" half of Phase 2.
 * Photos are still referenced by their existing relative paths inside the
 * payload and served by /api/photo; moving them to R2 is a later slice.
 */

/** Does this user own any analyzed people yet? */
export async function userHasPeople(userId: string): Promise<boolean> {
  const n = await prisma.person.count({ where: { userId } });
  return n > 0;
}

/** All of a user's people (latest result each), newest first. */
export async function listPeopleForUser(userId: string): Promise<Person[]> {
  const rows = await prisma.person.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: { results: { orderBy: { createdAt: "desc" }, take: 1 } },
  });
  return rows
    .map((p) => p.results[0]?.data as unknown as Person | undefined)
    .filter((x): x is Person => Boolean(x));
}

/** One of a user's people by id, or null if they don't own it / it's unanalyzed. */
export async function getPersonForUser(
  userId: string,
  personId: string
): Promise<Person | null> {
  const p = await prisma.person.findFirst({
    where: { userId, id: personId },
    include: { results: { orderBy: { createdAt: "desc" }, take: 1 } },
  });
  return (p?.results[0]?.data as unknown as Person | undefined) ?? null;
}

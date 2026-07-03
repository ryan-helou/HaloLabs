import { prisma } from "./db";
import { deletePersonPhotos } from "./storage";
import { stripe } from "./stripe";

/**
 * Data deletion — the concrete backing for the privacy promise ("delete
 * individual photos or your entire account at any time"). Two things don't come
 * for free from the DB cascade and are handled here explicitly:
 *   1. R2 photos live outside Postgres, so they're removed by prefix.
 *   2. Progress rows key on a plain personId string (not an FK to Person), so a
 *      Person delete won't cascade them.
 */

/**
 * Delete one person a user owns: their R2 photos, their check-offs, and the
 * Person row (which cascades Photo / AnalysisJob / AnalysisResult). Returns
 * false if the user doesn't own a DB person with that id.
 */
export async function deletePersonForUser(
  userId: string,
  personId: string
): Promise<boolean> {
  const person = await prisma.person.findFirst({
    where: { userId, id: personId },
    select: { id: true },
  });
  if (!person) return false;

  await deletePersonPhotos(personId).catch(() => {});
  await prisma.progress.deleteMany({ where: { userId, personId } });
  await prisma.person.delete({ where: { id: person.id } });
  return true;
}

/**
 * Delete an entire account: cancel any live Stripe subscription first (so a
 * deleted account can't keep getting billed), purge every person's R2 photos,
 * then delete the User row — which cascades people, photos, jobs, results,
 * progress, accounts, and sessions.
 */
export async function deleteAccount(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { stripeCustomerId: true },
  });

  if (user?.stripeCustomerId && stripe) {
    try {
      const subs = await stripe.subscriptions.list({
        customer: user.stripeCustomerId,
        status: "all",
        limit: 100,
      });
      await Promise.all(
        subs.data
          .filter((s) => s.status === "active" || s.status === "trialing" || s.status === "past_due")
          .map((s) => stripe!.subscriptions.cancel(s.id).catch(() => {}))
      );
    } catch {
      /* best-effort — never block account deletion on Stripe */
    }
  }

  const people = await prisma.person.findMany({
    where: { userId },
    select: { id: true },
  });
  await Promise.all(people.map((p) => deletePersonPhotos(p.id).catch(() => {})));

  await prisma.user.delete({ where: { id: userId } });
}

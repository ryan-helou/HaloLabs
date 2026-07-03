import { prisma } from "./db";
import { stripe } from "./stripe";
import { GUEST_EMAIL_DOMAIN } from "./auth";

/**
 * The email the buyer entered at Stripe checkout — their receipt address. Read
 * from their Stripe customer so the post-purchase account step can pre-fill it
 * (they typed it once at checkout; they shouldn't retype it). Returns null when
 * billing isn't configured, there's no customer yet, or the only email on file
 * is the synthetic guest placeholder.
 */
export async function checkoutEmailFor(userId: string): Promise<string | null> {
  if (!stripe) return null;
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { stripeCustomerId: true },
  });
  if (!u?.stripeCustomerId) return null;
  try {
    const customer = await stripe.customers.retrieve(u.stripeCustomerId);
    if (
      customer &&
      !customer.deleted &&
      typeof customer.email === "string" &&
      !customer.email.endsWith(`@${GUEST_EMAIL_DOMAIN}`)
    ) {
      return customer.email;
    }
  } catch {
    /* receipts email is best-effort */
  }
  return null;
}

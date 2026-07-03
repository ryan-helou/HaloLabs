import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { prisma } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { STRIPE } from "@/lib/env";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Stripe webhook — the source of truth for entitlement. It verifies the
 * signature, then flips User.subscriptionStatus:
 *   checkout.session.completed / subscription active|trialing → "active"
 *   subscription past_due|canceled|unpaid|deleted             → "inactive"
 * "active" is exactly what the paywall reads, so pay → unlock and cancel →
 * re-lock happen automatically.
 */
export async function POST(req: Request) {
  if (!stripe || !STRIPE.webhookSecret) {
    return NextResponse.json({ error: "Billing not configured" }, { status: 503 });
  }

  const sig = req.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "No signature" }, { status: 400 });

  const raw = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig, STRIPE.webhookSecret);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "bad signature";
    return NextResponse.json({ error: `Webhook error: ${msg}` }, { status: 400 });
  }

  async function setStatus(
    where: { stripeCustomerId?: string; id?: string },
    status: string
  ) {
    if (where.stripeCustomerId) {
      await prisma.user.updateMany({
        where: { stripeCustomerId: where.stripeCustomerId },
        data: { subscriptionStatus: status },
      });
    } else if (where.id) {
      await prisma.user.update({
        where: { id: where.id },
        data: { subscriptionStatus: status },
      });
    }
  }

  const ACTIVE = new Set(["active", "trialing"]);

  switch (event.type) {
    case "checkout.session.completed": {
      const s = event.data.object as Stripe.Checkout.Session;
      const userId = s.metadata?.userId;
      const customerId = typeof s.customer === "string" ? s.customer : undefined;
      if (customerId && userId) {
        await prisma.user.update({
          where: { id: userId },
          data: { stripeCustomerId: customerId, subscriptionStatus: "active" },
        });
      } else if (userId) {
        await setStatus({ id: userId }, "active");
      } else if (customerId) {
        await setStatus({ stripeCustomerId: customerId }, "active");
      }
      // Persist the email the buyer typed at checkout onto the Stripe customer,
      // so the post-purchase account step can pre-fill it (it's their receipt
      // address). Best-effort — never fail the webhook over it.
      const enteredEmail = s.customer_details?.email;
      if (stripe && customerId && enteredEmail) {
        try {
          await stripe.customers.update(customerId, { email: enteredEmail });
        } catch {
          /* cosmetic — the retrieve fallback still has Stripe's own copy */
        }
      }
      break;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      const customerId = typeof sub.customer === "string" ? sub.customer : undefined;
      const status = ACTIVE.has(sub.status) ? "active" : "inactive";
      const userId = sub.metadata?.userId;
      if (customerId) await setStatus({ stripeCustomerId: customerId }, status);
      else if (userId) await setStatus({ id: userId }, status);
      break;
    }
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const customerId = typeof sub.customer === "string" ? sub.customer : undefined;
      if (customerId) await setStatus({ stripeCustomerId: customerId }, "inactive");
      break;
    }
    default:
      // Unhandled events are acknowledged so Stripe stops retrying.
      break;
  }

  return NextResponse.json({ received: true });
}

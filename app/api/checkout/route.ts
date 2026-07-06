import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { STRIPE, stripeConfigured, appUrl } from "@/lib/env";
import { flattenAttribution } from "@/lib/attribution";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Create a Stripe Checkout session for the $9.99/mo subscription. On success
 * the webhook flips the user's subscriptionStatus to "active", which lifts the
 * paywall blur. Returns { url } for the client to redirect to.
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
  }
  if (!stripe || !stripeConfigured()) {
    return NextResponse.json(
      { error: "Billing isn't configured yet." },
      { status: 503 }
    );
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) {
    return NextResponse.json({ error: "Account not found." }, { status: 404 });
  }

  // Reuse or create the Stripe customer for this account. Guests (passwordless)
  // have only a synthetic @guest.halolabs email — don't put that on the
  // customer, so Stripe Checkout collects their REAL email (the receipt
  // address) and we can pre-fill it in the post-purchase account step. Real
  // accounts reuse their known email.
  const isGuest = !user.passwordHash;
  let customerId = user.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      ...(isGuest ? {} : { email: user.email }),
      metadata: { userId: user.id },
    });
    customerId = customer.id;
    await prisma.user.update({
      where: { id: user.id },
      data: { stripeCustomerId: customerId },
    });
  }

  // Where to return after checkout — back to the plan the user came from.
  let returnTo = "/profiles";
  try {
    const body = (await req.json()) as { returnTo?: string };
    if (typeof body.returnTo === "string" && body.returnTo.startsWith("/")) {
      returnTo = body.returnTo;
    }
  } catch {
    /* no body is fine */
  }

  // The buyer almost always checks out from their plan page (/person/<id>).
  // Carry that personId so the webhook can DURABLY enqueue the paid full-plan
  // even if the buyer closes the tab (the client trigger is now only a fallback).
  const personMatch = returnTo.match(/^\/person\/([^/?#]+)/);
  const personId = personMatch ? decodeURIComponent(personMatch[1]) : "";

  // First-touch marketing attribution captured at scan time, flattened onto the
  // Stripe session + subscription so the webhook can credit the sale to the
  // content that drove it.
  const attr = (user.attribution ?? {}) as Record<string, unknown>;
  const meta = { userId: user.id, ...(personId ? { personId } : {}), ...flattenAttribution(attr) };

  const checkout = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: STRIPE.priceId, quantity: 1 }],
    success_url: `${appUrl()}${returnTo}?upgraded=1`,
    cancel_url: `${appUrl()}${returnTo}`,
    client_reference_id:
      (typeof attr.utm_campaign === "string" && attr.utm_campaign) ||
      (typeof attr.utm_source === "string" && attr.utm_source) ||
      undefined,
    metadata: meta,
    subscription_data: { metadata: meta },
    allow_promotion_codes: true,
    // A 100%-off promo (the friends code) makes the total $0; without this,
    // subscription mode would still force a card. "if_required" lets a fully
    // discounted checkout complete with no payment method, while normal $9.99
    // signups still collect one.
    payment_method_collection: "if_required",
  });

  return NextResponse.json({ url: checkout.url });
}

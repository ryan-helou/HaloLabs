import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { STRIPE, stripeConfigured, appUrl } from "@/lib/env";

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

  // Reuse or create the Stripe customer for this account.
  let customerId = user.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
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

  const checkout = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: STRIPE.priceId, quantity: 1 }],
    success_url: `${appUrl()}${returnTo}?upgraded=1`,
    cancel_url: `${appUrl()}${returnTo}`,
    metadata: { userId: user.id },
    subscription_data: { metadata: { userId: user.id } },
    allow_promotion_codes: true,
  });

  return NextResponse.json({ url: checkout.url });
}

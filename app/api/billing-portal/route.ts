import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { stripeConfigured, appUrl } from "@/lib/env";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Opens the Stripe customer billing portal so a member can update their card,
 * see invoices, or cancel — the other half of the checkout loop, and what makes
 * the UnlockCard's "cancel anytime" promise real. GET so it can be a plain link
 * that 302s straight to Stripe; on any problem it bounces back to /profiles with
 * a flag the UI can surface.
 */
export async function GET() {
  const back = `${appUrl()}/profiles`;
  const fail = `${back}?billing=unavailable`;

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect(`${appUrl()}/login?callbackUrl=/profiles`);
  }
  if (!stripe || !stripeConfigured()) {
    return NextResponse.redirect(fail);
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user?.stripeCustomerId) {
    // No Stripe customer yet (never subscribed) — nothing to manage.
    return NextResponse.redirect(fail);
  }

  try {
    const portal = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: back,
    });
    return NextResponse.redirect(portal.url);
  } catch {
    return NextResponse.redirect(fail);
  }
}

import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { prisma } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { STRIPE } from "@/lib/env";
import { startFullPlan } from "@/lib/analyze";
import { hasFullPlan } from "@/lib/plan";
import { sendServerEvent } from "@/lib/analytics-server";
import type { Person } from "@/lib/types";

/** Pull the attr_* keys out of Stripe metadata back into a plain attribution map. */
function readAttribution(md: Stripe.Metadata | null | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(md ?? {})) {
    if (k.startsWith("attr_") && typeof v === "string") out[k.slice(5)] = v;
  }
  return out;
}

/**
 * DURABLY enqueue the paid full plan after payment — the fix for "pay, close the
 * tab, never get the plan you paid for." Idempotent: skips a person who already
 * has a full plan or a live job, so webhook redelivery / the client fallback
 * can't double-generate.
 */
async function enqueuePaidPlan(userId: string, personIdFromMeta?: string): Promise<void> {
  const people = personIdFromMeta
    ? await prisma.person.findMany({ where: { id: personIdFromMeta, userId } })
    : await prisma.person.findMany({ where: { userId } });
  for (const p of people) {
    const latest = await prisma.analysisResult.findFirst({
      where: { personId: p.id },
      orderBy: { createdAt: "desc" },
    });
    if (latest && hasFullPlan(latest.data as unknown as Person)) continue;
    const live = await prisma.analysisJob.findFirst({
      where: { personId: p.id, status: { in: ["QUEUED", "RUNNING"] } },
    });
    if (live) continue;
    await startFullPlan(userId, p.id);
  }
}

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

      // Durably enqueue the paid full plan so the buyer gets it even if they
      // closed the tab. Best-effort + idempotent (never fail the webhook over it,
      // or Stripe retries and we'd re-run — the guards make that safe anyway).
      if (userId) {
        try {
          await enqueuePaidPlan(userId, s.metadata?.personId || undefined);
        } catch (err) {
          console.error("[webhook] enqueuePaidPlan failed", err);
        }
      }

      // Record the conversion server-side and fire the RELIABLE analytics event,
      // both attributed to the campaign carried in metadata. stripeSessionId is
      // unique, so a redelivered webhook can't double-count revenue.
      const attr = readAttribution(s.metadata);
      try {
        await prisma.conversion.create({
          data: {
            userId: userId ?? null,
            amountCents: s.amount_total ?? 0,
            currency: s.currency ?? "usd",
            attribution: Object.keys(attr).length ? attr : undefined,
            stripeSessionId: s.id,
          },
        });
        await sendServerEvent("membership_active", attr);
      } catch (err) {
        // Unique-violation on redelivery is expected and fine; log anything else.
        const code = (err as { code?: string })?.code;
        if (code !== "P2002") console.error("[webhook] conversion record failed", err);
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

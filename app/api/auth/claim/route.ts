import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { auth, GUEST_EMAIL_DOMAIN } from "@/lib/auth";
import { stripe } from "@/lib/stripe";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Claim a guest account after purchase — the "create your account" step that now
 * happens AFTER payment. The paying guest already owns the scan + entitlement;
 * this just attaches real credentials (email + password + name) to that same
 * User row so they can log back in and keep everything. No new row is created,
 * so the plan they paid for is never orphaned.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Please start from your scan." }, { status: 401 });
  }

  const me = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!me) return NextResponse.json({ error: "Account not found." }, { status: 404 });
  if (me.passwordHash) {
    // Already a real account — nothing to claim.
    return NextResponse.json({ error: "This account already has a password. Log in instead." }, { status: 409 });
  }

  let body: { email?: string; password?: string; name?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const email = String(body.email ?? "").toLowerCase().trim();
  const password = String(body.password ?? "");
  const name = body.name ? String(body.name).trim().slice(0, 80) : null;

  if (!EMAIL_RE.test(email) || email.endsWith(`@${GUEST_EMAIL_DOMAIN}`)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }

  // Refuse if that email already belongs to a different (real) account.
  const taken = await prisma.user.findUnique({ where: { email } });
  if (taken && taken.id !== me.id) {
    return NextResponse.json(
      { error: "An account with that email already exists. Log in instead." },
      { status: 409 }
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.update({
    where: { id: me.id },
    data: { email, name, passwordHash, ageConfirmed18Plus: true },
  });

  // Give any default-named scans the person's real name.
  if (name) {
    await prisma.person.updateMany({
      where: { userId: me.id, displayName: "Your scan" },
      data: { displayName: name },
    });
  }

  // Best-effort: point the Stripe customer (created with the synthetic guest
  // email) at their real email for receipts. Never block the claim on it.
  if (stripe && me.stripeCustomerId) {
    try {
      await stripe.customers.update(me.stripeCustomerId, { email, name: name ?? undefined });
    } catch {
      /* receipts email is cosmetic — ignore */
    }
  }

  return NextResponse.json({ ok: true });
}

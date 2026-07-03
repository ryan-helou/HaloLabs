import { auth } from "@/lib/auth";

/**
 * The single source of truth for whether a plan is unlocked. Today it reads the
 * user's subscriptionStatus; Stripe's webhook flips that flag to "active" in
 * Phase 3. Kept tiny and pure so the paywall UI and any API route agree.
 */
export function isActive(subscriptionStatus?: string | null): boolean {
  return subscriptionStatus === "active";
}

/** Resolve the current request's entitlement from the session. */
export async function isUnlocked(): Promise<boolean> {
  const session = await auth();
  return isActive(session?.user?.subscriptionStatus);
}

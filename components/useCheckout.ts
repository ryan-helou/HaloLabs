"use client";

import { useState } from "react";
import { track } from "@/lib/track";

/**
 * Shared Stripe-Checkout starter used by both the sticky PaywallBar and the
 * inline UnlockCard, so the redirect + error handling lives in one place. On
 * success it navigates to Stripe; the webhook flips subscriptionStatus and the
 * blur lifts on return (?upgraded=1).
 */
export function useCheckout() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startCheckout() {
    setLoading(true);
    setError(null);
    track("checkout_started");
    try {
      const returnTo =
        typeof window !== "undefined" ? window.location.pathname : "/profiles";
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ returnTo }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.url) {
        window.location.assign(data.url);
        return;
      }
      setError(data.error || "Couldn't start checkout. Please try again.");
    } catch {
      setError("Couldn't start checkout. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return { startCheckout, loading, error };
}

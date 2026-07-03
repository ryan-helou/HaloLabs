"use client";

import { useState } from "react";

/**
 * The pressure UI for a locked plan: a fixed bar pinned to the bottom of the
 * viewport with a "X of Y unlocked" counter and the upgrade call to action.
 *
 * The button opens Stripe Checkout for the subscription; on success the webhook
 * flips the account's subscriptionStatus and the blur lifts on return.
 */
export default function PaywallBar({
  unlockedCount,
  totalCount,
  price = "$9.99/mo",
}: {
  /** Insights visible for free (the one revealed suggestion). */
  unlockedCount: number;
  /** Total insights in the full plan. */
  totalCount: number;
  price?: string;
}) {
  const pct = totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onUnlock() {
    setLoading(true);
    setError(null);
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

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-4 sm:pb-6">
      <div className="pointer-events-auto flex w-full max-w-[1300px] flex-col gap-3 rounded-2xl border border-line bg-surface/95 px-5 py-4 shadow-float backdrop-blur-md sm:flex-row sm:items-center sm:gap-6 sm:px-6">
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-3">
            <p className="font-mono text-[11px] uppercase tracking-label text-ink-soft">
              <span className="text-ink">{unlockedCount}</span> of {totalCount}{" "}
              insights unlocked
            </p>
            <p className="font-mono text-[11px] uppercase tracking-label text-ink-soft sm:hidden">
              {price}
            </p>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line">
            <div
              className="h-full rounded-full bg-pine transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          {error && (
            <p className="mt-1.5 text-xs text-clay" role="alert">
              {error}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={onUnlock}
          disabled={loading}
          className="shrink-0 rounded-full bg-pine px-6 py-3 text-center text-sm font-medium text-paper transition-colors hover:bg-pine-deep disabled:opacity-60"
        >
          {loading ? "Opening checkout…" : "Unlock full plan"}
          {!loading && (
            <span className="ml-2 font-mono text-xs text-paper/70">{price}</span>
          )}
        </button>
      </div>
    </div>
  );
}

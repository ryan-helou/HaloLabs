"use client";

import { useCheckout } from "./useCheckout";

/**
 * The persistent unlock affordance on a locked plan: a floating bar pinned to
 * the bottom of the viewport. It states the value plainly (the full plan is
 * ready) rather than dangling a "X of Y unlocked" completion meter — that
 * gamified-scarcity framing is exactly the pressure mechanic STRATEGY §3.7 says
 * we don't use. The detailed pitch lives in the inline UnlockCard; this is just
 * the always-there way to act on it. The button opens Stripe Checkout.
 */
export default function PaywallBar({
  totalCount,
  price = "$9.99/mo",
}: {
  /** Total suggestions in the full plan — a quiet value anchor. */
  totalCount: number;
  price?: string;
}) {
  const { startCheckout, loading, error } = useCheckout();

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-4 sm:pb-6">
      <div className="pointer-events-auto flex w-full max-w-[1300px] flex-col gap-3 rounded-2xl border border-line bg-surface/95 px-5 py-3.5 shadow-float backdrop-blur-md sm:flex-row sm:items-center sm:gap-6 sm:px-6">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink">Your full plan is ready</p>
          <p className="mt-0.5 text-xs leading-relaxed text-ink-soft">
            Routine, roadmap, shopping list
            {totalCount > 0 ? `, and all ${totalCount} suggestions` : ""} — with
            the reasoning behind every move.
          </p>
          {error && (
            <p className="mt-1.5 text-xs text-clay" role="alert">
              {error}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={startCheckout}
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

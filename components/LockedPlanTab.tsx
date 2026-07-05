import type { Advice, Plan } from "@/lib/types";
import type { FlatSuggestion } from "@/lib/plan";
import MovePlan from "./MovePlan";
import LockedSection from "./LockedSection";
import SuggestionRow from "./SuggestionRow";

/**
 * The "Your plan" tab for a locked (unpaid) member — the same hand-held plan the
 * paid view shows, but behind the paywall. One move is revealed in full as a
 * real taste of the plan; the rest of the sequence (buy list, weekly moves,
 * daily rhythm) sits blurred beneath, its shape visible, unlock one tap away.
 */
export default function LockedPlanTab({
  plan,
  advice,
  free,
  personId,
}: {
  plan: Plan;
  advice: Advice;
  /** The single suggestion shown in full, chosen by the page. */
  free?: FlatSuggestion;
  personId: string;
}) {
  return (
    <section className="mx-auto max-w-[760px] px-5 pb-16 pt-10 sm:px-6">
      <div className="max-w-[52ch]">
        <h2 className="font-display text-2xl font-medium tracking-tight text-ink sm:text-[28px]">
          Here&apos;s exactly what to do.
        </h2>
        <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">
          Your full plan walks you through it step by step — what to buy, what to
          start this week, and the daily rhythm. Here&apos;s one move on the house.
        </p>
      </div>

      {free && (
        <div className="mt-6 rounded-2xl border border-line bg-sage/40 p-4 sm:p-5">
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <p className="text-[12px] font-semibold uppercase tracking-[0.05em] text-pine">
              One move, on the house
            </p>
            <span className="text-[12px] text-ink-soft">Unlock the rest below</span>
          </div>
          <SuggestionRow suggestion={free.suggestion} defaultOpen />
        </div>
      )}

      <div className="mt-8">
        <LockedSection note="Your full step-by-step plan">
          <MovePlan plan={plan} advice={advice} personId={personId} />
        </LockedSection>
      </div>
    </section>
  );
}

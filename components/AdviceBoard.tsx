"use client";

import { useState } from "react";
import type { Advice } from "@/lib/types";
import { ADVICE_CATEGORIES } from "@/lib/types";
import { CATEGORY_META } from "@/lib/categories";
import { isQuickWin } from "@/lib/badges";
import AdviceSection from "./AdviceSection";
import AdviceMatrix, { type MatrixItem } from "./AdviceMatrix";
import Legend from "./Legend";
import ReportSection from "./ReportSection";
import LockedSection from "./LockedSection";
import SuggestionRow from "./SuggestionRow";

/**
 * Acts of the report body. Protocol (the actionable per-suggestion detail with
 * why/how/products) leads; the analysis map is a supporting recap that follows.
 * `startNum` lets the page number these after the plan sections above them.
 *
 * When `locked`, the protocol reveals exactly one suggestion in full (the free
 * preview, keyed by `freeKey`) and blurs the rest; the analysis map is blurred
 * whole. Unlocked, everything renders as normal.
 */
export default function AdviceBoard({
  advice,
  startNum = 2,
  locked = false,
  freeKey,
}: {
  advice: Advice;
  startNum?: number;
  /** Blur the protocol/analysis specifics behind the paywall. */
  locked?: boolean;
  /** `${category}-${index}` id of the one suggestion revealed for free. */
  freeKey?: string;
}) {
  const [sortByImpact, setSortByImpact] = useState(true);
  const pad = (x: number) => String(x).padStart(2, "0");
  const protocolNum = pad(startNum);
  const analysisNum = pad(startNum + 1);

  // Assign each suggestion a stable id so the matrix, the shortlist, and the
  // cards all refer to the same anchor regardless of display sort order.
  const catItems = ADVICE_CATEGORIES.map((cat) => ({
    cat,
    items: (advice[cat] ?? []).map(
      (s, i): MatrixItem => ({ id: `${cat}-${i}`, cat, s })
    ),
  }));
  const allItems = catItems.flatMap((c) => c.items);
  const quickWins = allItems.filter((x) => isQuickWin(x.s));
  const areas = catItems.filter((c) => c.items.length > 0).length;

  // The one suggestion shown in full on a locked plan (chosen by the page).
  const freeItem = freeKey ? allItems.find((x) => x.id === freeKey) : undefined;

  const stats = [
    { value: allItems.length, label: allItems.length === 1 ? "idea" : "ideas" },
    { value: quickWins.length, label: "quick wins", accent: true },
    { value: areas, label: areas === 1 ? "focus area" : "focus areas" },
  ];

  return (
    <>
      {/* ── Protocol — the actionable detail leads ────────────────────── */}
      <ReportSection
        num={protocolNum}
        titleA="Your improvement"
        titleB="protocol"
        id="protocol"
        blurb="Options, not fixes. Each move says why it's for you, how to do it, and roughly what it costs — the tags describe the suggestion, never you."
        rail={<Legend />}
      >
        {/* Free preview — the single suggestion revealed on a locked plan,
            shown in full and expanded so it lands as the reward. */}
        {locked && freeItem && (
          <div className="border-b border-line bg-sage/30 p-5 sm:p-8">
            <div className="mb-4 flex items-baseline justify-between gap-3">
              <p className="font-mono text-[10px] uppercase tracking-label text-pine">
                Your free preview /
              </p>
              <span className="font-mono text-[10px] uppercase tracking-label text-ink-soft">
                1 of {allItems.length} unlocked
              </span>
            </div>
            <SuggestionRow suggestion={freeItem.s} defaultOpen />
          </div>
        )}

        {locked ? (
          <LockedSection note="The rest of your protocol">
            {renderProtocolBody()}
          </LockedSection>
        ) : (
          renderProtocolBody()
        )}
      </ReportSection>

      {/* ── Analysis — the map/recap of everything above ──────────────── */}
      <ReportSection
        num={analysisNum}
        titleA="Your facial"
        titleB="analysis"
        id="analysis"
        blurb="The same suggestions as a map — how much each tends to help against what it takes to do. The counts describe the plan, never you."
        lockedContent={locked}
        lockNote="Your full analysis map"
      >
        {/* Neutral stat strip — counts only; never a rating of the person. */}
        <dl className="grid grid-cols-3 divide-x divide-line border-b border-line">
          {stats.map((s) => (
            <div key={s.label} className="px-6 py-6 sm:px-8 sm:py-7">
              <dd
                className={`font-display text-4xl font-medium leading-none sm:text-5xl ${
                  s.accent && s.value > 0 ? "text-clay" : "text-ink"
                }`}
              >
                {s.value}
              </dd>
              <dt className="mt-2.5 font-mono text-[10px] uppercase tracking-label text-ink-soft">
                {s.label}
              </dt>
            </div>
          ))}
        </dl>

        {allItems.length > 0 && (
          <div className="p-5 sm:p-8">
            <AdviceMatrix items={allItems} />
          </div>
        )}
      </ReportSection>
    </>
  );

  function renderProtocolBody() {
    return (
      <div className="space-y-10 p-5 sm:p-8">
          {/* Start here — the ordered shortlist of easiest high-value moves. */}
          {quickWins.length > 0 && (
            <div className="border border-clay/30 bg-clay-soft/40 p-5 sm:p-7">
              <div className="flex items-baseline justify-between gap-3">
                <p className="font-mono text-[10px] uppercase tracking-label text-clay">
                  Start here /
                </p>
                <span className="font-mono text-[11px] uppercase tracking-label text-clay">
                  {quickWins.length} quick {quickWins.length === 1 ? "win" : "wins"}
                </span>
              </div>
              <ol className="mt-5 divide-y divide-clay/20">
                {quickWins.map((q, i) => (
                  <li key={q.id}>
                    <a
                      href={`#sug-${q.id}`}
                      className="group flex items-baseline gap-6 py-3 transition-colors hover:text-pine-deep"
                    >
                      <span className="w-7 shrink-0 font-mono text-xs text-clay">
                        [{i + 1}]
                      </span>
                      <span className="flex-1 text-[15px] text-ink">{q.s.title}</span>
                      <span className="hidden font-mono text-[10px] uppercase tracking-label text-ink-soft sm:inline">
                        {CATEGORY_META[q.cat].label}
                      </span>
                      <span
                        aria-hidden
                        className="text-ink-soft transition-transform group-hover:translate-x-0.5"
                      >
                        →
                      </span>
                    </a>
                  </li>
                ))}
              </ol>
            </div>
          )}

          <div className="flex justify-end">
            <div
              role="group"
              aria-label="Order suggestions"
              className="inline-flex rounded-full border border-line bg-surface p-1 text-sm"
            >
              <button
                type="button"
                onClick={() => setSortByImpact(true)}
                aria-pressed={sortByImpact}
                className={`rounded-full px-3 py-1.5 transition-colors ${
                  sortByImpact ? "bg-pine text-paper" : "text-ink-soft hover:text-ink"
                }`}
              >
                By impact
              </button>
              <button
                type="button"
                onClick={() => setSortByImpact(false)}
                aria-pressed={!sortByImpact}
                className={`rounded-full px-3 py-1.5 transition-colors ${
                  !sortByImpact ? "bg-pine text-paper" : "text-ink-soft hover:text-ink"
                }`}
              >
                As written
              </button>
            </div>
          </div>

          <div className="space-y-12">
            {catItems.map(({ cat, items }) => (
              <AdviceSection
                key={cat}
                cat={cat}
                title={CATEGORY_META[cat].label}
                color={CATEGORY_META[cat].color}
                items={items}
                sortByImpact={sortByImpact}
              />
            ))}
          </div>
        </div>
    );
  }
}

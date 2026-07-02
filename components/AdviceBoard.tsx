"use client";

import { useState } from "react";
import type { Advice } from "@/lib/types";
import { ADVICE_CATEGORIES } from "@/lib/types";
import { CATEGORY_META } from "@/lib/categories";
import { isQuickWin } from "@/lib/badges";
import AdviceSection from "./AdviceSection";
import AdviceMatrix, { type MatrixItem } from "./AdviceMatrix";
import Legend from "./Legend";

/** Numbered act header — matches the observations header on the person page. */
function ActHeader({
  num,
  title,
  id,
}: {
  num: string;
  title: string;
  id?: string;
}) {
  return (
    <div
      id={id}
      className="mb-5 flex scroll-mt-24 items-baseline gap-3 border-b border-line pb-3"
    >
      <span className="font-mono text-xs text-ink-soft">{num}</span>
      <h2 className="font-display text-2xl text-ink">{title}</h2>
    </div>
  );
}

export default function AdviceBoard({ advice }: { advice: Advice }) {
  const [sortByImpact, setSortByImpact] = useState(true);

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

  const stats = [
    { value: allItems.length, label: allItems.length === 1 ? "idea" : "ideas" },
    { value: quickWins.length, label: "quick wins", accent: true },
    { value: areas, label: areas === 1 ? "focus area" : "focus areas" },
  ];

  return (
    <div className="space-y-14">
      {/* ── Act 02 · Analysis ─────────────────────────────────────────── */}
      <section>
        <ActHeader num="02" title="Analysis" id="analysis" />

        {/* Neutral stat strip — counts only; never a rating of the person. */}
        <dl className="mb-5 grid grid-cols-3 gap-3">
          {stats.map((s) => (
            <div
              key={s.label}
              className="rounded-2xl border border-line bg-surface px-4 py-4 shadow-card"
            >
              <dd
                className={`font-display text-4xl font-semibold leading-none ${
                  s.accent && s.value > 0 ? "text-clay" : "text-ink"
                }`}
              >
                {s.value}
              </dd>
              <dt className="eyebrow mt-2">{s.label}</dt>
            </div>
          ))}
        </dl>

        {allItems.length > 0 && <AdviceMatrix items={allItems} />}
      </section>

      {/* ── Act 03 · Protocol ─────────────────────────────────────────── */}
      <section>
        <ActHeader num="03" title="Protocol" id="protocol" />
        <p className="-mt-1 mb-5 max-w-xl text-[15px] leading-relaxed text-ink-soft">
          Options, not fixes. Each move is tagged by how much it tends to help
          and what it takes to do — the tags describe the suggestion, never you.
        </p>

        {/* Start here — the ordered shortlist of easiest high-value moves. */}
        {quickWins.length > 0 && (
          <div className="overflow-hidden rounded-2xl border border-clay/30 bg-clay-soft/50 p-5 sm:p-6">
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="font-display text-xl text-ink">Start here</h3>
              <span className="font-mono text-[11px] uppercase tracking-label text-clay">
                {quickWins.length} quick {quickWins.length === 1 ? "win" : "wins"}
              </span>
            </div>
            <ol className="mt-4 space-y-2">
              {quickWins.map((q, i) => (
                <li key={q.id}>
                  <a
                    href={`#sug-${q.id}`}
                    className="group flex items-center gap-3 rounded-xl bg-surface/70 px-3 py-2.5 transition-colors hover:bg-surface"
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-clay font-mono text-[11px] text-paper">
                      {i + 1}
                    </span>
                    <span className="flex-1 text-[15px] text-ink">{q.s.title}</span>
                    <span className="font-mono text-[10px] uppercase tracking-label text-ink-soft">
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

        <div className="mt-8 grid gap-4 md:grid-cols-[1fr_auto] md:items-start">
          <Legend />
          <div className="flex md:justify-end">
            <div
              role="group"
              aria-label="Order suggestions"
              className="inline-flex rounded-full border border-line bg-surface p-1 text-sm shadow-card"
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
        </div>

        <div className="mt-10 space-y-12">
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
      </section>
    </div>
  );
}

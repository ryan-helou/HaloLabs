"use client";

import { useState } from "react";
import type { AdviceCategory, Suggestion } from "@/lib/types";
import { CATEGORY_META } from "@/lib/categories";
import { isQuickWin } from "@/lib/badges";
import CategoryIcon from "./CategoryIcon";

export type MatrixItem = {
  id: string; // stable id, e.g. "hair-0"
  cat: AdviceCategory;
  s: Suggestion;
};

// Cell centers as % of the plot. Effort → x (low = left), Impact → y (high = top).
const EFFORT_X: Record<string, number> = { low: 22, medium: 50, high: 78 };
const IMPACT_Y: Record<string, number> = { high: 22, medium: 50, low: 78 };

export default function AdviceMatrix({ items }: { items: MatrixItem[] }) {
  const [hover, setHover] = useState<string | null>(null);

  // Spread suggestions that share a cell so dots don't stack.
  const groups = new Map<string, MatrixItem[]>();
  for (const it of items) {
    const key = `${it.s.impact}-${it.s.effort}`;
    const arr = groups.get(key);
    if (arr) arr.push(it);
    else groups.set(key, [it]);
  }
  const pos = new Map<string, { x: number; y: number }>();
  for (const [key, arr] of groups) {
    const [impact, effort] = key.split("-");
    const bx = EFFORT_X[effort];
    const by = IMPACT_Y[impact];
    arr.forEach((it, i) => {
      if (arr.length === 1) {
        pos.set(it.id, { x: bx, y: by });
      } else {
        const ang = (Math.PI * 2 * i) / arr.length - Math.PI / 2;
        const r = 8;
        pos.set(it.id, { x: bx + r * Math.cos(ang), y: by + r * Math.sin(ang) });
      }
    });
  }

  const active = items.find((i) => i.id === hover) ?? null;
  const activePos = active ? pos.get(active.id)! : null;

  return (
    <div className="rounded-2xl border border-line bg-surface p-5 shadow-card sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="eyebrow">The map</p>
          <h3 className="mt-1 font-display text-xl text-ink">Impact vs effort</h3>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1.5">
          {(Object.keys(CATEGORY_META) as AdviceCategory[]).map((c) => (
            <span key={c} className="inline-flex items-center gap-1.5 text-xs text-ink-soft">
              <CategoryIcon
                category={c}
                className="h-3.5 w-3.5"
                color={CATEGORY_META[c].color}
              />
              {CATEGORY_META[c].label}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-5 flex gap-3">
        {/* Y axis */}
        <div className="flex flex-col items-center justify-between py-1">
          <span className="eyebrow">High</span>
          <span className="rotate-180 font-mono text-[11px] uppercase tracking-label text-ink [writing-mode:vertical-rl]">
            Impact
          </span>
          <span className="eyebrow">Low</span>
        </div>

        {/* Plot */}
        <div className="min-w-0 flex-1">
          <div className="relative aspect-[4/5] w-full overflow-hidden rounded-xl border border-line bg-paper sm:aspect-[3/2]">
            {/* "Do first" zone: high impact + low effort */}
            <div className="absolute left-0 top-0 h-1/2 w-1/2 bg-clay-soft/60" />
            {/* Crosshair */}
            <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-line" />
            <div className="absolute inset-y-0 left-1/2 border-l border-dashed border-line" />

            {/* Quadrant labels */}
            <span className="absolute left-2 top-2 font-mono text-[10px] uppercase tracking-label text-clay">
              Do first
            </span>
            <span className="absolute right-2 top-2 font-mono text-[10px] uppercase tracking-label text-ink-soft">
              Big projects
            </span>
            <span className="absolute bottom-2 left-2 font-mono text-[10px] uppercase tracking-label text-ink-soft">
              Easy extras
            </span>
            <span className="absolute bottom-2 right-2 font-mono text-[10px] uppercase tracking-label text-ink-soft">
              Low priority
            </span>

            {/* Dots */}
            {items.map((it) => {
              const p = pos.get(it.id)!;
              const qw = isQuickWin(it.s);
              const isActive = hover === it.id;
              return (
                <a
                  key={it.id}
                  href={`#sug-${it.id}`}
                  onMouseEnter={() => setHover(it.id)}
                  onMouseLeave={() => setHover((h) => (h === it.id ? null : h))}
                  onFocus={() => setHover(it.id)}
                  onBlur={() => setHover((h) => (h === it.id ? null : h))}
                  className="group absolute -translate-x-1/2 -translate-y-1/2 rounded-full focus:outline-none"
                  style={{ left: `${p.x}%`, top: `${p.y}%`, zIndex: isActive ? 20 : 10 }}
                  aria-label={`${it.s.title} — ${CATEGORY_META[it.cat].label}, impact ${it.s.impact}, effort ${it.s.effort}`}
                >
                  <span
                    className={`block rounded-full ring-offset-2 ring-offset-paper transition-transform duration-200 ${
                      qw ? "ring-2 ring-clay" : ""
                    } ${isActive ? "scale-150" : "group-hover:scale-125"}`}
                    style={{
                      backgroundColor: CATEGORY_META[it.cat].color,
                      width: 15,
                      height: 15,
                    }}
                  />
                </a>
              );
            })}

            {/* Tooltip */}
            {active && activePos && (
              <div
                className="pointer-events-none absolute z-30 w-max max-w-[200px] -translate-x-1/2 rounded-lg bg-ink px-2.5 py-1.5 text-xs text-paper shadow-lg"
                style={{
                  left: `${activePos.x}%`,
                  top: `${activePos.y}%`,
                  transform: `translate(-50%, ${activePos.y > 60 ? "-130%" : "40%"})`,
                }}
              >
                <span
                  className="mr-1 inline-block h-2 w-2 rounded-full align-middle"
                  style={{ backgroundColor: CATEGORY_META[active.cat].color }}
                />
                {active.s.title}
              </div>
            )}
          </div>

          {/* X axis */}
          <div className="mt-2 flex items-center justify-between">
            <span className="eyebrow">Low</span>
            <span className="font-mono text-[11px] uppercase tracking-label text-ink">
              Effort →
            </span>
            <span className="eyebrow">High</span>
          </div>
        </div>
      </div>

      <p className="mt-4 text-xs text-ink-soft">
        Each dot is one suggestion. Top-left is the sweet spot — big change, little
        effort. <span className="text-clay">Ringed dots are quick wins.</span> Tap a
        dot to jump to it.
      </p>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";

/**
 * Tabbed navigation for the unlocked member report. The full plan is a long
 * document (digest, routine/roadmap/shopping, per-suggestion protocol, the
 * analysis, and the progress loop), so instead of one endless scroll a member
 * flips between Overview / Plan / Analysis / Progress. Only the member view
 * uses this — the locked teaser stays a single selling scroll.
 *
 * Content for every tab is server-rendered and passed in; we mount only the
 * active panel. The tab bar sticks just below the floating site header. The
 * active tab is mirrored to the URL hash (#plan) so it survives a refresh and
 * can be linked to.
 */

export interface MemberTab {
  id: string;
  label: string;
  content: React.ReactNode;
}

export default function MemberTabs({ tabs }: { tabs: MemberTab[] }) {
  const [active, setActive] = useState(tabs[0]?.id);

  // Restore the tab from the URL hash on mount (e.g. a shared /person/x#plan).
  useEffect(() => {
    const fromHash = window.location.hash.replace(/^#/, "");
    if (fromHash && tabs.some((t) => t.id === fromHash)) setActive(fromHash);
  }, [tabs]);

  const current = tabs.find((t) => t.id === active) ?? tabs[0];

  function select(id: string) {
    setActive(id);
    // Update the hash without a jump (replaceState keeps scroll position).
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", `#${id}`);
    }
  }

  return (
    <>
      <div className="sticky top-20 z-30 border-y border-line bg-surface/90 backdrop-blur-md">
        <div
          role="tablist"
          aria-label="Report sections"
          className="mx-auto flex max-w-[1300px] gap-1 overflow-x-auto px-4 sm:px-10"
        >
          {tabs.map((t) => {
            const on = t.id === current.id;
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => select(t.id)}
                className={`relative shrink-0 whitespace-nowrap px-4 py-4 font-mono text-[11px] uppercase tracking-label transition-colors ${
                  on ? "text-pine" : "text-ink-soft hover:text-ink"
                }`}
              >
                {t.label}
                {on && (
                  <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-pine" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div role="tabpanel" className="border-b border-line">
        {current.content}
      </div>
    </>
  );
}

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

  // Restore the tab from the URL hash on mount (e.g. a shared /person/x#plan),
  // and follow in-page links to another tab (e.g. Overview's "See your plan").
  useEffect(() => {
    const sync = () => {
      const fromHash = window.location.hash.replace(/^#/, "");
      if (fromHash && tabs.some((t) => t.id === fromHash)) {
        setActive(fromHash);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    };
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
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
      {/* Floating tab pill — same chrome language as the site header (rounded,
          translucent, blurred, floating), so content scrolls behind both
          uniformly instead of being cut off by a full-width band. */}
      <div className="sticky top-16 z-30 px-4 py-3">
        <div
          role="tablist"
          aria-label="Report sections"
          className="mx-auto flex w-fit max-w-full gap-1 overflow-x-auto rounded-full border border-line/80 bg-surface/80 p-1.5 shadow-float backdrop-blur-xl"
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
                className={`shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-[13px] font-medium transition-colors ${
                  on
                    ? "bg-pine text-paper"
                    : "text-ink-soft hover:bg-chip hover:text-ink"
                }`}
              >
                {t.label}
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

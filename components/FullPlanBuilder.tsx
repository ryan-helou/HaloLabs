"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * The post-purchase build screen. On a just-unlocked plan the free scan only
 * produced the teaser, so the routine/roadmap/shopping list are generated now
 * (once). This kicks that off, polls, and refreshes the page into the full plan
 * when it's ready. The wait is honest — real generation is happening — and only
 * ever runs once per person.
 */
type State = "building" | "error";

const STEPS = [
  "Writing out every move — the why, the how, what to use",
  "Sequencing your AM / PM / weekly routine",
  "Phasing the 90-day roadmap",
  "Building your shopping list",
];

export default function FullPlanBuilder({ personId }: { personId: string }) {
  const router = useRouter();
  const [state, setState] = useState<State>("building");
  const [elapsed, setElapsed] = useState(0);
  const started = useRef(false);

  const kick = useCallback(async () => {
    setState("building");
    try {
      await fetch(`/api/person/${encodeURIComponent(personId)}/full`, { method: "POST" });
    } catch {
      /* the poller will retry / surface errors */
    }
  }, [personId]);

  // Start once on mount.
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void kick();
  }, [kick]);

  // Poll for completion, ticking an elapsed counter for the stepper.
  useEffect(() => {
    if (state !== "building") return;
    const tick = setInterval(() => setElapsed((s) => s + 1), 1000);
    const poll = setInterval(async () => {
      try {
        const res = await fetch(`/api/person/${encodeURIComponent(personId)}/full`);
        const data = await res.json();
        if (data.state === "ready") {
          clearInterval(poll);
          clearInterval(tick);
          router.refresh();
        } else if (data.state === "error") {
          setState("error");
        } else if (data.state === "idle") {
          void kick(); // teaser present but no job — (re)start it
        }
      } catch {
        /* keep polling */
      }
    }, 3000);
    return () => {
      clearInterval(poll);
      clearInterval(tick);
    };
  }, [state, personId, router, kick]);

  if (state === "error") {
    return (
      <section className="border-t border-line">
        <div className="mx-auto max-w-xl px-6 py-16 text-center">
          <h2 className="font-display text-3xl font-medium tracking-tight text-ink">
            That took too long.
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-ink-soft">
            Your membership is active and your photos are safe — the plan just
            didn&apos;t finish building. Give it another go.
          </p>
          <button
            type="button"
            onClick={() => {
              setElapsed(0);
              void kick();
            }}
            className="mt-7 rounded-full bg-pine px-7 py-3.5 text-sm font-medium text-paper shadow-float transition-colors hover:bg-pine-deep"
          >
            Build my plan
          </button>
        </div>
      </section>
    );
  }

  // A step "activates" roughly every ~12s so the screen conveys motion; the last
  // one keeps pulsing until the real result flips the page (never claims done).
  const active = Math.min(Math.floor(elapsed / 12), STEPS.length - 1);

  return (
    <section className="border-t border-line">
      <div className="mx-auto max-w-xl px-6 py-16 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center">
          <span className="h-12 w-12 animate-spin rounded-full border-2 border-line border-t-pine" />
        </div>
        <p className="mt-6 eyebrow">Membership active</p>
        <h2 className="mt-3 font-display text-4xl font-medium tracking-tight text-ink">
          Building your full plan…
        </h2>
        <p className="mx-auto mt-4 max-w-md text-[15px] leading-relaxed text-ink-soft">
          Now that you&apos;re in, we&apos;re writing out every move and building
          your routine, roadmap, and shopping list. About half a minute.
        </p>
        {elapsed > 0 && (
          <p className="mt-3 font-mono text-xs text-ink-soft">{elapsed}s</p>
        )}

        <ol className="mx-auto mt-8 max-w-sm space-y-2.5 text-left">
          {STEPS.map((s, i) => {
            const done = i < active;
            const isActive = i === active;
            return (
              <li key={s} className="flex items-center gap-3">
                <span
                  aria-hidden
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] transition-colors ${
                    done
                      ? "border-pine bg-pine text-paper"
                      : isActive
                        ? "border-pine text-pine"
                        : "border-line text-ink-soft"
                  }`}
                >
                  {done ? (
                    <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                  ) : isActive ? (
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-pine" />
                  ) : (
                    i + 1
                  )}
                </span>
                <span className={`text-sm ${done || isActive ? "text-ink" : "text-ink-soft"}`}>
                  {s}
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

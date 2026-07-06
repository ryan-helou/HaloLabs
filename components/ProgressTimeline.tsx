"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Checkin } from "@/lib/checkins";
import { photoUrl } from "@/lib/photo";
import { normalizeForUpload } from "@/lib/heic";
import CompareSlider from "./CompareSlider";
import ShareButton from "./ShareButton";
import { useToast } from "./Toast";

/**
 * The progress loop — members re-photo every ~2 weeks to track their glow-up.
 * Shows a before/after slider (baseline vs latest check-in), a dated history,
 * and a biweekly nudge. Progress is the real thing (their own photos over time),
 * never an AI morph — the defensible, non-mocked version of before/after.
 */

const DAY = 86_400_000;
const CADENCE_DAYS = 14;

function fmtDate(ms: number): string {
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function ProgressTimeline({
  personId,
  baselinePhoto,
  baselineAt,
  checkins,
}: {
  personId: string;
  /** The frontal baseline photo ref (person.photos[0]). */
  baselinePhoto?: string;
  /** ISO date the baseline analysis was done. */
  baselineAt: string;
  /** Check-ins newest-first (from lib/checkins). */
  checkins: Checkin[];
}) {
  const router = useRouter();
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const baseMs = Date.parse(baselineAt) || Date.now();
  const latest = checkins[0];
  const lastMs = latest?.ts ?? baseMs;
  const now = Date.now();
  const daysSince = Math.floor((now - lastMs) / DAY);
  const due = daysSince >= CADENCE_DAYS;
  const nextIn = Math.max(0, CADENCE_DAYS - daysSince);

  async function onFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    setBusy(true);
    try {
      const files = await normalizeForUpload(Array.from(fileList));
      const form = new FormData();
      for (const f of files) form.append("files", f);
      const res = await fetch(`/api/person/${encodeURIComponent(personId)}/checkin`, {
        method: "POST",
        body: form,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({ kind: "error", message: data.error || "Couldn't save your check-in." });
      } else {
        toast({ kind: "success", message: "Check-in saved — nice work keeping it up." });
        router.refresh();
      }
    } catch {
      toast({ kind: "error", message: "Couldn't reach the server. Please try again." });
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  const addButton = (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,.heic,.heif"
        multiple
        hidden
        onChange={(e) => onFiles(e.target.files)}
      />
      <button
        type="button"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        className="inline-flex items-center gap-2 rounded-full bg-pine px-6 py-3 text-sm font-medium text-paper shadow-float transition-colors hover:bg-pine-deep disabled:opacity-60"
      >
        {busy ? "Saving…" : "Add a check-in"}
        {!busy && <span aria-hidden>+</span>}
      </button>
    </>
  );

  return (
    <section id="progress" className="scroll-mt-24 border-t border-line bg-surface">
      <div className="mx-auto max-w-[1300px] px-6 py-14 sm:px-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Your progress /</p>
            <h2 className="mt-2 font-display text-3xl font-medium tracking-tight text-ink sm:text-4xl">
              Track your{" "}
              <span className="text-pine">glow-up</span>
            </h2>
            <p className="mt-3 max-w-lg text-[15px] leading-relaxed text-ink-soft">
              Re-photo every two weeks in the same spot and light. Small changes
              are invisible day to day — they show up in the comparison.
            </p>
          </div>
          <div className="flex flex-col items-end gap-3 text-right">
            {due ? (
              <p className="rounded-full border border-pine/30 bg-sage/50 px-4 py-2 text-sm font-medium text-pine">
                Time for your 2-week check-in
              </p>
            ) : (
              <p className="font-mono text-[11px] uppercase tracking-label text-ink-soft">
                Next check-in in {nextIn} day{nextIn === 1 ? "" : "s"}
              </p>
            )}
            {checkins.length > 0 && (
              <ShareButton personId={personId} kind="progress" label="Share progress" />
            )}
          </div>
        </div>

        <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
          {/* Before / after — or the baseline while there's nothing to compare. */}
          <div>
            {baselinePhoto && latest?.photos[0] ? (
              <>
                <CompareSlider
                  leftSrc={baselinePhoto}
                  rightSrc={latest.photos[0]}
                  leftLabel={`Day 0 · ${fmtDate(baseMs)}`}
                  rightLabel={`Now · ${fmtDate(latest.ts)}`}
                  alt="Progress comparison"
                />
                <p className="mt-3 text-center font-mono text-[10px] uppercase tracking-label text-ink-soft">
                  Drag to compare · your own photos, never a morph
                </p>
              </>
            ) : baselinePhoto ? (
              <div className="overflow-hidden rounded-2xl bg-panel">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photoUrl(baselinePhoto)}
                  alt="Your baseline"
                  className="aspect-[4/5] w-full object-cover"
                />
              </div>
            ) : (
              <div className="flex aspect-[4/5] items-center justify-center rounded-2xl border border-dashed border-line bg-panel/40 text-sm text-ink-soft">
                Add a check-in to start your timeline
              </div>
            )}
          </div>

          {/* Cadence + history + add. */}
          <div className="flex flex-col">
            <div className="mb-5">{addButton}</div>

            <ol className="divide-y divide-line border-t border-line">
              {[
                { ts: baseMs, photos: baselinePhoto ? [baselinePhoto] : [], base: true },
                ...checkins.map((c) => ({ ts: c.ts, photos: c.photos, base: false })),
              ]
                .sort((a, b) => b.ts - a.ts)
                .map((entry) => (
                  <li key={entry.ts} className="flex items-center gap-4 py-4">
                    <div className="flex -space-x-2">
                      {entry.photos.slice(0, 3).map((p) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={p}
                          src={photoUrl(p)}
                          alt=""
                          className="h-11 w-11 rounded-lg border-2 border-surface object-cover"
                        />
                      ))}
                      {entry.photos.length === 0 && (
                        <div className="h-11 w-11 rounded-lg border border-line bg-panel/40" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-ink">
                        {entry.base ? "Baseline" : "Check-in"}
                        <span className="ml-2 font-normal text-ink-soft">
                          {fmtDate(entry.ts)}
                        </span>
                      </p>
                      <p className="font-mono text-[10px] uppercase tracking-label text-ink-soft">
                        {entry.base
                          ? "Where you started"
                          : `${Math.max(0, Math.round((entry.ts - baseMs) / DAY))} days in · ${entry.photos.length} photo${entry.photos.length === 1 ? "" : "s"}`}
                      </p>
                    </div>
                  </li>
                ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}

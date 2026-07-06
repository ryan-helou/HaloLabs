"use client";

import { useState } from "react";
import { track } from "@/lib/track";
import { useToast } from "./Toast";

/**
 * Mints (or reuses) a public share link for this person and hands it to the OS
 * share sheet on mobile — the UGC audience — or the clipboard on desktop. The
 * link points at /s/<token>, a PII-safe card whose CTA carries attribution back
 * into the funnel. Opt-in and revocable server-side; nothing is shared until the
 * user taps this.
 */
export default function ShareButton({
  personId,
  kind = "plan",
  label,
  className,
}: {
  personId: string;
  kind?: "plan" | "progress";
  label?: string;
  className?: string;
}) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);

  async function onShare() {
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/person/${encodeURIComponent(personId)}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind }),
      });
      const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        toast({ kind: "error", message: data.error || "Couldn't create a share link." });
        return;
      }
      track("share_created", { kind });

      const shareData = {
        title: kind === "progress" ? "My HaloLabs progress" : "My HaloLabs plan",
        text:
          kind === "progress"
            ? "My progress on HaloLabs — no scores, just the plan."
            : "My personalized plan from HaloLabs — no scores, just specific moves.",
        url: data.url,
      };

      if (typeof navigator !== "undefined" && navigator.share) {
        try {
          await navigator.share(shareData);
          return;
        } catch {
          /* user cancelled the sheet, or it failed — fall through to copy */
        }
      }
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(data.url);
        toast({ kind: "success", message: "Share link copied — paste it anywhere." });
      } else {
        toast({ kind: "info", message: data.url });
      }
    } catch {
      toast({ kind: "error", message: "Couldn't create a share link. Try again." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={onShare}
      disabled={loading}
      className={
        className ??
        "inline-flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-2 text-[13.5px] font-medium text-ink transition-colors hover:border-pine hover:text-pine disabled:opacity-60"
      }
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="18" cy="5" r="3" />
        <circle cx="6" cy="12" r="3" />
        <circle cx="18" cy="19" r="3" />
        <path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4" />
      </svg>
      {loading ? "Creating…" : label ?? (kind === "progress" ? "Share progress" : "Share plan")}
    </button>
  );
}

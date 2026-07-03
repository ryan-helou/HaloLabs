"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "./Toast";

/**
 * A restrained per-profile delete affordance for the profiles roster. Collapsed
 * it's a small trash icon (revealed on card hover); clicking asks for
 * confirmation inline before the irreversible DELETE. Sits on top of the card
 * link as a sibling, so it never nests interactive elements.
 */
export default function DeletePersonButton({
  personId,
  name,
}: {
  personId: string;
  name: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  async function remove() {
    setBusy(true);
    try {
      const res = await fetch(`/api/person/${encodeURIComponent(personId)}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast({ kind: "error", message: data.error || "Couldn't delete that profile." });
        setBusy(false);
        setConfirming(false);
        return;
      }
      toast({ kind: "success", message: `Deleted ${name} and its photos.` });
      router.refresh();
    } catch {
      toast({ kind: "error", message: "Couldn't reach the server. Please try again." });
      setBusy(false);
      setConfirming(false);
    }
  }

  if (confirming) {
    return (
      <div className="absolute right-3 top-3 z-10 flex items-center gap-1 rounded-full border border-line bg-surface/95 px-1.5 py-1 shadow-float backdrop-blur-md">
        <span className="px-1.5 text-xs font-medium text-ink">Delete?</span>
        <button
          type="button"
          disabled={busy}
          onClick={remove}
          className="rounded-full bg-clay px-3 py-1 text-xs font-medium text-paper transition-colors hover:bg-clay/90 disabled:opacity-60"
        >
          {busy ? "…" : "Delete"}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => setConfirming(false)}
          aria-label="Cancel"
          className="rounded-full px-2 py-1 text-xs text-ink-soft transition-colors hover:text-ink"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      aria-label={`Delete ${name}`}
      className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-line bg-surface/80 text-ink-soft opacity-0 shadow-card backdrop-blur-md transition-all hover:border-clay/50 hover:text-clay focus:opacity-100 focus-visible:opacity-100 group-hover:opacity-100"
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m3 0v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6M10 11v6M14 11v6" />
      </svg>
    </button>
  );
}

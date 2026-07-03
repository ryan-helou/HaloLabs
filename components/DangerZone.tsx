"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { useToast } from "./Toast";

/**
 * Account deletion — the "delete your entire account at any time" half of the
 * privacy promise. Deliberately unglamorous and two-step: it explains exactly
 * what goes, then requires an explicit confirm before the irreversible POST.
 * On success it signs out (clearing the JWT cookie) and lands on the homepage.
 */
export default function DangerZone() {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function deleteAccount() {
    setBusy(true);
    try {
      const res = await fetch("/api/account/delete", { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast({ kind: "error", message: data.error || "Couldn't delete your account." });
        setBusy(false);
        return;
      }
      // Clear the session cookie and leave.
      await signOut({ callbackUrl: "/" });
    } catch {
      toast({ kind: "error", message: "Couldn't reach the server. Please try again." });
      setBusy(false);
    }
  }

  return (
    <div className="mt-16 rounded-2xl border border-line bg-surface p-6 sm:p-7">
      <p className="eyebrow">Danger zone</p>
      <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-xl">
          <h3 className="text-[15px] font-semibold text-ink">Delete your account</h3>
          <p className="mt-1 text-sm leading-relaxed text-ink-soft">
            Permanently removes every profile, all photos from storage, your
            plans, and your account — and cancels any active membership. This
            can&apos;t be undone.
          </p>
        </div>
        {!open ? (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="shrink-0 rounded-full border border-clay/40 px-5 py-2.5 text-sm font-medium text-clay transition-colors hover:bg-clay-soft"
          >
            Delete account
          </button>
        ) : (
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={deleteAccount}
              className="rounded-full bg-clay px-5 py-2.5 text-sm font-medium text-paper transition-colors hover:bg-clay/90 disabled:opacity-60"
            >
              {busy ? "Deleting…" : "Yes, delete everything"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setOpen(false)}
              className="rounded-full px-4 py-2.5 text-sm font-medium text-ink-soft transition-colors hover:text-ink"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

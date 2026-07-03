"use client";

import { signOut } from "next-auth/react";

/** Ends the session and returns to the public landing page. */
export default function SignOutButton({
  className,
}: {
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/" })}
      className={
        className ??
        "rounded-full px-4 py-2 text-sm font-medium text-ink-soft transition-colors hover:text-ink"
      }
    >
      Log out
    </button>
  );
}

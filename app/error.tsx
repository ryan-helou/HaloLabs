"use client";

import { useEffect } from "react";
import Link from "next/link";

/**
 * Route-level error boundary. Keeps a crash inside the branded shell (Header +
 * footer come from the layout) with a way to retry or get out, instead of the
 * framework's raw error page.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surfaces in the server/console logs for debugging.
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto mt-10 max-w-md rounded-2xl border border-clay/40 bg-clay-soft px-8 py-16 text-center">
      <p className="eyebrow text-clay">Something went wrong</p>
      <h1 className="mt-3 font-display text-3xl font-medium tracking-tight text-ink">
        That didn&apos;t load.
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-ink-soft">
        A hiccup on our end — your photos and plan are safe. Try again, and if it
        keeps happening, head back to your profiles.
      </p>
      <div className="mt-7 flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-full bg-pine px-6 py-3 text-sm font-medium text-paper shadow-float transition-colors hover:bg-pine-deep"
        >
          Try again
        </button>
        <Link
          href="/profiles"
          className="rounded-full border border-line bg-surface px-6 py-3 text-sm font-medium text-ink-soft transition-colors hover:text-ink"
        >
          Your profiles
        </Link>
      </div>
    </div>
  );
}

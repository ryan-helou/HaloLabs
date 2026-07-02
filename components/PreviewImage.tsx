"use client";

import { useEffect, useState } from "react";
import { photoUrl } from "@/lib/photo";

/**
 * An "after" preview attached to a suggestion: a labeled thumbnail that opens
 * a lightbox. The label makes clear it's an illustrative render, not a photo.
 */
export default function PreviewImage({
  src,
  alt,
}: {
  src: string;
  alt: string;
}) {
  const [open, setOpen] = useState(false);
  const url = photoUrl(src);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <figure className="shrink-0">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group relative block h-28 w-24 overflow-hidden rounded-xl border border-line bg-chip focus:outline-none focus:ring-2 focus:ring-pine"
        aria-label="Enlarge preview"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt={alt}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.05]"
        />
        <figcaption className="absolute inset-x-0 bottom-0 bg-ink/70 py-0.5 text-center font-mono text-[9px] uppercase tracking-[0.08em] text-paper">
          Example
        </figcaption>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/85 p-4 backdrop-blur-sm"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label={alt}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt={alt}
            className="max-h-full max-w-full rounded-xl object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="absolute right-5 top-5 rounded-full bg-paper px-4 py-1.5 font-mono text-xs uppercase tracking-[0.08em] text-ink hover:bg-white"
          >
            Close
          </button>
        </div>
      )}
    </figure>
  );
}

"use client";

import { useEffect, useState } from "react";
import { photoUrl } from "@/lib/photo";

export default function PhotoGallery({
  photos,
  displayName,
}: {
  photos: string[];
  displayName: string;
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  useEffect(() => {
    if (openIndex === null) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpenIndex(null);
      if (e.key === "ArrowRight") setOpenIndex((i) => (i === null ? i : (i + 1) % photos.length));
      if (e.key === "ArrowLeft")
        setOpenIndex((i) => (i === null ? i : (i - 1 + photos.length) % photos.length));
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openIndex, photos.length]);

  if (photos.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-line px-6 py-10 text-center text-sm text-ink-soft">
        No photos on file.
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
        {photos.map((p, i) => (
          <button
            key={p}
            type="button"
            onClick={() => setOpenIndex(i)}
            className="group aspect-[3/4] overflow-hidden rounded-xl border border-line bg-chip focus:outline-none focus:ring-2 focus:ring-pine"
            aria-label={`Enlarge photo ${i + 1}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photoUrl(p)}
              alt={`${displayName}, photo ${i + 1}`}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
            />
          </button>
        ))}
      </div>

      {openIndex !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/85 p-4 backdrop-blur-sm"
          onClick={() => setOpenIndex(null)}
          role="dialog"
          aria-modal="true"
          aria-label={`${displayName}, enlarged photo`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photoUrl(photos[openIndex])}
            alt={`${displayName}, enlarged`}
            className="max-h-full max-w-full rounded-xl object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            type="button"
            onClick={() => setOpenIndex(null)}
            className="absolute right-5 top-5 rounded-full bg-paper px-4 py-1.5 font-mono text-xs uppercase tracking-[0.08em] text-ink hover:bg-white"
          >
            Close
          </button>
        </div>
      )}
    </>
  );
}

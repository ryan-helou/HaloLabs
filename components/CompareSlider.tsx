"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { photoUrl } from "@/lib/photo";

/**
 * A draggable before/after image comparison. The right image is revealed by a
 * vertical divider you drag (pointer or keyboard). Corner labels name each side.
 */
export default function CompareSlider({
  leftSrc,
  rightSrc,
  leftLabel,
  rightLabel,
  alt,
}: {
  leftSrc: string;
  rightSrc: string;
  leftLabel: string;
  rightLabel: string;
  alt: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState(50);
  const [dragging, setDragging] = useState(false);
  const draggingRef = useRef(false);

  const setDrag = useCallback((v: boolean) => {
    draggingRef.current = v;
    setDragging(v);
  }, []);

  const setFromClientX = useCallback((clientX: number) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const p = ((clientX - rect.left) / rect.width) * 100;
    setPos(Math.max(0, Math.min(100, p)));
  }, []);

  useEffect(() => {
    function onMove(e: PointerEvent) {
      if (draggingRef.current) setFromClientX(e.clientX);
    }
    function onUp() {
      setDrag(false);
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [setFromClientX, setDrag]);

  return (
    <div
      ref={ref}
      onPointerDown={(e) => {
        setDrag(true);
        setFromClientX(e.clientX);
      }}
      className={`group relative aspect-[4/5] w-full select-none overflow-hidden rounded-2xl bg-panel ${
        dragging ? "cursor-grabbing" : "cursor-ew-resize"
      }`}
    >
      {/* Left (base) image */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photoUrl(leftSrc)}
        alt={alt}
        draggable={false}
        className="absolute inset-0 h-full w-full object-cover"
      />
      {/* Right image, clipped to the right of the divider */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photoUrl(rightSrc)}
        alt=""
        aria-hidden
        draggable={false}
        className="absolute inset-0 h-full w-full object-cover"
        style={{ clipPath: `inset(0 0 0 ${pos}%)` }}
      />

      {/* Corner labels — blurred mono chips */}
      <span className="panel-label left-3 top-3 rounded-full border border-white/40 bg-surface/60 px-2.5 py-1 backdrop-blur-sm">
        {leftLabel}
      </span>
      <span className="panel-label right-3 top-3 rounded-full border border-white/40 bg-surface/60 px-2.5 py-1 backdrop-blur-sm">
        {rightLabel}
      </span>

      {/* Divider + handle */}
      <div
        className="absolute inset-y-0 z-20 w-0.5 -translate-x-1/2 bg-white/90 shadow-[0_0_0_1px_rgba(23,25,28,0.10),0_0_18px_rgba(255,255,255,0.45)]"
        style={{ left: `${pos}%` }}
      >
        <button
          type="button"
          aria-label="Drag to compare"
          aria-valuenow={Math.round(pos)}
          aria-valuemin={0}
          aria-valuemax={100}
          role="slider"
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft") setPos((p) => Math.max(0, p - 4));
            if (e.key === "ArrowRight") setPos((p) => Math.min(100, p + 4));
          }}
          onPointerDown={(e) => {
            e.stopPropagation();
            setDrag(true);
          }}
          className={`absolute left-1/2 top-1/2 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center gap-[3px] rounded-full border border-line bg-surface/95 text-ink shadow-float backdrop-blur-sm transition-transform duration-150 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-pine ${
            dragging ? "scale-95 cursor-grabbing" : "cursor-grab"
          }`}
        >
          {/* Dual outward chevrons signal horizontal drag */}
          <svg
            aria-hidden
            viewBox="0 0 24 24"
            className="h-3.5 w-3.5 text-ink/70"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.25}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M14 6 8 12l6 6" />
          </svg>
          <svg
            aria-hidden
            viewBox="0 0 24 24"
            className="h-3.5 w-3.5 text-ink/70"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.25}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M10 6l6 6-6 6" />
          </svg>
        </button>
      </div>
    </div>
  );
}

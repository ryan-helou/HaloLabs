"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Marketing before/after slider for the landing hero. Shows a real edited
 * pair of the same face — `beforeSrc` on the left of the divider, `afterSrc`
 * revealed to the right. Ornamental only.
 */
export default function LandingCompare({
  beforeSrc,
  afterSrc,
  alt,
  leftLabel = "Before",
  rightLabel = "Projection",
  start = 50,
}: {
  beforeSrc: string;
  afterSrc: string;
  alt: string;
  leftLabel?: string;
  rightLabel?: string;
  start?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState(start);
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
      className={`relative aspect-[12/15] w-full select-none overflow-hidden rounded-lg bg-panel ${
        dragging ? "cursor-grabbing" : "cursor-ew-resize"
      }`}
    >
      {/* Base = "before". */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={beforeSrc}
        alt={alt}
        draggable={false}
        className="absolute inset-0 h-full w-full scale-[1.1] object-cover object-top [transform-origin:top]"
      />
      {/* Top = "projection" — revealed to the right of the divider. The clip
          lives on an unscaled wrapper so its edge tracks the divider exactly. */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{ clipPath: `inset(0 0 0 ${pos}%)` }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={afterSrc}
          alt=""
          draggable={false}
          className="absolute inset-0 h-full w-full scale-[1.1] object-cover object-top [transform-origin:top]"
        />
      </div>

      {/* Corner labels. */}
      <span className="panel-label left-3 top-3 tracking-[0.18em] text-white/85 [text-shadow:0_1px_3px_rgba(0,0,0,0.4)]">
        {leftLabel}
      </span>
      <span className="panel-label right-3 top-3 tracking-[0.18em] text-white/85 [text-shadow:0_1px_3px_rgba(0,0,0,0.4)]">
        {rightLabel}
      </span>

      {/* Divider + handle. */}
      <div
        className="absolute inset-y-0 z-20 w-[0.5px] -translate-x-1/2 bg-white/80"
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
          className={`absolute left-1/2 top-1/2 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center gap-[3px] rounded-full border border-line bg-surface/95 text-ink shadow-float backdrop-blur-sm transition-transform duration-150 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-pine ${
            dragging ? "scale-95 cursor-grabbing" : "cursor-grab"
          }`}
        >
          <svg aria-hidden viewBox="0 0 24 24" className="h-3 w-3 text-ink/70" fill="none" stroke="currentColor" strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 6 8 12l6 6" />
          </svg>
          <svg aria-hidden viewBox="0 0 24 24" className="h-3 w-3 text-ink/70" fill="none" stroke="currentColor" strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 6l6 6-6 6" />
          </svg>
        </button>
      </div>
    </div>
  );
}

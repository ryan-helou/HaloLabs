import type { AdviceCategory } from "@/lib/types";

/**
 * Minimal, single-stroke line icons per advice category — kept schematic and
 * uniform (24px viewBox, currentColor stroke) to sit next to the mono labels
 * without competing with the photography.
 */
const PATHS: Record<AdviceCategory, React.ReactNode> = {
  // Hair — a swept crown of strands.
  hair: (
    <>
      <path d="M4 14a8 8 0 0 1 16 0" />
      <path d="M7 14c0-3 1-5 3-6M12 14c0-4 1-6 2.5-7M17 14c0-2-.5-3.5-1.5-4.5" />
    </>
  ),
  // Skin — a droplet (routine / hydration).
  skin: (
    <>
      <path d="M12 3.5c3.5 4.2 5.5 7 5.5 9.7a5.5 5.5 0 0 1-11 0c0-2.7 2-5.5 5.5-9.7Z" />
      <path d="M9.5 14a2.5 2.5 0 0 0 2.5 2.5" />
    </>
  ),
  // Style — a collared top.
  style: (
    <>
      <path d="M8 4l4 3 4-3 4 3-2.5 2.5L16 8v12H8V8l-1.5 1.5L4 7l4-3Z" />
      <path d="M8 4l4 3 4-3" />
    </>
  ),
  // Fitness — a simple dumbbell.
  fitness: (
    <>
      <path d="M6.5 8v8M4 9.5v5M17.5 8v8M20 9.5v5" />
      <path d="M6.5 12h11" />
    </>
  ),
};

export default function CategoryIcon({
  category,
  className = "h-4 w-4",
  color,
}: {
  category: AdviceCategory;
  className?: string;
  color?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke={color ?? "currentColor"}
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {PATHS[category]}
    </svg>
  );
}

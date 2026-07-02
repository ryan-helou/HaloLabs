import type { Level } from "@/lib/types";
import { strengthFor, type BadgeKind, type Strength } from "@/lib/badges";

const KIND_LABEL: Record<BadgeKind, string> = {
  impact: "Impact",
  effort: "Effort",
  cost: "Cost",
};

const STRENGTH_CLASSES: Record<Strength, string> = {
  strong: "bg-pine text-paper",
  soft: "bg-sage text-pine-deep",
  muted: "bg-chip text-ink-soft",
};

const DOTS: Record<Strength, number> = { strong: 3, soft: 2, muted: 1 };

/**
 * A favorability chip: color and a 3-dot meter encode how good this level is
 * for this tag (darker + fuller = more favorable). Reading them takes a glance.
 */
export default function TagBadge({
  kind,
  level,
}: {
  kind: BadgeKind;
  level: Level;
}) {
  const strength = strengthFor(kind, level);
  const filled = DOTS[strength];

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 font-mono text-[11px] ${STRENGTH_CLASSES[strength]}`}
      title={`${KIND_LABEL[kind]}: ${level}`}
    >
      <span className="uppercase tracking-[0.08em]">{KIND_LABEL[kind]}</span>
      <span aria-hidden className="flex items-center gap-0.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className={`h-1.5 w-1.5 rounded-full bg-current ${
              i < filled ? "" : "opacity-25"
            }`}
          />
        ))}
      </span>
      <span className="capitalize opacity-90">{level}</span>
    </span>
  );
}

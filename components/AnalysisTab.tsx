import type { Observations, Person } from "@/lib/types";
import { ADVICE_CATEGORIES } from "@/lib/types";
import { CATEGORY_META } from "@/lib/categories";
import { byImpact } from "@/lib/badges";
import type { FlatSuggestion } from "@/lib/plan";
import SuggestionRow from "./SuggestionRow";
import LockedSection from "./LockedSection";

/**
 * The Analysis tab — the reference, for when the reader wants to go deep. Every
 * move in full (why it's for you, how, what to use, timelines), grouped by area
 * and ordered by impact, plus the neutral photo observations every suggestion
 * was built from. No scatter map, no numbered "acts" — just the detail, quiet
 * and browsable, one tap per move.
 */

const OBSERVATION_FIELDS: { key: keyof Observations; label: string }[] = [
  { key: "faceShape", label: "Face shape" },
  { key: "hair", label: "Hair" },
  { key: "skin", label: "Skin" },
  { key: "facialHair", label: "Facial hair" },
];

export default function AnalysisTab({
  person,
  locked = false,
  free,
}: {
  person: Person;
  /** Behind the paywall: reveal one move, blur the rest of the detail. */
  locked?: boolean;
  free?: FlatSuggestion;
}) {
  const extras = person.observations?.extras ?? [];
  const observationRows: { label: string; text: string }[] = [
    ...OBSERVATION_FIELDS.map(({ key, label }) => {
      const value = person.observations?.[key];
      return { label, text: typeof value === "string" ? value.trim() : "" };
    }).filter((r) => r.text),
    ...extras.map(({ label, note }) => ({ label, text: note })),
    ...(person.observations?.generalNotes?.trim()
      ? [{ label: "Notes", text: person.observations.generalNotes.trim() }]
      : []),
  ];

  const groups = ADVICE_CATEGORIES.map((cat) => ({
    cat,
    items: byImpact(person.advice[cat] ?? []),
  })).filter((g) => g.items.length > 0);

  return (
    <section className="mx-auto max-w-[760px] px-5 pb-16 pt-10 sm:px-6">
      <div className="max-w-[52ch]">
        <h2 className="font-display text-2xl font-medium tracking-tight text-ink sm:text-[28px]">
          Every move, in full
        </h2>
        <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">
          The complete detail behind the plan — why each move is for you, how to
          do it, and what to use. Tap any one to open it. Ordered by how much it
          tends to help; the tags describe the move, never you.
        </p>
      </div>

      {locked && free && (
        <div className="mt-6 rounded-2xl border border-line bg-sage/40 p-4 sm:p-5">
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <p className="text-[12px] font-semibold uppercase tracking-[0.05em] text-pine">
              One move, in full
            </p>
            <span className="text-[12px] text-ink-soft">The rest unlocks below</span>
          </div>
          <SuggestionRow suggestion={free.suggestion} defaultOpen />
        </div>
      )}

      <MaybeLocked locked={locked} note="The full detail behind every move">
        <div className="mt-9 grid gap-10">
          {groups.map(({ cat, items }) => (
            <div key={cat}>
              <div className="flex items-baseline gap-3">
                <span aria-hidden className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: CATEGORY_META[cat].color }} />
                <h3 className="font-display text-lg font-medium text-ink">{CATEGORY_META[cat].label}</h3>
                <span className="text-[13px] tabular-nums text-ink-soft">
                  {items.length} {items.length === 1 ? "move" : "moves"}
                </span>
              </div>
              <div className="mt-4 grid gap-2.5">
                {items.map((s, i) => (
                  <SuggestionRow key={s.id ?? `${cat}-${i}`} suggestion={s} anchorId={s.id ?? `${cat}-${i}`} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </MaybeLocked>

      {/* What your photos show — the raw material, quiet at the bottom. */}
      {observationRows.length > 0 && (
        <div className="mt-12 border-t border-line pt-9">
          <h3 className="font-display text-lg font-medium text-ink">What your photos show</h3>
          <p className="mt-1.5 max-w-[52ch] text-[14px] leading-relaxed text-ink-soft">
            Neutral notes on what&apos;s actually visible — the raw material every
            move above was built from.
          </p>
          <dl className="mt-5 overflow-hidden rounded-2xl border border-line bg-surface">
            {observationRows.map(({ label, text }) => (
              <div key={label} className="grid gap-1 border-t border-line px-5 py-4 first:border-t-0 sm:grid-cols-[130px_1fr] sm:gap-6">
                <dt className="text-[12px] font-semibold uppercase tracking-[0.05em] text-ink-soft sm:pt-0.5">{label}</dt>
                <dd className="text-[14.5px] leading-relaxed text-ink">{text}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </section>
  );
}

/** Blurs its children behind the paywall when locked; passthrough otherwise. */
function MaybeLocked({
  locked,
  note,
  children,
}: {
  locked: boolean;
  note: string;
  children: React.ReactNode;
}) {
  if (!locked) return <>{children}</>;
  return <LockedSection note={note}>{children}</LockedSection>;
}

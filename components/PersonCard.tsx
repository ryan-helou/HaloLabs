import Link from "next/link";
import type { Person } from "@/lib/types";
import { ADVICE_CATEGORIES } from "@/lib/types";
import { isQuickWin } from "@/lib/badges";
import { photoUrl } from "@/lib/photo";

const CATEGORY_LABEL: Record<string, string> = {
  hair: "Hair",
  skin: "Skin",
  style: "Style",
  fitness: "Fitness",
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function PersonCard({ person }: { person: Person }) {
  const thumb = person.photos[0];
  const totalIdeas = ADVICE_CATEGORIES.reduce(
    (n, c) => n + (person.advice[c]?.length ?? 0),
    0
  );
  const quickWins = ADVICE_CATEGORIES.reduce(
    (n, c) => n + (person.advice[c] ?? []).filter(isQuickWin).length,
    0
  );

  return (
    <Link
      href={`/person/${encodeURIComponent(person.id)}`}
      className="group flex gap-5 rounded-2xl border border-line bg-surface p-4 shadow-card transition-colors hover:border-pine focus:outline-none focus:ring-2 focus:ring-pine"
    >
      <div className="h-28 w-24 shrink-0 overflow-hidden rounded-xl bg-panel">
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photoUrl(thumb)}
            alt={person.displayName}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.05]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center font-mono text-[10px] uppercase tracking-[0.08em] text-ink-soft">
            No photo
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1 py-1">
        <h2 className="font-display text-xl leading-tight text-ink">
          {person.displayName}
        </h2>
        <p className="eyebrow mt-1">
          {person.photoCount} {person.photoCount === 1 ? "photo" : "photos"} ·{" "}
          {formatDate(person.analyzedAt)}
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-soft">
          <span>
            <span className="font-semibold text-ink">{totalIdeas}</span> ideas
          </span>
          {quickWins > 0 && (
            <span className="rounded-full bg-clay-soft px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em] text-clay">
              {quickWins} quick
            </span>
          )}
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {ADVICE_CATEGORIES.map((cat) => (
            <span
              key={cat}
              className="rounded-full bg-chip px-2 py-0.5 font-mono text-[10px] text-ink-soft"
            >
              {CATEGORY_LABEL[cat]} {person.advice[cat]?.length ?? 0}
            </span>
          ))}
        </div>
      </div>
    </Link>
  );
}

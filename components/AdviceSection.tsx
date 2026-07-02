import type { AdviceCategory, Level } from "@/lib/types";
import { isQuickWin } from "@/lib/badges";
import type { MatrixItem } from "./AdviceMatrix";
import SuggestionRow from "./SuggestionRow";
import CategoryIcon from "./CategoryIcon";

const RANK: Record<Level, number> = { high: 2, medium: 1, low: 0 };

export default function AdviceSection({
  cat,
  title,
  color,
  items,
  sortByImpact,
}: {
  cat: AdviceCategory;
  title: string;
  color: string;
  items: MatrixItem[];
  sortByImpact: boolean;
}) {
  const ordered = sortByImpact
    ? [...items].sort(
        (a, b) =>
          RANK[b.s.impact] - RANK[a.s.impact] ||
          Number(isQuickWin(b.s)) - Number(isQuickWin(a.s))
      )
    : items;
  const quickWins = items.filter((it) => isQuickWin(it.s)).length;

  return (
    <section className="scroll-mt-24" id={title.toLowerCase()}>
      <div className="mb-4 flex items-baseline gap-3 border-b border-line pb-3">
        <span
          className="flex h-8 w-8 shrink-0 self-center items-center justify-center rounded-lg"
          style={{ backgroundColor: `${color}1A`, color }}
          aria-hidden
        >
          <CategoryIcon category={cat} className="h-[18px] w-[18px]" />
        </span>
        <h3 className="font-display text-2xl text-ink">{title}</h3>
        <span className="ml-auto eyebrow">
          {items.length} {items.length === 1 ? "idea" : "ideas"}
          {quickWins > 0 && <span className="ml-2 text-clay">· {quickWins} quick</span>}
        </span>
      </div>

      {ordered.length === 0 ? (
        <p className="border border-dashed border-line px-5 py-6 text-sm text-ink-soft">
          Nothing flagged here — the photos didn&apos;t suggest anything for{" "}
          {title.toLowerCase()}.
        </p>
      ) : (
        <div className="space-y-3">
          {ordered.map((it) => (
            <SuggestionRow key={it.id} anchorId={`sug-${it.id}`} suggestion={it.s} />
          ))}
        </div>
      )}
    </section>
  );
}

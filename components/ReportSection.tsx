/**
 * One numbered act of the report — the Qoves framed split: a left rail with
 * the bracket numeral, two-tone heading, and blurb; content on the right
 * behind a hairline divider. Acts stack flush with border-t so the report
 * reads as one continuous framed document (the page adds the final border-b).
 *
 * Content renders edge-to-edge so acts can run their own divided grids
 * (divide-x columns, divide-y rows) out to the frame; pad inside if needed.
 *
 * When `lockedContent` is set, the header/numeral/blurb rail stays sharp and
 * only the content column is blurred behind the paywall (see LockedSection).
 */
import LockedSection from "./LockedSection";

export default function ReportSection({
  num,
  titleA,
  titleB,
  blurb,
  rail,
  id,
  children,
  lockedContent = false,
  lockNote,
}: {
  num: string;
  titleA: string;
  titleB: string;
  blurb?: React.ReactNode;
  /** Pinned to the bottom of the rail, Qoves-style (legend, links, progress). */
  rail?: React.ReactNode;
  id?: string;
  children: React.ReactNode;
  /** Blur + disable the content column behind the paywall. */
  lockedContent?: boolean;
  /** Short line for the lock chip when locked. */
  lockNote?: string;
}) {
  return (
    <section id={id} className="scroll-mt-24 border-t border-line">
      <div className="mx-auto grid max-w-[1300px] border-line lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] lg:border-x">
        <div className="border-b border-line px-6 py-10 sm:px-10 lg:border-b-0 lg:border-r lg:py-12">
          {/* Sticky so the numeral + heading stay in view while a long
              content column (protocol, roadmap) scrolls past. */}
          <div className="lg:sticky lg:top-24">
            <p className="font-mono text-xs text-ink-soft">[{num}]</p>
            <h2 className="mt-5 font-display text-3xl font-medium leading-[1.08] tracking-tight text-ink sm:text-4xl">
              {titleA}
              <br />
              <span className="text-pine">{titleB}</span>
            </h2>
            {blurb && (
              <p className="mt-5 max-w-sm text-[15px] leading-relaxed text-ink-soft">
                {blurb}
              </p>
            )}
            {rail && <div className="mt-8">{rail}</div>}
          </div>
        </div>
        <div className="min-w-0">
          {lockedContent ? (
            <LockedSection note={lockNote}>{children}</LockedSection>
          ) : (
            children
          )}
        </div>
      </div>
    </section>
  );
}

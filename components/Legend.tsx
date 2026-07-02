/**
 * Explains how to read the favorability chips and the Quick win flag.
 * Darker + fuller always means "more favorable": high impact, but low
 * effort and low cost. Rendered plain (no card chrome) so it can sit in a
 * report-section rail.
 */
export default function Legend() {
  return (
    <div className="border-t border-line pt-5">
      <p className="eyebrow mb-3">Reading the tags</p>
      <div className="space-y-2.5 text-sm text-ink-soft">
        <div className="flex items-center gap-2.5">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-pine" />
          <span>
            <span className="font-medium text-ink">Filled green</span> = the
            favorable end: high impact, low effort, low cost.
          </span>
        </div>
        <div className="flex items-center gap-2.5">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-chip ring-1 ring-line" />
          <span>
            <span className="font-medium text-ink">Muted</span> = the costly end:
            low impact, or high effort / cost.
          </span>
        </div>
        <div className="flex items-center gap-2.5">
          <span className="shrink-0 rounded-full bg-clay-soft px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em] text-clay">
            Quick win
          </span>
          <span>Real impact you can start today — cheap and easy.</span>
        </div>
      </div>
    </div>
  );
}

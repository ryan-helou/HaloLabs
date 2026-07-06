import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { loadShareProjection } from "@/lib/share";

export const dynamic = "force-dynamic";

/**
 * Public share page. Shows only the PII-safe projection (neutral counts,
 * composition, progress delta) and a CTA into the free funnel that carries
 * attribution (utm_source=share) — so shares show up as their own campaign and
 * the loop closes. Never exposes photos, names, or the written plan.
 */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  const p = await loadShareProjection(token);
  const title =
    p?.kind === "progress" && p.progress
      ? `Week ${p.progress.weekN} of my HaloLabs plan`
      : "My HaloLabs plan";
  const description =
    p?.kind === "progress" && p.progress
      ? `${p.progress.movesDone} of ${p.progress.total} moves done — no scores, no rankings.`
      : p
      ? `${p.totalMoves} moves · ${p.quickWins} quick wins — a personalized plan from my own photos.`
      : "A personalized plan from my own photos.";
  return {
    title,
    description,
    openGraph: { title, description },
    twitter: { card: "summary_large_image", title, description },
  };
}

function Stat({ n, label }: { n: number; label: string }) {
  return (
    <div className="flex flex-col">
      <span className="font-display text-4xl font-semibold text-ink">{n}</span>
      <span className="mt-1 font-mono text-[11px] uppercase tracking-label text-ink-soft">
        {label}
      </span>
    </div>
  );
}

export default async function SharePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const p = await loadShareProjection(token);
  if (!p) notFound();

  const isProgress = p.kind === "progress" && p.progress;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="rounded-3xl border border-line bg-surface p-8 shadow-card sm:p-10">
        <p className="font-mono text-[11px] uppercase tracking-label text-pine">
          HaloLabs / shared {p.kind === "progress" ? "progress" : "plan"}
        </p>

        <h1 className="mt-3 font-display text-3xl font-semibold leading-tight text-ink sm:text-4xl">
          {isProgress ? `Week ${p.progress!.weekN} of the plan` : "A personalized grooming plan"}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          Built by Claude from real photos. No scores, no rankings — just a
          prioritized list of specific, reversible moves.
        </p>

        {/* neutral stat row */}
        <div className="mt-8 flex flex-wrap gap-10">
          {isProgress ? (
            <>
              <Stat n={p.progress!.movesDone} label="moves done" />
              <Stat n={p.progress!.total} label="total moves" />
              <Stat n={p.progress!.checkins} label="check-ins" />
            </>
          ) : (
            <>
              <Stat n={p.totalMoves} label="moves" />
              <Stat n={p.quickWins} label="quick wins" />
              <Stat n={p.phaseTitles.length || 3} label="phases" />
            </>
          )}
        </div>

        {/* composition bar */}
        {p.focus.length > 0 && (
          <div className="mt-8">
            <p className="font-mono text-[11px] uppercase tracking-label text-ink-soft">
              What the plan is made of
            </p>
            <div className="mt-3 flex h-4 w-full overflow-hidden rounded-full">
              {p.focus.map((f) => (
                <div
                  key={f.label}
                  style={{ width: `${Math.max(6, Math.round(f.share * 100))}%`, background: f.color }}
                  title={`${f.label} · ${f.count}`}
                />
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1">
              {p.focus.map((f) => (
                <span key={f.label} className="flex items-center gap-2 text-xs text-ink-soft">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: f.color }} />
                  {f.label} · {f.count}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* the loop: CTA into the free funnel, carrying attribution */}
      <div className="mt-6 rounded-3xl border border-line bg-panel/10 p-8 text-center">
        <p className="text-lg font-semibold text-ink">Want your own?</p>
        <p className="mt-1 text-sm text-ink-soft">
          Free scan from your own photos in a couple of minutes. 18+.
        </p>
        <a
          href="/start?utm_source=share&utm_campaign=user_share"
          className="mt-5 inline-flex items-center justify-center rounded-full bg-ink px-7 py-3 text-sm font-medium text-paper transition-opacity hover:opacity-90"
        >
          Start my free scan
        </a>
      </div>

      <p className="mt-6 text-center text-xs text-ink-soft">
        Shared voluntarily by a HaloLabs user. No photos or personal details are
        shown here.
      </p>
    </div>
  );
}

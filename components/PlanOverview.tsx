import type { Person } from "@/lib/types";

/**
 * The plan's cover letter — a dark full-bleed split band in the landing
 * page's "Get your personalized plan" pattern: eyebrow pill, two-tone
 * heading, and summary on the left; strengths as a bracket-numbered list
 * behind a hairline on the right. Strengths always render before anything
 * else on the page mentions changing: lead with what works.
 */
export default function PlanOverview({ person }: { person: Person }) {
  const plan = person.plan;
  if (!plan?.summary?.trim()) return null;

  return (
    <section className="bg-gradient-to-br from-[#3A3F44] via-pine-deep to-[#5B7280] text-paper">
      <div className="mx-auto grid max-w-[1300px] gap-12 px-6 py-16 sm:px-10 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:py-20">
        <div>
          <span className="inline-flex rounded-full border border-paper/25 px-3 py-1 font-mono text-[10px] uppercase tracking-label text-paper/70">
            Your plan / at a glance
          </span>

          <h2 className="mt-6 font-display text-4xl font-medium leading-[1.06] tracking-tight sm:text-5xl">
            Your personalized
            <br />
            <span className="text-paper/70">plan</span>
          </h2>

          <p className="mt-6 max-w-xl text-[15px] leading-relaxed text-paper/80">
            {plan.summary}
          </p>

          {person.builtFor && person.builtFor.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-2">
              {person.builtFor.map((b) => (
                <span
                  key={b}
                  className="rounded-full border border-paper/25 bg-paper/10 px-3 py-1 font-mono text-[10px] uppercase tracking-label text-paper/80"
                >
                  {b}
                </span>
              ))}
            </div>
          )}

          {plan.expectations?.trim() && (
            <p className="mt-8 max-w-xl border-t border-paper/20 pt-5 text-sm leading-relaxed text-paper/70">
              <span className="font-medium text-paper/90">Honest expectations: </span>
              {plan.expectations}
            </p>
          )}
        </div>

        {plan.strengths.length > 0 && (
          <div className="border-t border-paper/15 pt-8 lg:border-l lg:border-t-0 lg:pl-10 lg:pt-0">
            <p className="font-mono text-[10px] uppercase tracking-label text-paper/60">
              Already working for you /
            </p>
            <ol className="mt-6 space-y-4">
              {plan.strengths.map((s, i) => (
                <li key={s} className="flex items-baseline gap-6">
                  <span className="w-7 shrink-0 font-mono text-xs text-paper/50">
                    [{i + 1}]
                  </span>
                  <span className="text-[15px] leading-relaxed text-paper/90">{s}</span>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </section>
  );
}

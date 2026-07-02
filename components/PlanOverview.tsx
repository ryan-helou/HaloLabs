import type { Person } from "@/lib/types";

/**
 * The plan's cover letter — summary, what it was built around, what already
 * works, and honest expectations. Strengths always render before anything
 * else on the page mentions changing: lead with what works.
 */
export default function PlanOverview({ person }: { person: Person }) {
  const plan = person.plan;
  if (!plan?.summary?.trim()) return null;

  return (
    <section className="overflow-hidden rounded-2xl border border-line bg-gradient-to-br from-pine-deep to-pine text-paper shadow-float">
      <div className="grid gap-0 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <div className="p-7 sm:p-9">
          <p className="font-mono text-[10px] uppercase tracking-label text-paper/60">
            Your plan · at a glance
          </p>
          <p className="mt-4 max-w-prose text-[15px] leading-relaxed text-paper/90">
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
            <p className="mt-6 border-t border-paper/20 pt-5 text-sm leading-relaxed text-paper/70">
              <span className="font-medium text-paper/90">Honest expectations: </span>
              {plan.expectations}
            </p>
          )}
        </div>

        {plan.strengths.length > 0 && (
          <div className="border-t border-paper/15 bg-paper/5 p-7 sm:p-9 lg:border-l lg:border-t-0">
            <p className="font-mono text-[10px] uppercase tracking-label text-paper/60">
              Already working for you
            </p>
            <ul className="mt-4 space-y-3">
              {plan.strengths.map((s) => (
                <li key={s} className="flex items-baseline gap-3">
                  <span aria-hidden className="text-paper/60">
                    ✓
                  </span>
                  <span className="text-sm leading-relaxed text-paper/90">{s}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}

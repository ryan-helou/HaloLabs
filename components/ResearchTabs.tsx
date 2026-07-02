"use client";

import { useState } from "react";

/**
 * "Studies show your looks influence almost everything" — category tabs
 * switching a grid of research-stat cards, each with a real citation.
 */
const CATEGORIES = [
  {
    label: "Finances",
    cards: [
      {
        accent: "Higher",
        title: "salary",
        body: "Attractive people earn roughly 10–15% more over their careers.",
        cite: "Hamermesh, D. S., & Biddle, J. E. (1994). The American Economic Review.",
      },
      {
        accent: "Easier",
        title: "job interviews",
        body: "Attractive applicants are rated as more competent and more hireable.",
        cite: "Dipboye, R., Arvey, R., & Terpstra, D. (1977). Journal of Applied Psychology.",
      },
      {
        accent: "Bigger",
        title: "tips",
        body: "Attractive servers earn measurably more in tips over a year.",
        cite: "Parrett, M. (2015). Journal of Economic Psychology.",
      },
      {
        accent: "More",
        title: "sales",
        body: "Customers respond more favorably to attractive salespeople.",
        cite: "Reingen, P. H., & Kernan, J. B. (1993). Journal of Consumer Psychology.",
      },
    ],
  },
  {
    label: "Dating",
    cards: [
      {
        accent: "Stronger",
        title: "first dates",
        body: "Physical attractiveness was the single best predictor of wanting a second date.",
        cite: "Walster, E., et al. (1966). Journal of Personality and Social Psychology.",
      },
      {
        accent: "Instant",
        title: "halo effect",
        body: "Attractive people are assumed to be kinder, smarter, and more successful.",
        cite: "Dion, K., Berscheid, E., & Walster, E. (1972). Journal of Personality and Social Psychology.",
      },
      {
        accent: "Wider",
        title: "appeal",
        body: "Attractiveness strongly shapes romantic interest for both men and women.",
        cite: "Feingold, A. (1990). Psychological Bulletin.",
      },
      {
        accent: "Better",
        title: "treatment",
        body: "Attractive people are treated more positively across social interactions.",
        cite: "Langlois, J. H., et al. (2000). Psychological Bulletin.",
      },
    ],
  },
  {
    label: "Socializing",
    cards: [
      {
        accent: "More",
        title: "persuasive",
        body: "Attractive communicators are more likely to change others' opinions.",
        cite: "Chaiken, S. (1979). Journal of Personality and Social Psychology.",
      },
      {
        accent: "Truly",
        title: "seen",
        body: "People pay closer, more accurate attention to attractive faces on first meeting.",
        cite: "Lorenzo, G. L., Biesanz, J. C., & Human, L. J. (2010). Psychological Science.",
      },
      {
        accent: "Warmer",
        title: "judgments",
        body: "The \"beautiful is good\" stereotype colors how strangers read your character.",
        cite: "Dion, K., Berscheid, E., & Walster, E. (1972). Journal of Personality and Social Psychology.",
      },
      {
        accent: "Kinder",
        title: "interactions",
        body: "Meta-analysis: attractive people are judged and treated more favorably.",
        cite: "Langlois, J. H., et al. (2000). Psychological Bulletin.",
      },
    ],
  },
  {
    label: "Happiness",
    cards: [
      {
        accent: "Higher",
        title: "self-esteem",
        body: "Attractiveness shows reliable links with self-esteem and confidence.",
        cite: "Langlois, J. H., et al. (2000). Psychological Bulletin.",
      },
      {
        accent: "Lower",
        title: "social anxiety",
        body: "Attractive people report less social anxiety and more comfort with others.",
        cite: "Feingold, A. (1992). Psychological Bulletin.",
      },
      {
        accent: "Greater",
        title: "well-being",
        body: "Appearance relates to psychological well-being and how life treats you.",
        cite: "Umberson, D., & Hughes, M. (1987). Social Psychology Quarterly.",
      },
      {
        accent: "Real",
        title: "life satisfaction",
        body: "Attractiveness shows a modest but consistent link with subjective well-being.",
        cite: "Diener, E., Wolsic, B., & Fujita, F. (1995). Journal of Personality and Social Psychology.",
      },
    ],
  },
];

export default function ResearchTabs() {
  const [active, setActive] = useState(0);

  return (
    <div>
      <div className="inline-flex max-w-full flex-wrap items-center gap-1 rounded-full border border-line bg-surface p-1.5 shadow-card">
        {CATEGORIES.map((c, i) => (
          <button
            key={c.label}
            type="button"
            onClick={() => setActive(i)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              i === active
                ? "bg-ink text-paper"
                : "text-ink-soft hover:text-ink"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {CATEGORIES[active].cards.map((card) => (
          <article
            key={card.title}
            className="flex min-h-[190px] flex-col rounded-xl border border-line bg-surface p-6 shadow-card"
          >
            <h3 className="text-xl font-medium text-ink">
              <span className="text-pine">{card.accent}</span> {card.title}
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-ink">{card.body}</p>
            <p className="mt-auto pt-6 font-mono text-[10.5px] leading-relaxed text-ink-soft">
              {card.cite}
            </p>
          </article>
        ))}
      </div>
    </div>
  );
}

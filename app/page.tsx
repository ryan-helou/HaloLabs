import { existsSync } from "node:fs";
import { join } from "node:path";
import LandingCompare from "@/components/LandingCompare";
import LoginForm from "@/components/LoginForm";
import ResearchTabs from "@/components/ResearchTabs";

// Each pair renders only when both files exist in public/landing — see
// public/landing/PROMPTS.md for how to generate the missing ones.
const PAIRS = [
  { before: "/landing/model-1-before.jpg", after: "/landing/model-1-after.jpg", start: 52 },
  { before: "/landing/model-2-before.jpg", after: "/landing/model-2-after.jpg", start: 48 },
].filter((p) =>
  [p.before, p.after].every((f) => existsSync(join(process.cwd(), "public", f)))
);

const BENEFITS = [
  "Get more career opportunities",
  "Boost your self-confidence",
  "Make a stronger first impression",
  "Improve your dating life",
  "Enhance your quality of life",
];

const OLD_WAY = [
  "Fixate on one feature",
  "Guess at products",
  "No honest feedback",
  "Random advice online",
  "Poor results",
];

const NEW_WAY = [
  "Consider your face holistically",
  "HaloLabs analysis",
  "Honest observations",
  "Personalized suggestions",
  "Real results",
];

const LEARN_ITEMS = [
  {
    title: "Your most noticeable features",
    body: "What people actually see first — and whether it works for you.",
  },
  {
    title: "How each feature affects your look",
    body: "Detailed observations on hair, skin, brows, facial hair, and style.",
  },
  {
    title: "The features with the most potential",
    body: "Where a small change produces the most visible improvement.",
  },
  {
    title: "Your quick wins",
    body: "Low-effort, high-impact changes you can make this week.",
  },
  {
    title: "The reasoning behind every suggestion",
    body: "Each recommendation explains why — never just “do this.”",
  },
];

const STEPS = [
  {
    title: "Tell us about yourself",
    body: "Two minutes of questions — your goals, time, budget, and hard no-gos — so the plan is built around your life, not a template.",
  },
  {
    title: "Add guided photos",
    body: "Six specific shots with framing and lighting guidance (front, smile, profiles, 3/4, detail). Everything stays on your machine.",
  },
  {
    title: "Get your plan",
    body: "Observations, prioritized suggestions with the why and how, a daily routine, a shopping list, and checkpoints to track progress.",
  },
];

const REASSURANCE = [
  {
    title: "You learn what's truly unique about your face.",
    body: "Many features you might worry about are actually positive traits. Honest analysis often helps people appreciate what they used to dislike.",
  },
  {
    title: "You get clarity about what can actually be improved.",
    body: "Slight asymmetry is perfectly normal — everyone has it. But if something fixable is making you self-conscious, you'll know exactly what to do about it.",
  },
  {
    title: "You gain control through knowledge.",
    body: "Vague insecurity thrives in the dark. A concrete, kind, specific plan replaces “I look off” with “here's my next step.”",
  },
];

const FAQ = [
  {
    q: "What is HaloLabs?",
    a: "A personal grooming analysis. You answer a short onboarding, add guided photos, and Claude studies them locally and writes a personalized plan — observations, prioritized suggestions, a daily routine, a shopping list, and progress checkpoints.",
  },
  {
    q: "Who is this for?",
    a: "Anyone who wants an honest, specific answer to “what would actually improve my look?” — without filters, flattery, or a sales pitch for procedures.",
  },
  {
    q: "What exactly will I receive?",
    a: "A per-person plan: neutral observations on each aspect of your appearance, prioritized suggestions with the why, the how-to steps, product examples with prices, an AM/PM routine, a three-phase roadmap you can check off, and re-photo checkpoints.",
  },
  {
    q: "Can't I just ask ChatGPT or Claude directly?",
    a: "HaloLabs is Claude — but with a structured methodology. The analyze-faces skill reviews every photo systematically, writes findings to a consistent format, and the viewer keeps everything organized and comparable over time instead of lost in a chat thread.",
  },
  {
    q: "Is my data private?",
    a: "Yes. Your photos and results live in a folder on your machine. This viewer only reads the local results file — nothing is uploaded anywhere.",
  },
  {
    q: "Can I really improve without surgery?",
    a: "The suggestions focus on grooming, hair, skin care, brows, facial hair, style, and habits — changes that are achievable, reversible, and affordable. Tags describe each suggestion, never the person.",
  },
  {
    q: "Is it vain to care about my appearance?",
    a: "Caring about how you present yourself is normal — research consistently shows appearance affects careers, relationships, and confidence. The key is approaching it intelligently: not chasing unrealistic standards, just aiming for the best version of yourself.",
  },
];

/* Small building blocks shared by the sections below. */

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex rounded-full border border-line px-3 py-1 font-mono text-[10px] uppercase tracking-label text-ink-soft">
      {children}
    </span>
  );
}

function Frame({
  children,
  className = "",
  id,
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section id={id} className={`scroll-mt-24 border-y border-line ${className}`}>
      <div className="mx-auto max-w-[1500px] border-line lg:border-x">{children}</div>
    </section>
  );
}

function StartCta({ label = "Start my plan" }: { label?: string }) {
  return (
    <a
      href="/start"
      className="inline-flex items-center gap-1.5 rounded-full bg-ink px-6 py-3 text-[15px] font-medium text-paper shadow-float transition-colors hover:bg-pine-deep"
    >
      {label}
      <span aria-hidden>→</span>
    </a>
  );
}

export default function HomePage() {
  return (
    // Full-bleed breakout of the layout's max-w-5xl main so every section can
    // span the viewport like the reference design.
    <div className="relative left-1/2 w-screen -translate-x-1/2">
      {/* ------------------------------------------------ 1 · Hero */}
      <section className="relative -mt-6 overflow-hidden bg-gradient-to-br from-panel via-[#AEBEC7] to-[#8FA3AD]">
        <div className="mx-auto grid max-w-[1500px] items-end gap-8 px-6 pt-24 sm:px-10 lg:grid-cols-2 lg:pt-28">
          <div className="pb-16 lg:pb-24">
            <p className="font-mono text-[11px] uppercase tracking-label text-pine-deep/80">
              An honest mirror, powered by Claude
            </p>
            <h1 className="mt-4 font-display text-5xl font-medium leading-[1.02] tracking-tight text-ink sm:text-6xl lg:text-7xl">
              Improve your looks
              <br />
              <span className="text-surface">without surgery</span>
            </h1>
            <p className="mt-6 max-w-md text-[15px] leading-relaxed text-pine-deep">
              Get a personalized facial analysis and transformation plan based
              on your unique features — from your own photos.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <a
                href="/start"
                className="rounded-full bg-ink px-6 py-3 text-[15px] font-medium text-paper shadow-float transition-colors hover:bg-pine-deep"
              >
                Get my free scan
              </a>
              <a
                href="#how-it-works"
                className="rounded-full border border-pine-deep/25 bg-surface/20 px-6 py-3 text-[15px] font-medium text-pine-deep backdrop-blur-sm transition-colors hover:bg-surface/40"
              >
                How it works
              </a>
            </div>
            <p className="mt-3 font-mono text-[11px] uppercase tracking-label text-pine-deep/70">
              Free scan · strengths first · no card needed
            </p>
          </div>

          <div className="relative hidden self-end lg:block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/landing/model-1-after.jpg"
              alt="Studio portrait"
              className="mx-auto max-h-[560px] w-auto [mask-image:linear-gradient(to_bottom,black_78%,transparent)]"
            />
          </div>
        </div>

        {/* Trust row */}
        <div className="relative border-t border-pine-deep/15">
          <div className="mx-auto grid max-w-[1500px] grid-cols-1 divide-y divide-pine-deep/15 px-6 sm:grid-cols-3 sm:divide-x sm:divide-y-0 sm:px-10">
            {[
              ["Based on science", "Grounded in published research"],
              ["Personalized", "Written about your actual photos"],
              ["Without surgery", "Grooming, style, and habits only"],
            ].map(([t, s]) => (
              <div key={t} className="py-5 sm:px-6 sm:first:pl-0">
                <p className="text-sm font-semibold text-ink">{t}</p>
                <p className="mt-0.5 text-xs text-pine-deep/80">{s}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------- 2 · Transformations split (framed) */}
      <Frame className="border-t-0">
        <div className="grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          {/* Left: pitch + sign-in, benefits pinned to the bottom */}
          <div className="flex flex-col px-6 py-10 sm:px-10 lg:border-r lg:border-line lg:py-14">
            <Eyebrow>New approach</Eyebrow>

            <h2 className="mt-8 font-display text-5xl font-medium leading-[1.04] tracking-tight text-ink sm:text-6xl">
              Life-changing
              <br />
              <span className="text-pine">Transformations</span>
            </h2>

            <p className="mt-6 max-w-md text-[15px] leading-relaxed text-ink-soft">
              Research consistently demonstrates the diverse, wide-ranging
              benefits of physical attractiveness. HaloLabs reads your photos and
              builds a personalized plan to get there.
            </p>

            <div className="mt-8 max-w-md">
              <LoginForm />
            </div>

            <div className="min-h-10 flex-1" />

            <ol className="mt-12 space-y-4">
              {BENEFITS.map((b, i) => (
                <li key={b} className="flex items-baseline gap-10">
                  <span className="w-7 shrink-0 font-mono text-xs text-ink-soft">
                    [{i + 1}]
                  </span>
                  <span className="text-[15px] text-ink">{b}</span>
                </li>
              ))}
            </ol>
          </div>

          {/* Right: before / projection panels */}
          <div
            className={`grid grid-cols-1 content-center gap-5 p-5 lg:p-6 ${
              PAIRS.length > 1 ? "sm:grid-cols-2" : "justify-items-center"
            }`}
          >
            {PAIRS.map((pair) => (
              <div
                key={pair.before}
                className={`w-full ${PAIRS.length > 1 ? "" : "max-w-[520px]"}`}
              >
                <LandingCompare
                  beforeSrc={pair.before}
                  afterSrc={pair.after}
                  alt="Example transformation"
                  start={pair.start}
                />
              </div>
            ))}
          </div>
        </div>
      </Frame>

      {/* ------------------------------- 3 · Research proof (#why) */}
      <section id="why-halolabs" className="scroll-mt-24 py-20 sm:py-24">
        <div className="mx-auto max-w-[1500px] px-6 sm:px-10">
          <h2 className="max-w-4xl font-display text-4xl font-medium leading-[1.08] tracking-tight text-ink sm:text-5xl lg:text-6xl">
            Studies show your looks influence{" "}
            <span className="text-pine">
              almost everything, from your career to your romantic life.
            </span>
          </h2>
          <div className="mt-10">
            <ResearchTabs />
          </div>
        </div>
      </section>

      {/* ------------------------------------ 4 · Old way / new way */}
      <section className="border-y border-line bg-surface py-20 sm:py-24">
        <div className="mx-auto max-w-[1500px] px-6 sm:px-10">
          <div className="mx-auto max-w-2xl text-center">
            <Eyebrow>Personalized analysis</Eyebrow>
            <h2 className="mt-6 font-display text-4xl font-medium tracking-tight text-ink sm:text-5xl">
              A new way to <span className="text-pine">glow-up</span>
            </h2>
            <p className="mt-4 text-[15px] leading-relaxed text-ink-soft">
              Looking your best is confusing — conflicting advice, filtered
              references, and products that were never chosen for your face.
            </p>
          </div>

          <div className="mt-12 space-y-4">
            {/* The old way */}
            <div className="grid items-center gap-6 rounded-2xl border border-line bg-paper p-6 sm:p-8 lg:grid-cols-[180px_1fr]">
              <p className="text-lg font-medium text-ink-soft">The old way</p>
              <ol className="grid gap-6 sm:grid-cols-5">
                {OLD_WAY.map((s, i) => (
                  <li key={s}>
                    <p className="font-mono text-[10px] uppercase tracking-label text-ink-soft">
                      Step {i + 1}
                    </p>
                    <p className="mt-2 text-sm text-ink-soft">{s}</p>
                  </li>
                ))}
              </ol>
            </div>
            {/* The new way */}
            <div className="grid items-center gap-6 rounded-2xl bg-gradient-to-r from-pine-deep to-pine p-6 text-paper sm:p-8 lg:grid-cols-[180px_1fr]">
              <p className="text-lg font-medium">The new way</p>
              <ol className="grid gap-6 sm:grid-cols-5">
                {NEW_WAY.map((s, i) => (
                  <li key={s}>
                    <p className="font-mono text-[10px] uppercase tracking-label text-paper/60">
                      Step {i + 1}
                    </p>
                    <p className="mt-2 text-sm text-paper/90">{s}</p>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </section>

      {/* --------------------------- 5 · Complete facial analysis (dark) */}
      <section className="relative overflow-hidden bg-gradient-to-b from-pine-deep to-[#41586A] py-20 text-paper sm:py-24">
        <div className="mx-auto max-w-[1500px] px-6 sm:px-10">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-4xl font-medium tracking-tight sm:text-5xl">
              Your complete <span className="text-paper/70">facial analysis</span>
            </h2>
            <p className="mt-4 text-[15px] leading-relaxed text-paper/70">
              Every face is unique. Every photo is studied — hair, skin, brows,
              facial hair, and style — to build a precise picture of your look.
            </p>
          </div>

          <div className="relative mx-auto mt-12 grid max-w-5xl items-center gap-6 lg:grid-cols-[1fr_auto_1fr]">
            {/* Left metric cards */}
            <div className="order-2 space-y-4 lg:order-1">
              <div className="rounded-xl border border-paper/15 bg-paper/10 p-4 backdrop-blur-sm">
                <p className="font-mono text-[10px] uppercase tracking-label text-paper/60">
                  Most noticeable
                </p>
                <p className="mt-2 text-sm text-paper/90">Eyebrows — strong, natural arch</p>
                <div className="mt-3 h-1.5 rounded-full bg-paper/15">
                  <div className="h-full w-4/5 rounded-full bg-paper/70" />
                </div>
              </div>
              <div className="rounded-xl border border-paper/15 bg-paper/10 p-4 backdrop-blur-sm">
                <p className="font-mono text-[10px] uppercase tracking-label text-paper/60">
                  Hair volume
                </p>
                <p className="mt-2 font-display text-3xl font-medium">64%</p>
                <p className="mt-1 text-xs text-paper/60">Room to lift at the roots</p>
              </div>
            </div>

            {/* Center portrait */}
            <div className="order-1 mx-auto w-full max-w-[340px] overflow-hidden rounded-xl lg:order-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/landing/model-2-before.jpg"
                alt="Analysis portrait"
                className="aspect-[3/4] w-full object-cover"
              />
            </div>

            {/* Right metric cards */}
            <div className="order-3 space-y-4">
              <div className="rounded-xl border border-paper/15 bg-paper/10 p-4 backdrop-blur-sm">
                <p className="font-mono text-[10px] uppercase tracking-label text-paper/60">
                  Skin
                </p>
                <p className="mt-2 text-sm text-paper/90">
                  Mild dullness — hydration &amp; sunlight will show fast
                </p>
                <div className="mt-3 flex gap-1.5">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <span
                      key={n}
                      className={`h-1.5 flex-1 rounded-full ${n <= 3 ? "bg-paper/70" : "bg-paper/15"}`}
                    />
                  ))}
                </div>
              </div>
              <div className="rounded-xl border border-paper/15 bg-paper/10 p-4 backdrop-blur-sm">
                <p className="font-mono text-[10px] uppercase tracking-label text-paper/60">
                  Quick win
                </p>
                <p className="mt-2 text-sm text-paper/90">
                  Define the beard neckline — 10 minutes, instant jawline
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------- 6 · You will learn */}
      <section className="py-20 sm:py-24">
        <div className="mx-auto max-w-[1500px] px-6 sm:px-10">
          <div className="mx-auto max-w-2xl text-center">
            <Eyebrow>The deliverable</Eyebrow>
            <h2 className="mt-6 font-display text-4xl font-medium tracking-tight text-ink sm:text-5xl">
              What you&apos;ll <span className="text-pine">learn</span>
            </h2>
          </div>

          {/* Bento: a lead feature card, then the supporting reads around it. */}
          <div className="mt-12 grid gap-4 lg:grid-cols-2">
            {/* Lead card — dark, emphasized. */}
            <article className="flex flex-col justify-between rounded-2xl bg-gradient-to-br from-pine-deep to-pine p-8 text-paper shadow-float sm:p-10 lg:col-span-2 lg:min-h-[220px]">
              <span className="font-mono text-xs text-paper/60">01</span>
              <div className="mt-6 max-w-2xl">
                <h3 className="font-display text-2xl font-medium tracking-tight sm:text-3xl">
                  {LEARN_ITEMS[0].title}
                </h3>
                <p className="mt-3 text-[15px] leading-relaxed text-paper/80">
                  {LEARN_ITEMS[0].body}
                </p>
              </div>
            </article>

            {/* Supporting reads — 2×2. */}
            {LEARN_ITEMS.slice(1).map((item, i) => (
              <article
                key={item.title}
                className="flex items-start gap-5 rounded-2xl border border-line bg-surface p-6 shadow-card transition-colors hover:border-pine/40 sm:p-7"
              >
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sage font-mono text-xs text-pine">
                  {String(i + 2).padStart(2, "0")}
                </span>
                <div>
                  <h3 className="text-base font-semibold text-ink">{item.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
                    {item.body}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* --------------------------- 7 · Personalized plan (dark split) */}
      <section className="bg-gradient-to-br from-[#3A3F44] via-pine-deep to-[#5B7280] py-20 text-paper sm:py-24">
        <div className="mx-auto grid max-w-[1500px] items-center gap-12 px-6 sm:px-10 lg:grid-cols-2">
          <div>
            <span className="inline-flex rounded-full border border-paper/25 px-3 py-1 font-mono text-[10px] uppercase tracking-label text-paper/70">
              Personalized plan
            </span>
            <h2 className="mt-6 font-display text-4xl font-medium leading-[1.06] tracking-tight sm:text-5xl">
              Get your personalized
              <br />
              <span className="text-paper/70">HaloLabs plan</span>
            </h2>
            <p className="mt-5 max-w-md text-[15px] leading-relaxed text-paper/70">
              Understand your features and take action today with a plan written
              for your face — not a template.
            </p>
            <ol className="mt-10 space-y-4">
              {[
                "Get your honest facial analysis",
                "See your most noticeable features",
                "Get your personalized glow-up suggestions",
                "Track your progress as photos come in",
              ].map((s, i) => (
                <li key={s} className="flex items-baseline gap-6">
                  <span className="font-mono text-xs text-paper/50">[{i + 1}]</span>
                  <span className="text-[15px] text-paper/90">{s}</span>
                </li>
              ))}
            </ol>
          </div>

          {/* Advice-board mockup */}
          <div className="rounded-2xl border border-paper/15 bg-paper p-6 text-ink shadow-float">
            <div className="flex items-center justify-between">
              <p className="font-display text-xl font-semibold">Your advice board</p>
              <span className="font-mono text-[10px] uppercase tracking-label text-ink-soft">
                7 suggestions
              </span>
            </div>
            <div className="mt-5 space-y-3">
              {[
                ["Lift hair at the roots", "Quick win", "clay"],
                ["Define beard neckline", "Quick win", "clay"],
                ["Daily SPF + moisturizer", "Habit", "pine"],
                ["Shape brows — keep the arch", "Grooming", "pine"],
                ["Sleep 7h+ for under-eyes", "Habit", "pine"],
              ].map(([text, tag, tone]) => (
                <div
                  key={text}
                  className="flex items-center justify-between gap-4 rounded-lg border border-line bg-surface px-4 py-3"
                >
                  <p className="text-sm text-ink">{text}</p>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 font-mono text-[9px] uppercase tracking-label ${
                      tone === "clay" ? "bg-clay-soft text-clay" : "bg-sage text-pine"
                    }`}
                  >
                    {tag}
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs text-ink-soft">
              Tags describe each suggestion, never the person.
            </p>
          </div>
        </div>
      </section>

      {/* --------------------------------- 8 · How it works (#how) */}
      <section id="how-it-works" className="scroll-mt-24 py-20 sm:py-24">
        <div className="mx-auto max-w-[1500px] px-6 sm:px-10">
          <div className="mx-auto max-w-2xl text-center">
            <Eyebrow>How it works</Eyebrow>
            <h2 className="mt-6 font-display text-4xl font-medium tracking-tight text-ink sm:text-5xl">
              From photos to plan,
              <br />
              <span className="text-pine">no clinic visits needed</span>
            </h2>
            <p className="mt-4 text-[15px] leading-relaxed text-ink-soft">
              Get your personalized facial analysis from the comfort of your
              home in three simple steps.
            </p>
          </div>

          <div className="mt-12 grid gap-4 lg:grid-cols-3">
            {STEPS.map((step, i) => (
              <article
                key={step.title}
                className="rounded-2xl border border-line bg-surface p-8 shadow-card"
              >
                <span className="font-mono text-xs text-pine">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-4 text-xl font-semibold text-ink">{step.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-ink-soft">{step.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------ 9 · Reassurance (objections) */}
      <section className="border-y border-line bg-surface py-20 sm:py-24">
        <div className="mx-auto max-w-[1500px] px-6 sm:px-10">
          <h2 className="mx-auto max-w-2xl text-center font-display text-4xl font-medium tracking-tight text-ink sm:text-5xl">
            Will analyzing my face{" "}
            <span className="text-pine">make me insecure?</span>
          </h2>
          <div className="mt-12 grid gap-4 lg:grid-cols-3">
            {REASSURANCE.map((r) => (
              <article
                key={r.title}
                className="rounded-2xl border border-line bg-paper p-8"
              >
                <h3 className="text-lg font-semibold leading-snug text-ink">
                  {r.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-ink-soft">{r.body}</p>
              </article>
            ))}
          </div>

          <div className="mx-auto mt-16 max-w-2xl rounded-2xl bg-gradient-to-br from-pine-deep to-pine p-8 text-paper sm:p-10">
            <h3 className="font-display text-2xl font-medium sm:text-3xl">
              Is it vain to care about your appearance?
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-paper/80">
              The key is approaching it intelligently:
            </p>
            <ul className="mt-5 space-y-2.5">
              {[
                "Not chasing unrealistic standards",
                "Not trying to look like someone else",
                "Not seeking perfection",
                "Aiming only for a better version of yourself",
              ].map((s) => (
                <li
                  key={s}
                  className="rounded-lg border border-paper/20 bg-paper/10 px-4 py-2.5 text-sm text-paper/90"
                >
                  {s}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------- 10 · FAQ */}
      <section id="faq" className="scroll-mt-24 py-20 sm:py-24">
        <div className="mx-auto max-w-[1500px] px-6 sm:px-10">
          <div className="mx-auto max-w-2xl text-center">
            <Eyebrow>Your questions</Eyebrow>
            <h2 className="mt-6 font-display text-4xl font-medium tracking-tight text-ink sm:text-5xl">
              Frequently asked <span className="text-pine">questions</span>
            </h2>
          </div>

          <div className="mx-auto mt-12 max-w-3xl divide-y divide-line border-y border-line">
            {FAQ.map((item) => (
              <details key={item.q} className="group py-1">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-4 text-[15px] font-medium text-ink [&::-webkit-details-marker]:hidden">
                  {item.q}
                  <span
                    aria-hidden
                    className="text-xl font-light text-ink-soft transition-transform duration-200 group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>
                <p className="max-w-2xl pb-5 text-sm leading-relaxed text-ink-soft">
                  {item.a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------- 11 · Final CTA */}
      <section className="bg-gradient-to-br from-panel via-[#AEBEC7] to-[#8FA3AD] py-20 sm:py-28">
        <div className="mx-auto max-w-[1500px] px-6 text-center sm:px-10">
          <h2 className="mx-auto max-w-3xl font-display text-4xl font-medium leading-[1.06] tracking-tight text-ink sm:text-6xl">
            See yourself clearly.
            <br />
            <span className="text-surface">Start your transformation.</span>
          </h2>
          <div className="mt-10">
            <StartCta />
          </div>
        </div>
      </section>
    </div>
  );
}

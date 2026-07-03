import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { loadPerson } from "@/lib/data";
import { loadProgressForPerson } from "@/lib/progress";
import { hasPlan, pickFreeReveal, flattenAdvice } from "@/lib/plan";
import { isUnlocked } from "@/lib/entitlement";
import PersonHero from "@/components/PersonHero";
import AdviceBoard from "@/components/AdviceBoard";
import PlanOverview from "@/components/PlanOverview";
import HaloGlance from "@/components/HaloGlance";
import PlanBoard from "@/components/PlanBoard";
import ReportSection from "@/components/ReportSection";
import PaywallBar from "@/components/PaywallBar";
import { ProgressProvider } from "@/components/ProgressProvider";
import type { Observations } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const person = await loadPerson(decodeURIComponent(params.id));
  return { title: person ? `${person.displayName} · HaloLabs` : "HaloLabs" };
}

const OBSERVATION_FIELDS: { key: keyof Observations; label: string }[] = [
  { key: "faceShape", label: "Face shape" },
  { key: "hair", label: "Hair" },
  { key: "skin", label: "Skin" },
  { key: "facialHair", label: "Facial hair" },
];

export default async function PersonPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const id = decodeURIComponent(params.id);
  const person = await loadPerson(id);
  if (!person) notFound();

  // Entitlement. `unlocked` gates the blur paywall: unlocked shows the whole
  // plan, locked reveals act [01] observations + one free suggestion and blurs
  // the rest. It now reads the signed-in user's subscriptionStatus (Phase 2);
  // Stripe's webhook flips that flag in Phase 3. `?unlocked=1` stays as a
  // preview override for tuning what's free vs. locked.
  const unlocked = (await isUnlocked()) || searchParams?.unlocked === "1";
  const locked = !unlocked;

  // The single suggestion shown in full on a locked plan, chosen deterministically
  // (skill-flagged freeReveal, else the best impact/effort candidate).
  const free = pickFreeReveal(person.advice);
  const freeKey = free ? `${free.category}-${free.index}` : undefined;
  const totalSuggestions = flattenAdvice(person.advice).length;

  const progress = await loadProgressForPerson(id);
  const extras = person.observations?.extras ?? [];

  const observationRows: { label: string; text: string }[] = [
    ...OBSERVATION_FIELDS.map(({ key, label }) => {
      const value = person.observations?.[key];
      return { label, text: typeof value === "string" ? value.trim() : "" };
    }),
    ...extras.map(({ label, note }) => ({ label, text: note })),
    ...(person.observations?.generalNotes?.trim()
      ? [{ label: "Notes", text: person.observations.generalNotes }]
      : []),
  ];

  // The plan leads with the doing — routine, roadmap, shopping — then the
  // protocol detail and analysis map, and the raw observations come last as
  // the reference every suggestion was built from. Sections number top to
  // bottom, counting only those that actually render.
  const plan = person.plan;
  const planReady = hasPlan(person) && !!plan;
  const hasRoutine = (plan?.routine?.length ?? 0) > 0;
  const hasRoadmap =
    (plan?.phases ?? []).filter((p) => p.suggestionIds.length > 0).length > 0;
  const hasShopping =
    (plan?.shoppingList?.length ?? 0) > 0 || (plan?.checkpoints?.length ?? 0) > 0;
  const planCount = planReady
    ? Number(hasRoutine) + Number(hasRoadmap) + Number(hasShopping)
    : 0;
  const adviceStart = planCount + 1;
  const obsNum = String(planCount + 3).padStart(2, "0");

  return (
    // Full-bleed breakout of the layout's max-w-5xl main, same as the landing
    // page — the report runs in Qoves-style framed bands, not floating cards.
    <div
      className={`relative left-1/2 w-screen -translate-x-1/2 -mt-6 ${
        locked ? "pb-32" : ""
      }`}
    >
      <PersonHero person={person} />

      <ProgressProvider personId={person.id} initial={progress}>
        {/* The digest — the one thing to read: what to start with, where the
            plan focuses, what already works. Everything else sits collapsed
            below it. On a locked plan we keep the teaser cover letter instead,
            so the paywall still reveals only one move in full. */}
        {planReady && !locked ? (
          <HaloGlance person={person} />
        ) : (
          <PlanOverview person={person} />
        )}

        {/* The report body: numbered acts stacked as one framed document.
            Routine + roadmap stay open as the daily driver; the deeper
            reference (shopping, protocol, analysis, photos) collapses. */}
        <div className="border-b border-line">
          {planReady && plan && (
            <PlanBoard
              plan={plan}
              advice={person.advice}
              startNum={1}
              locked={locked}
            />
          )}

          {/* Protocol detail, then the analysis map. */}
          <AdviceBoard
            advice={person.advice}
            startNum={adviceStart}
            locked={locked}
            freeKey={freeKey}
          />

          {/* Observations last — the raw material every suggestion is built from. */}
          <ReportSection
            num={obsNum}
            titleA="What the"
            titleB="photos show"
            blurb="Neutral notes on what is actually visible in your photos — the raw material every suggestion above was built from."
            collapsible
            defaultOpen={false}
            collapsedHint="Neutral notes on your hair, skin, face shape, and more — the raw material behind every suggestion. "
            rail={
              <Link
                href={`/start/photos?id=${encodeURIComponent(person.id)}`}
                className="font-mono text-[11px] uppercase tracking-label text-pine transition-colors hover:text-pine-deep"
              >
                Add photos / re-analyze →
              </Link>
            }
          >
            <dl className="divide-y divide-line">
              {observationRows.map(({ label, text }) => (
                <div
                  key={label}
                  className="grid gap-1 px-6 py-5 sm:grid-cols-[150px_1fr] sm:gap-8 sm:px-8"
                >
                  <dt className="eyebrow pt-0.5">{label}</dt>
                  <dd className="max-w-prose text-[15px] leading-relaxed text-ink">
                    {text || <span className="text-ink-soft">Not noted.</span>}
                  </dd>
                </div>
              ))}
            </dl>
          </ReportSection>
        </div>
      </ProgressProvider>

      {/* Wellbeing note — quiet, always present. */}
      <p className="mx-auto max-w-[1300px] px-6 py-10 text-xs leading-relaxed text-ink-soft sm:px-10">
        A reminder from HaloLabs: this plan describes options, not obligations —
        and none of it is medical advice. If thinking about your appearance is
        weighing on you more than it should, step away from the mirror and talk
        to someone you trust or a professional. Nothing here is more important
        than that.
      </p>

      {/* Pressure UI — only while locked. The button is stubbed until Stripe. */}
      {locked && totalSuggestions > 0 && (
        <PaywallBar unlockedCount={1} totalCount={totalSuggestions} />
      )}
    </div>
  );
}

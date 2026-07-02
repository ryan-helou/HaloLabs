import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { loadPerson } from "@/lib/data";
import { loadProgress } from "@/lib/progress";
import { hasPlan } from "@/lib/plan";
import PersonHero from "@/components/PersonHero";
import AdviceBoard from "@/components/AdviceBoard";
import PlanOverview from "@/components/PlanOverview";
import PlanBoard from "@/components/PlanBoard";
import ReportSection from "@/components/ReportSection";
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

export default async function PersonPage({ params }: { params: { id: string } }) {
  const id = decodeURIComponent(params.id);
  const person = await loadPerson(id);
  if (!person) notFound();

  const progressStore = await loadProgress();
  const progress = progressStore[id] ?? {};
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

  return (
    // Full-bleed breakout of the layout's max-w-5xl main, same as the landing
    // page — the report runs in Qoves-style framed bands, not floating cards.
    <div className="relative left-1/2 w-screen -translate-x-1/2 -mt-6">
      <PersonHero person={person} />

      {/* Plan cover letter — summary, strengths, expectations (v2 only). */}
      <PlanOverview person={person} />

      {/* The report body: numbered acts stacked as one framed document. */}
      <div className="border-b border-line">
        {/* [01] Observations */}
        <ReportSection
          num="01"
          titleA="What the"
          titleB="photos show"
          blurb="Neutral notes on what is actually visible in your photos — the raw material every suggestion below is built from."
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

        {/* [02] Analysis + [03] Protocol */}
        <AdviceBoard advice={person.advice} />

        {/* [04] Routine + [05] Roadmap + [06] Shopping & checkpoints (v2 only). */}
        {hasPlan(person) && person.plan && (
          <PlanBoard
            personId={person.id}
            plan={person.plan}
            advice={person.advice}
            initialProgress={progress}
          />
        )}
      </div>

      {/* Wellbeing note — quiet, always present. */}
      <p className="mx-auto max-w-[1300px] px-6 py-10 text-xs leading-relaxed text-ink-soft sm:px-10">
        A reminder from HaloLabs: this plan describes options, not obligations —
        and none of it is medical advice. If thinking about your appearance is
        weighing on you more than it should, step away from the mirror and talk
        to someone you trust or a professional. Nothing here is more important
        than that.
      </p>
    </div>
  );
}

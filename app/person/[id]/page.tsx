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
import type { Observations } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const person = await loadPerson(decodeURIComponent(params.id));
  return { title: person ? `${person.displayName} · LookLab` : "LookLab" };
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

  return (
    <div className="space-y-14">
      <PersonHero person={person} />

      {/* Plan cover letter — summary, strengths, expectations (v2 only). */}
      <PlanOverview person={person} />

      {/* 01 · Observations */}
      <section className="scroll-mt-24">
        <div className="mb-4 flex items-baseline justify-between gap-3 border-b border-line pb-3">
          <div className="flex items-baseline gap-3">
            <span className="font-mono text-xs text-ink-soft">01</span>
            <h2 className="font-display text-2xl text-ink">What the photos show</h2>
          </div>
          <Link
            href={`/start/photos?id=${encodeURIComponent(person.id)}`}
            className="font-mono text-[11px] uppercase tracking-label text-pine transition-colors hover:text-pine-deep"
          >
            Add photos / re-analyze →
          </Link>
        </div>
        <dl className="overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
          {OBSERVATION_FIELDS.map(({ key, label }, i) => {
            const value = person.observations?.[key];
            const text = typeof value === "string" ? value.trim() : "";
            return (
              <div
                key={key}
                className={`grid gap-1 px-5 py-4 sm:grid-cols-[140px_1fr] sm:gap-6 sm:py-5 ${
                  i > 0 ? "border-t border-line" : ""
                }`}
              >
                <dt className="eyebrow pt-0.5">{label}</dt>
                <dd className="text-[15px] leading-relaxed text-ink">
                  {text || <span className="text-ink-soft">Not noted.</span>}
                </dd>
              </div>
            );
          })}
          {/* v2 per-feature extras (under-eyes, brows, smile, posture…). */}
          {extras.map(({ label, note }) => (
            <div
              key={label}
              className="grid gap-1 border-t border-line px-5 py-4 sm:grid-cols-[140px_1fr] sm:gap-6 sm:py-5"
            >
              <dt className="eyebrow pt-0.5">{label}</dt>
              <dd className="text-[15px] leading-relaxed text-ink">{note}</dd>
            </div>
          ))}
          {person.observations?.generalNotes?.trim() && (
            <div className="grid gap-1 border-t border-line px-5 py-4 sm:grid-cols-[140px_1fr] sm:gap-6 sm:py-5">
              <dt className="eyebrow pt-0.5">Notes</dt>
              <dd className="text-[15px] leading-relaxed text-ink">
                {person.observations.generalNotes}
              </dd>
            </div>
          )}
        </dl>
      </section>

      {/* 02 Analysis + 03 Protocol */}
      <section>
        <AdviceBoard advice={person.advice} />
      </section>

      {/* 04 Routine + 05 Roadmap + 06 Shopping & checkpoints (v2 only). */}
      {hasPlan(person) && person.plan && (
        <PlanBoard
          personId={person.id}
          plan={person.plan}
          advice={person.advice}
          initialProgress={progress}
        />
      )}

      {/* Wellbeing note — quiet, always present. */}
      <p className="border-t border-line pt-6 text-xs leading-relaxed text-ink-soft">
        A reminder from LookLab: this plan describes options, not obligations —
        and none of it is medical advice. If thinking about your appearance is
        weighing on you more than it should, step away from the mirror and talk
        to someone you trust or a professional. Nothing here is more important
        than that.
      </p>
    </div>
  );
}

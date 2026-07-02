import Link from "next/link";
import type { Metadata } from "next";
import { loadResults } from "@/lib/data";
import PersonCard from "@/components/PersonCard";
import SignedInAs from "@/components/SignedInAs";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Profiles · LookLab",
};

export default async function ProfilesPage() {
  const { people } = await loadResults();
  const sorted = [...people].sort((a, b) =>
    a.displayName.localeCompare(b.displayName)
  );

  return (
    <div className="py-6">
      <div className="mb-6 flex items-end justify-between gap-3 border-b border-line pb-4">
        <div>
          <SignedInAs />
          <h1 className="mt-1 font-display text-3xl font-medium text-ink">
            Profiles
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <span className="eyebrow">
            {people.length} {people.length === 1 ? "profile" : "profiles"}
          </span>
          <Link
            href="/start"
            className="rounded-full bg-pine px-4 py-2 text-sm font-medium text-paper shadow-float transition-colors hover:bg-pine-deep"
          >
            + New analysis
          </Link>
        </div>
      </div>

      {sorted.length === 0 ? (
        <div className="mx-auto mt-10 max-w-md rounded-2xl border border-dashed border-line bg-surface px-8 py-14 text-center shadow-card">
          <p className="eyebrow">Empty lab</p>
          <h2 className="mt-3 font-display text-2xl font-semibold text-ink">
            No profiles yet
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">
            Answer a few questions, add guided photos, and get a personalized
            plan — it all runs on this machine.
          </p>
          <Link
            href="/start"
            className="mt-6 inline-block rounded-full bg-pine px-6 py-3 text-sm font-medium text-paper shadow-float transition-colors hover:bg-pine-deep"
          >
            Start your first analysis →
          </Link>
          <Link
            href="/"
            className="mt-6 inline-block font-mono text-xs uppercase tracking-label text-pine hover:text-pine-deep"
          >
            ← Back to home
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {sorted.map((person) => (
            <PersonCard key={person.id} person={person} />
          ))}
        </div>
      )}
    </div>
  );
}

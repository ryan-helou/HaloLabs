import Link from "next/link";
import type { Metadata } from "next";
import { loadPeopleForRequest } from "@/lib/data";
import { isUnlocked } from "@/lib/entitlement";
import { auth } from "@/lib/auth";
import { userHasPeople } from "@/lib/repo";
import PersonCard from "@/components/PersonCard";
import SignedInAs from "@/components/SignedInAs";
import DangerZone from "@/components/DangerZone";
import TrackOnMount from "@/components/TrackOnMount";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Profiles",
};

export default async function ProfilesPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const session = await auth();
  const signedIn = Boolean(session?.user?.id);
  const [people, unlocked, dbBacked] = await Promise.all([
    loadPeopleForRequest(),
    isUnlocked(),
    signedIn ? userHasPeople(session!.user!.id) : Promise.resolve(false),
  ]);
  // People are deletable only when they're the user's own DB records (not the
  // local seed/dev fallback).
  const deletable = dbBacked;
  const sorted = [...people].sort((a, b) =>
    a.displayName.localeCompare(b.displayName)
  );

  const justUpgraded = searchParams?.upgraded === "1";
  const billingUnavailable = searchParams?.billing === "unavailable";

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
          {unlocked && (
            <a
              href="/api/billing-portal"
              className="hidden rounded-full border border-line px-4 py-2 text-sm font-medium text-ink-soft transition-colors hover:text-ink sm:inline"
            >
              Manage membership
            </a>
          )}
          <Link
            href="/start"
            className="rounded-full bg-pine px-4 py-2 text-sm font-medium text-paper shadow-float transition-colors hover:bg-pine-deep"
          >
            + New analysis
          </Link>
        </div>
      </div>

      {justUpgraded && <TrackOnMount event="membership_active" />}
      {justUpgraded && (
        <div className="mb-6 flex items-center gap-3 rounded-2xl border border-pine/30 bg-sage/50 px-5 py-4">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-pine text-paper">
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </span>
          <p className="text-sm text-ink">
            <span className="font-medium">Membership active.</span> Your full
            plans are unlocked — open any profile to see the whole thing.
          </p>
        </div>
      )}
      {billingUnavailable && (
        <div className="mb-6 rounded-2xl border border-clay/30 bg-clay-soft px-5 py-4">
          <p className="text-sm text-ink-soft">
            We couldn&apos;t open the billing portal — you may not have an active
            membership yet. If this seems wrong, try again shortly.
          </p>
        </div>
      )}

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
            <PersonCard key={person.id} person={person} deletable={deletable} />
          ))}
        </div>
      )}

      {signedIn && <DangerZone />}
    </div>
  );
}

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isUnlocked } from "@/lib/entitlement";
import { hasFullPlan } from "@/lib/plan";
import { startFullPlan } from "@/lib/analyze";
import type { Person } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Generates (and reports on) the PAID full plan for a person — the second half
 * of split-generation. The free scan only produced a teaser; when the owner
 * unlocks, the routine/roadmap/shopping list are generated here, once, and the
 * viewer refreshes into the full plan. Gated on ownership + entitlement so the
 * expensive call only ever fires for a paying owner.
 */

const STALE_JOB_MS = 10 * 60 * 1000;

async function ownedUnlockedPerson(id: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Please sign in.", status: 401 as const };
  const person = await prisma.person.findFirst({
    where: { userId: session.user.id, id },
  });
  if (!person) return { error: "Not found.", status: 404 as const };
  if (!(await isUnlocked())) return { error: "Membership required.", status: 403 as const };
  return { userId: session.user.id, personId: id };
}

async function latestRecord(personId: string): Promise<Person | undefined> {
  const row = await prisma.analysisResult.findFirst({
    where: { personId },
    orderBy: { createdAt: "desc" },
  });
  return row?.data as unknown as Person | undefined;
}

/** POST → ensure a full plan is being (or has been) generated for this person. */
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const id = decodeURIComponent(params.id);
  const gate = await ownedUnlockedPerson(id);
  if ("error" in gate) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const record = await latestRecord(id);
  if (record && hasFullPlan(record)) {
    return NextResponse.json({ state: "ready" });
  }

  // Don't double-start: a live, non-stale job is already building it.
  const live = await prisma.analysisJob.findFirst({
    where: { personId: id, status: { in: ["QUEUED", "RUNNING"] } },
    orderBy: { createdAt: "desc" },
  });
  if (live && Date.now() - live.createdAt.getTime() < STALE_JOB_MS) {
    return NextResponse.json({ state: "building" });
  }
  if (live) {
    await prisma.analysisJob.update({
      where: { id: live.id },
      data: { status: "FAILED", error: "Timed out.", completedAt: new Date() },
    });
  }

  await startFullPlan(gate.userId, id);
  return NextResponse.json({ state: "building" });
}

/** GET → poll the full-plan generation state. */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const id = decodeURIComponent(params.id);
  const gate = await ownedUnlockedPerson(id);
  if ("error" in gate) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const record = await latestRecord(id);
  if (record && hasFullPlan(record)) {
    return NextResponse.json({ state: "ready" });
  }

  const job = await prisma.analysisJob.findFirst({
    where: { personId: id },
    orderBy: { createdAt: "desc" },
  });
  if (job && (job.status === "QUEUED" || job.status === "RUNNING")) {
    const elapsedMs = Date.now() - job.createdAt.getTime();
    if (elapsedMs > STALE_JOB_MS) {
      return NextResponse.json({ state: "error" });
    }
    return NextResponse.json({ state: "building", elapsedSec: Math.round(elapsedMs / 1000) });
  }
  if (job && job.status === "FAILED") {
    return NextResponse.json({ state: "error", hint: job.error ?? undefined });
  }
  // Teaser exists but no full plan and no job yet — client should POST to start.
  return NextResponse.json({ state: "idle" });
}

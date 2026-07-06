import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isUnlocked } from "@/lib/entitlement";
import { hasFullPlan } from "@/lib/plan";
import { startFullPlan } from "@/lib/analyze";
import { queuePosition } from "@/lib/queue";
import type { Person } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Generates (and reports on) the PAID full plan for a person — the second half
 * of split-generation. The free scan only produced a teaser; when the owner
 * unlocks, the routine/roadmap/shopping list are generated here, once, and the
 * viewer refreshes into the full plan. Gated on ownership + entitlement so the
 * expensive call only ever fires for a paying owner. Note: the webhook also
 * enqueues this on payment, so this client trigger is now an idempotent fallback.
 */

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
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = decodeURIComponent((await params).id);
  const gate = await ownedUnlockedPerson(id);
  if ("error" in gate) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const record = await latestRecord(id);
  if (record && hasFullPlan(record)) {
    return NextResponse.json({ state: "ready" });
  }

  // Don't double-start: a QUEUED job is in line, a RUNNING job with a valid
  // lease is processing — either way it's already building. Only a RUNNING job
  // with an expired lease is a dead worker; fail it so we can start cleanly.
  const live = await prisma.analysisJob.findFirst({
    where: { personId: id, status: { in: ["QUEUED", "RUNNING"] } },
    orderBy: { createdAt: "desc" },
  });
  if (live) {
    const leaseValid = live.leaseUntil ? live.leaseUntil.getTime() > Date.now() : false;
    if (live.status === "QUEUED" || leaseValid) {
      return NextResponse.json({ state: "building" });
    }
    await prisma.analysisJob.update({
      where: { id: live.id },
      data: { status: "FAILED", error: "Worker didn't finish — restarted.", completedAt: new Date() },
    });
  }

  await startFullPlan(gate.userId, id);
  return NextResponse.json({ state: "building" });
}

/** GET → poll the full-plan generation state. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = decodeURIComponent((await params).id);
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
    const position = job.status === "QUEUED" ? await queuePosition(job.createdAt) : 1;
    return NextResponse.json({
      state: "building",
      elapsedSec: Math.round(elapsedMs / 1000),
      queuePosition: position > 1 ? position : undefined,
    });
  }
  if (job && job.status === "FAILED") {
    return NextResponse.json({ state: "error", hint: job.error ?? undefined });
  }
  // Teaser exists but no full plan and no job yet — client should POST to start.
  return NextResponse.json({ state: "idle" });
}

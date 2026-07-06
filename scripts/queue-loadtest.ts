import "dotenv/config";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/db";
import { claimQueuedJobs, recoverOrphans, queuePosition } from "@/lib/queue";

/**
 * Queue concurrency / durability harness (the DoD load test, minus real Claude
 * calls so it's free). Enqueues N jobs, drains them with W concurrent claimers,
 * and asserts:
 *   - every job is claimed exactly once (FOR UPDATE SKIP LOCKED never
 *     double-hands a job across workers),
 *   - queue position reports correctly,
 *   - an orphaned RUNNING job (expired lease) is requeued by recoverOrphans.
 *
 * Uses a throwaway user+person and deletes everything in `finally`, so it leaves
 * no trace. Run: `npm run loadtest` (LOADTEST_JOBS / LOADTEST_WORKERS to tune).
 */

const N = Number(process.env.LOADTEST_JOBS) || 50;
const WORKERS = Number(process.env.LOADTEST_WORKERS) || 4;

async function main() {
  const tag = `loadtest-${randomUUID()}`;
  const user = await prisma.user.create({ data: { email: `${tag}@loadtest.local` } });
  const person = await prisma.person.create({
    data: { userId: user.id, displayName: "loadtest" },
  });

  try {
    await prisma.analysisJob.createMany({
      data: Array.from({ length: N }, () => ({
        userId: user.id,
        personId: person.id,
        status: "QUEUED" as const,
        jobType: "TEASER" as const,
      })),
    });

    const first = await prisma.analysisJob.findFirst({
      where: { personId: person.id },
      orderBy: { createdAt: "asc" },
    });
    const firstPos = await queuePosition(first!.createdAt);

    // W concurrent claimers drain the queue, marking each batch COMPLETED.
    const claimed = new Map<string, number>();
    async function drainer() {
      for (;;) {
        const batch = await claimQueuedJobs(4);
        if (batch.length === 0) return;
        for (const j of batch) claimed.set(j.id, (claimed.get(j.id) ?? 0) + 1);
        await prisma.analysisJob.updateMany({
          where: { id: { in: batch.map((b) => b.id) } },
          data: { status: "COMPLETED", completedAt: new Date() },
        });
      }
    }
    await Promise.all(Array.from({ length: WORKERS }, drainer));

    const doubleClaimed = [...claimed.values()].filter((c) => c > 1).length;

    // Recovery: an orphaned RUNNING job with an expired lease must be requeued.
    const orphan = await prisma.analysisJob.create({
      data: {
        userId: user.id,
        personId: person.id,
        status: "RUNNING",
        jobType: "TEASER",
        leaseUntil: new Date(Date.now() - 1000),
        attempts: 1,
      },
    });
    const recovered = await recoverOrphans();
    const orphanAfter = await prisma.analysisJob.findUnique({ where: { id: orphan.id } });

    const results = {
      enqueued: N,
      uniqueClaimed: claimed.size,
      doubleClaimed,
      firstPos,
      recovered,
      orphanRequeued: orphanAfter?.status === "QUEUED",
    };
    console.log(JSON.stringify(results, null, 2));

    const pass =
      results.uniqueClaimed === N &&
      results.doubleClaimed === 0 &&
      results.firstPos === 1 &&
      results.orphanRequeued === true;
    console.log(pass ? "\nPASS ✅" : "\nFAIL ❌");
    process.exitCode = pass ? 0 : 1;
  } finally {
    await prisma.analysisJob.deleteMany({ where: { userId: user.id } }).catch(() => {});
    await prisma.person.deleteMany({ where: { id: person.id } }).catch(() => {});
    await prisma.user.delete({ where: { id: user.id } }).catch(() => {});
    await prisma.$disconnect().catch(() => {});
  }
}

main();

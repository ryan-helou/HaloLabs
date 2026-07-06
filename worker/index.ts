/**
 * HaloLabs analysis worker — the durable replacement for fire-and-forget
 * in-process jobs. Runs as its own Railway service (`npm run worker`), separate
 * from the web dyno, so a web redeploy can't kill in-flight analyses and a
 * viral spike queues in Postgres instead of piling base64 images into the web
 * process heap.
 *
 * Loop: recover orphans → claim a batch (FOR UPDATE SKIP LOCKED) → process
 * concurrently → repeat. SIGTERM stops claiming and lets in-flight jobs finish;
 * anything still RUNNING when the box dies is reclaimed by the next recovery
 * sweep via its expired lease.
 *
 * Env: WORKER_CONCURRENCY (batch/concurrency, default 4), WORKER_POLL_MS (idle
 * poll interval, default 1500), DATABASE_POOL_MAX (keep small, e.g. 5).
 */
import { prisma } from "../lib/db";
import { processJob } from "../lib/analyze";
import { claimQueuedJobs, recoverOrphans } from "../lib/queue";

const CONCURRENCY = Number(process.env.WORKER_CONCURRENCY) || 4;
const POLL_MS = Number(process.env.WORKER_POLL_MS) || 1500;

let draining = false;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function tick(): Promise<number> {
  const jobs = await claimQueuedJobs(CONCURRENCY);
  if (jobs.length === 0) return 0;
  console.log(`[worker] claimed ${jobs.length} job(s): ${jobs.map((j) => `${j.jobType}:${j.id}`).join(", ")}`);
  // processJob captures its own errors onto the job row, so one bad job can't
  // reject the batch.
  await Promise.all(jobs.map((j) => processJob(j.id)));
  return jobs.length;
}

async function main(): Promise<void> {
  console.log(`[worker] starting — concurrency=${CONCURRENCY} pollMs=${POLL_MS}`);
  // Sweep once on startup: a previous deploy may have left RUNNING orphans.
  try {
    const recovered = await recoverOrphans();
    if (recovered) console.log(`[worker] recovered ${recovered} orphaned job(s) on startup`);
  } catch (err) {
    console.error("[worker] startup recovery failed", err);
  }

  let ticksSinceSweep = 0;
  while (!draining) {
    let processed = 0;
    try {
      processed = await tick();
    } catch (err) {
      console.error("[worker] tick error", err);
    }
    // Periodically re-sweep for orphans even under steady load (every ~20 idle
    // ticks, or whenever the queue drains) so a mid-batch crash self-heals.
    if (++ticksSinceSweep >= 20) {
      ticksSinceSweep = 0;
      try {
        const recovered = await recoverOrphans();
        if (recovered) console.log(`[worker] recovered ${recovered} orphaned job(s)`);
      } catch (err) {
        console.error("[worker] recovery sweep failed", err);
      }
    }
    // Only back off when there was nothing to do; a full batch loops immediately.
    if (processed === 0) await sleep(POLL_MS);
  }

  console.log("[worker] drained — exiting");
  await prisma.$disconnect().catch(() => {});
  process.exit(0);
}

function shutdown(signal: string): void {
  if (draining) return;
  console.log(`[worker] ${signal} received — draining (finishing in-flight jobs, no new claims)`);
  draining = true;
}
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

main().catch((err) => {
  console.error("[worker] fatal", err);
  process.exit(1);
});

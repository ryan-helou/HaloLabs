import { prisma } from "./db";
import { JOB_LEASE_MS } from "./analyze";

/**
 * DB-backed job queue helpers. The AnalysisJob table *is* the queue: the worker
 * (worker/index.ts) claims QUEUED rows atomically with `FOR UPDATE SKIP LOCKED`
 * so multiple worker instances never grab the same job, leases them for crash
 * recovery, and requeues orphans left behind by a crash / redeploy.
 *
 * Column names below are the quoted camelCase Prisma emits, so the raw SQL
 * matches the generated schema exactly.
 */

const LEASE_SECONDS = Math.round(JOB_LEASE_MS / 1000);
const MAX_ATTEMPTS = 3;

export interface ClaimedJob {
  id: string;
  personId: string;
  jobType: "TEASER" | "FULL";
}

/**
 * Atomically claim up to `limit` QUEUED jobs (oldest first), flipping them to
 * RUNNING with a fresh lease and bumping attempts. SKIP LOCKED means concurrent
 * workers get disjoint batches instead of blocking or double-claiming.
 */
export async function claimQueuedJobs(limit: number): Promise<ClaimedJob[]> {
  const rows = await prisma.$queryRaw<ClaimedJob[]>`
    UPDATE "AnalysisJob" AS j
    SET status = 'RUNNING',
        "startedAt" = now(),
        "leaseUntil" = now() + (${LEASE_SECONDS} * interval '1 second'),
        attempts = j.attempts + 1
    WHERE j.id IN (
      SELECT id FROM "AnalysisJob"
      WHERE status = 'QUEUED'
      ORDER BY "createdAt" ASC
      LIMIT ${limit}
      FOR UPDATE SKIP LOCKED
    )
    RETURNING j.id, j."personId", j."jobType"
  `;
  return rows;
}

/**
 * Recover orphans: a RUNNING job whose lease has expired means its worker died
 * (crash / SIGKILL / redeploy). Requeue it — unless it has already burned its
 * retry budget, in which case fail it terminally so it doesn't loop forever.
 * Returns how many rows were touched (for logging).
 */
export async function recoverOrphans(): Promise<number> {
  const n = await prisma.$executeRaw`
    UPDATE "AnalysisJob"
    SET status = CASE WHEN attempts >= ${MAX_ATTEMPTS} THEN 'FAILED'::"JobStatus" ELSE 'QUEUED'::"JobStatus" END,
        "completedAt" = CASE WHEN attempts >= ${MAX_ATTEMPTS} THEN now() ELSE "completedAt" END,
        error = CASE WHEN attempts >= ${MAX_ATTEMPTS}
                     THEN 'Gave up after repeated worker restarts.' ELSE error END,
        "leaseUntil" = NULL
    WHERE status = 'RUNNING' AND "leaseUntil" < now()
  `;
  return n;
}

/**
 * 1-based position of a job in the QUEUED line (how many are ahead of it + 1).
 * Cheap thanks to @@index([status, createdAt]). Powers an honest
 * "you're #N in line" instead of a spinner or a false failure.
 */
export async function queuePosition(createdAt: Date): Promise<number> {
  const ahead = await prisma.analysisJob.count({
    where: { status: "QUEUED", createdAt: { lt: createdAt } },
  });
  return ahead + 1;
}

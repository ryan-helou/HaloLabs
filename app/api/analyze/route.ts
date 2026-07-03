import { promises as fs } from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { NextResponse } from "next/server";
import { resolvePersonDir } from "@/lib/paths";
import { loadResults } from "@/lib/data";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { startAnalysis } from "@/lib/analyze";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Kicks off (and reports on) an analysis run for one person.
 *
 * Cloud mode (signed in + the person is DB-backed): creates an AnalysisJob and
 * runs the hosted Claude-API worker (lib/analyze), reporting status from the
 * job row. Local mode (on-machine dev): spawns a headless `claude` process that
 * runs the analyze-faces skill and tracks status via dotfiles in the person
 * folder. The response shape is identical for both so the intake UI is agnostic.
 */

const STATUS = ".analysis.json";
const EXIT = ".analysis.exit";
const LOG = ".analysis.log";

// A cloud job in flight longer than this is treated as dead (the worker times
// out at 4 min; give it headroom for retries) and reaped on the next start.
const STALE_JOB_MS = 10 * 60 * 1000;

// Per-user cap on analyses started per hour. Each hosted scan spends real API
// budget (STRATEGY flags zero-intent/abuse traffic as a bigger risk than tokens
// themselves), so gate it — generous enough for real re-analysis, low enough to
// bound burn. Failed jobs don't count, so error-retries aren't punished.
const ANALYSIS_HOURLY_LIMIT = Number(process.env.ANALYSIS_HOURLY_LIMIT) || 12;

interface StatusFile {
  state: "running";
  startedAt: string;
}

async function readJson<T>(file: string): Promise<T | null> {
  try {
    return JSON.parse(await fs.readFile(file, "utf8")) as T;
  } catch {
    return null;
  }
}

/** Does this signed-in user own a DB-backed person with this id? */
async function dbPersonFor(userId: string, id: string) {
  return prisma.person.findFirst({ where: { userId, id } });
}

export async function POST(req: Request) {
  let body: { id?: string; ageConfirmed18Plus?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const id = String(body.id ?? "");
  const ageOk = body.ageConfirmed18Plus === true;

  // ── Cloud path ──────────────────────────────────────────────────────
  const session = await auth();
  if (session?.user?.id) {
    const person = await dbPersonFor(session.user.id, id);
    if (person) {
      // 18+ gate (policy) — confirmed on the photos step, right before the run.
      // Persist it on the account so a re-analysis doesn't ask again.
      const acct = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { ageConfirmed18Plus: true },
      });
      if (!ageOk && !acct?.ageConfirmed18Plus) {
        return NextResponse.json(
          {
            started: false,
            error: "Please confirm you're 18 or older to run the analysis.",
          },
          { status: 403 }
        );
      }
      if (ageOk && !acct?.ageConfirmed18Plus) {
        await prisma.user.update({
          where: { id: session.user.id },
          data: { ageConfirmed18Plus: true },
        });
      }
      // Don't double-start if a job is already in flight — but a job that has
      // been in flight longer than the worker's own timeout is dead (crash,
      // redeploy mid-run). Reap it so it can't wedge the person forever.
      const live = await prisma.analysisJob.findFirst({
        where: { personId: id, status: { in: ["QUEUED", "RUNNING"] } },
        orderBy: { createdAt: "desc" },
      });
      if (live) {
        const staleMs = Date.now() - live.createdAt.getTime();
        if (staleMs < STALE_JOB_MS) {
          return NextResponse.json({ started: false, alreadyRunning: true });
        }
        await prisma.analysisJob.update({
          where: { id: live.id },
          data: {
            status: "FAILED",
            error: "Timed out — the analysis worker didn't finish.",
            completedAt: new Date(),
          },
        });
      }

      // Per-user hourly rate limit (counts real, non-failed scans).
      const recent = await prisma.analysisJob.count({
        where: {
          userId: session.user.id,
          status: { not: "FAILED" },
          createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) },
        },
      });
      if (recent >= ANALYSIS_HOURLY_LIMIT) {
        return NextResponse.json(
          {
            started: false,
            error:
              "You've run a lot of analyses this hour. Give it a little while and try again.",
          },
          { status: 429 }
        );
      }

      const jobId = await startAnalysis(session.user.id, id);
      return NextResponse.json({ started: true, jobId });
    }
  }

  // ── Local path (on-machine dev) ─────────────────────────────────────
  const dir = resolvePersonDir(id);
  if (!dir) {
    return NextResponse.json({ error: "Invalid person id" }, { status: 400 });
  }

  const status = await readJson<StatusFile>(path.join(dir, STATUS));
  const exitExists = await fs
    .access(path.join(dir, EXIT))
    .then(() => true)
    .catch(() => false);
  if (status?.state === "running" && !exitExists) {
    const ageMin = (Date.now() - Date.parse(status.startedAt)) / 60000;
    if (ageMin < 30) {
      return NextResponse.json({ started: false, alreadyRunning: true });
    }
  }

  const startedAt = new Date().toISOString();
  await fs.writeFile(
    path.join(dir, STATUS),
    JSON.stringify({ state: "running", startedAt } satisfies StatusFile, null, 2),
    "utf8"
  );
  await fs.rm(path.join(dir, EXIT), { force: true });
  await fs.writeFile(path.join(dir, LOG), `[${startedAt}] starting analyze-faces for ${id}\n`, "utf8");

  const prompt =
    `Run the analyze-faces skill with --force ${id}. ` +
    `Follow .claude/skills/analyze-faces/SKILL.md exactly: read data/people/${id}/profile.json ` +
    `for the onboarding answers, view every photo in data/people/${id}/ with your own vision, ` +
    `and write the full v2 record (observations, advice, plan) for ${id} into data/results.json, ` +
    `preserving all other people already in the file. Analyze ONLY ${id}.`;

  const script =
    `claude -p ${JSON.stringify(prompt)} ` +
    `--permission-mode acceptEdits ` +
    `--allowedTools "Bash(ls:*)" "Bash(mv:*)" "Bash(sips:*)" ` +
    `>> ${JSON.stringify(path.join(dir, LOG))} 2>&1; ` +
    `echo $? > ${JSON.stringify(path.join(dir, EXIT))}`;

  try {
    const child = spawn("/bin/zsh", ["-lc", script], {
      cwd: process.cwd(),
      detached: true,
      stdio: "ignore",
    });
    child.unref();
  } catch {
    await fs.rm(path.join(dir, STATUS), { force: true });
    return NextResponse.json({ started: false, manual: true });
  }

  return NextResponse.json({ started: true, startedAt });
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = String(searchParams.get("id") ?? "");

  // ── Cloud path ──────────────────────────────────────────────────────
  const session = await auth();
  if (session?.user?.id) {
    const person = await dbPersonFor(session.user.id, id);
    if (person) {
      const job = await prisma.analysisJob.findFirst({
        where: { personId: id },
        orderBy: { createdAt: "desc" },
      });
      if (!job) return NextResponse.json({ state: "idle" });
      if (job.status === "COMPLETED") {
        return NextResponse.json({ state: "done", analyzedAt: job.completedAt });
      }
      if (job.status === "FAILED") {
        return NextResponse.json({ state: "error", hint: job.error ?? "Analysis failed." });
      }
      const elapsedMs = Date.now() - job.createdAt.getTime();
      if (elapsedMs > STALE_JOB_MS) {
        return NextResponse.json({
          state: "error",
          hint: "The analysis didn't finish in time. Start it again from the photos step.",
        });
      }
      return NextResponse.json({ state: "running", elapsedSec: Math.round(elapsedMs / 1000) });
    }
  }

  // ── Local path ──────────────────────────────────────────────────────
  const dir = resolvePersonDir(id);
  if (!dir) {
    return NextResponse.json({ error: "Invalid person id" }, { status: 400 });
  }

  const status = await readJson<StatusFile>(path.join(dir, STATUS));
  const { people } = await loadResults();
  const person = people.find((p) => p.id === id);

  if (!status) {
    return NextResponse.json({
      state: person ? "done" : "idle",
      analyzedAt: person?.analyzedAt ?? null,
    });
  }

  let exitCode: number | null = null;
  try {
    exitCode = parseInt(
      (await fs.readFile(path.join(dir, EXIT), "utf8")).trim(),
      10
    );
  } catch {
    /* still running */
  }

  const fresh =
    person && Date.parse(person.analyzedAt) >= Date.parse(status.startedAt) - 60_000;

  if (exitCode === null) {
    const elapsedSec = Math.round((Date.now() - Date.parse(status.startedAt)) / 1000);
    return NextResponse.json({ state: "running", elapsedSec });
  }
  if (exitCode === 0 && fresh) {
    return NextResponse.json({ state: "done", analyzedAt: person!.analyzedAt });
  }
  return NextResponse.json({
    state: "error",
    exitCode,
    hint:
      "The local run didn't finish cleanly. Open Claude Code in this project and say: " +
      `"run analyze-faces --force ${id}" — the result appears here on reload.`,
  });
}

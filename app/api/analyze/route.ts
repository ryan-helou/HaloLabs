import { promises as fs } from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { NextResponse } from "next/server";
import { resolvePersonDir } from "@/lib/paths";
import { loadResults } from "@/lib/data";

export const dynamic = "force-dynamic";

/**
 * Kicks off (and reports on) a local analysis run for one person.
 *
 * POST {id} spawns a detached headless Claude Code process that runs the
 * analyze-faces skill for that person, entirely on this machine. Status is
 * tracked with dotfiles inside the person folder:
 *   .analysis.json  — { state, startedAt }
 *   .analysis.exit  — the process exit code, written when it finishes
 *   .analysis.log   — full run log (for debugging)
 *
 * GET ?id= returns { state: idle|running|done|error, ... } by combining the
 * status files with whether results.json now has a fresh record.
 *
 * If spawning fails (claude CLI missing), the response carries manual: true
 * and the UI shows copy-paste instructions instead — the analysis is a
 * Claude Code skill either way; this endpoint is just the convenience button.
 */

const STATUS = ".analysis.json";
const EXIT = ".analysis.exit";
const LOG = ".analysis.log";

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

export async function POST(req: Request) {
  let body: { id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const id = String(body.id ?? "");
  const dir = resolvePersonDir(id);
  if (!dir) {
    return NextResponse.json({ error: "Invalid person id" }, { status: 400 });
  }

  // Refuse to double-start a live run (stale = older than 30 minutes).
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

  // zsh -lc so the user's PATH (incl. ~/.local/bin/claude) applies.
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

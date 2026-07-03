import { promises as fs } from "node:fs";
import path from "node:path";
import { PROGRESS_FILE } from "./paths";
import type { ProgressEntry, ProgressStore } from "./types";
import { auth } from "./auth";
import { prisma } from "./db";

/**
 * Read data/progress.json — the local check-off store for plan suggestions.
 * Missing or malformed file → empty store (same tolerance as results.json).
 */
export async function loadProgress(): Promise<ProgressStore> {
  try {
    const raw = await fs.readFile(PROGRESS_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as ProgressStore) : {};
  } catch {
    return {};
  }
}

/** Atomically write the progress store (temp file + rename). */
export async function saveProgress(store: ProgressStore): Promise<void> {
  // Unique per call — concurrent requests in the same process must not share
  // a temp file, or the second rename hits ENOENT.
  const tmp = path.join(
    path.dirname(PROGRESS_FILE),
    `.progress.json.tmp-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  );
  await fs.writeFile(tmp, JSON.stringify(store, null, 2) + "\n", "utf8");
  await fs.rename(tmp, PROGRESS_FILE);
}

/** Toggle one suggestion's done state for a person; returns the new store. */
export async function setProgress(
  personId: string,
  suggestionId: string,
  done: boolean
): Promise<ProgressStore> {
  const store = await loadProgress();
  const person = store[personId] ?? {};
  if (done) {
    person[suggestionId] = { done: true, doneAt: new Date().toISOString() };
  } else {
    delete person[suggestionId];
  }
  store[personId] = person;
  await saveProgress(store);
  return store;
}

/* ------------------------------------------------------------------ */
/* Cloud (Postgres) — user-scoped progress, with local-file fallback   */
/* ------------------------------------------------------------------ */

/** One person's check-offs for the current request (DB when signed in, else file). */
export async function loadProgressForPerson(
  personId: string
): Promise<Record<string, ProgressEntry>> {
  const session = await auth();
  if (session?.user?.id) {
    const rows = await prisma.progress.findMany({
      where: { userId: session.user.id, personId, done: true },
    });
    const map: Record<string, ProgressEntry> = {};
    for (const r of rows) {
      map[r.suggestionId] = {
        done: true,
        doneAt: r.doneAt?.toISOString(),
      };
    }
    return map;
  }
  const store = await loadProgress();
  return store[personId] ?? {};
}

/**
 * Toggle a check-off for the current request. Writes to Postgres (user-scoped)
 * when signed in; otherwise the local file. Returns the person's updated map.
 */
export async function setProgressForRequest(
  personId: string,
  suggestionId: string,
  done: boolean
): Promise<Record<string, ProgressEntry>> {
  const session = await auth();
  if (session?.user?.id) {
    const userId = session.user.id;
    if (done) {
      await prisma.progress.upsert({
        where: {
          userId_personId_suggestionId: { userId, personId, suggestionId },
        },
        create: { userId, personId, suggestionId, done: true, doneAt: new Date() },
        update: { done: true, doneAt: new Date() },
      });
    } else {
      await prisma.progress.deleteMany({
        where: { userId, personId, suggestionId },
      });
    }
    return loadProgressForPerson(personId);
  }
  const store = await setProgress(personId, suggestionId, done);
  return store[personId] ?? {};
}

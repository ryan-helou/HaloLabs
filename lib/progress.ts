import { promises as fs } from "node:fs";
import path from "node:path";
import { PROGRESS_FILE } from "./paths";
import type { ProgressStore } from "./types";

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

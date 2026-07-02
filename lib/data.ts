import { promises as fs } from "node:fs";
import type { Person, Results } from "./types";
import { RESULTS_FILE } from "./paths";

const EMPTY: Results = { version: 1, people: [] };

/**
 * Read results.json from local disk on every call (no caching), so that
 * re-running the analyze-faces skill is reflected immediately on reload.
 *
 * Returns an empty store if the file is missing or malformed rather than
 * throwing, so the viewer can render its empty state.
 */
export async function loadResults(): Promise<Results> {
  let raw: string;
  try {
    raw = await fs.readFile(RESULTS_FILE, "utf8");
  } catch {
    return EMPTY;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<Results>;
    if (!parsed || !Array.isArray(parsed.people)) return EMPTY;
    return { version: 1, people: parsed.people as Person[] };
  } catch {
    return EMPTY;
  }
}

/**
 * Load a single person by id, or null if not found. Case-insensitive:
 * folder names (e.g. "Ryan-Helou") and onboarding slugs ("ryan-helou")
 * can differ only by case — on macOS they're even the same folder.
 */
export async function loadPerson(id: string): Promise<Person | null> {
  const { people } = await loadResults();
  return (
    people.find((p) => p.id === id) ??
    people.find((p) => p.id.toLowerCase() === id.toLowerCase()) ??
    null
  );
}

import { promises as fs } from "node:fs";
import type { Person, Results } from "./types";
import { RESULTS_FILE } from "./paths";
import { auth } from "./auth";
import { getPersonForUser, listPeopleForUser, userHasPeople } from "./repo";

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
 * All people to show for the current request. When signed in and the account
 * owns analyzed people, they come from Postgres (user-scoped); otherwise we
 * fall back to the local results.json (the on-machine dev / analyze flow).
 */
export async function loadPeopleForRequest(): Promise<Person[]> {
  const session = await auth();
  if (session?.user?.id) {
    const dbPeople = await listPeopleForUser(session.user.id);
    if (dbPeople.length > 0) return dbPeople;
  }
  return (await loadResults()).people;
}

/**
 * Load a single person by id, or null if not found.
 *
 * DB-first: a signed-in account reads its own Person from Postgres. If the
 * account has people in the DB but not this id, we return null rather than
 * leak the local file's data to a real user. Only when the request has no
 * DB-backed people do we fall back to results.json — case-insensitively, since
 * folder names ("Ryan-Helou") and onboarding slugs ("ryan-helou") can differ
 * only by case (on macOS they're even the same folder).
 */
export async function loadPerson(id: string): Promise<Person | null> {
  const session = await auth();
  if (session?.user?.id) {
    const dbPerson = await getPersonForUser(session.user.id, id);
    if (dbPerson) return dbPerson;
    if (await userHasPeople(session.user.id)) return null;
  }

  const { people } = await loadResults();
  return (
    people.find((p) => p.id === id) ??
    people.find((p) => p.id.toLowerCase() === id.toLowerCase()) ??
    null
  );
}

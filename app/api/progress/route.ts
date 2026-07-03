import { NextResponse } from "next/server";
import { loadProgressForPerson, setProgressForRequest } from "@/lib/progress";

export const dynamic = "force-dynamic";

/**
 * Suggestion check-offs. Signed-in requests read/write Postgres (user-scoped);
 * the local/on-machine flow falls back to progress.json. personId is accepted
 * as an opaque string (it may be a DB cuid or a local slug), so no path check.
 */

/** GET ?id=<personId> → that person's check-offs. */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = String(searchParams.get("id") ?? "").slice(0, 200);
  if (!id) {
    return NextResponse.json({ error: "Missing person id" }, { status: 400 });
  }
  const progress = await loadProgressForPerson(id);
  return NextResponse.json({ progress });
}

/** POST { personId, suggestionId, done } → toggles one check-off. */
export async function POST(req: Request) {
  let body: { personId?: string; suggestionId?: string; done?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const personId = String(body.personId ?? "").slice(0, 200);
  const suggestionId = String(body.suggestionId ?? "").slice(0, 120);
  if (!personId || !suggestionId) {
    return NextResponse.json({ error: "Invalid ids" }, { status: 400 });
  }
  const progress = await setProgressForRequest(
    personId,
    suggestionId,
    body.done === true
  );
  return NextResponse.json({ progress });
}

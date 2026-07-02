import { NextResponse } from "next/server";
import { loadProgress, setProgress } from "@/lib/progress";
import { resolvePersonDir } from "@/lib/paths";

export const dynamic = "force-dynamic";

/** GET ?id=<personId> → that person's suggestion check-offs. */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = String(searchParams.get("id") ?? "");
  if (!resolvePersonDir(id)) {
    return NextResponse.json({ error: "Invalid person id" }, { status: 400 });
  }
  const store = await loadProgress();
  return NextResponse.json({ progress: store[id] ?? {} });
}

/** POST { personId, suggestionId, done } → toggles one check-off. */
export async function POST(req: Request) {
  let body: { personId?: string; suggestionId?: string; done?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const personId = String(body.personId ?? "");
  const suggestionId = String(body.suggestionId ?? "").slice(0, 120);
  if (!resolvePersonDir(personId) || !suggestionId) {
    return NextResponse.json({ error: "Invalid ids" }, { status: 400 });
  }
  const store = await setProgress(personId, suggestionId, body.done === true);
  return NextResponse.json({ progress: store[personId] ?? {} });
}

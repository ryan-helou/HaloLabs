import { loadPerson } from "@/lib/data";
import { isUnlocked } from "@/lib/entitlement";
import { auth } from "@/lib/auth";
import { buildRoutineIcs } from "@/lib/ics";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Download the person's routine as an .ics calendar feed. Gated to match the
 * plan's own visibility — the routine is premium content, so a signed-in but
 * locked user gets 403 (the on-machine dev flow, which has no session, is
 * allowed). The UI only shows the link when unlocked anyway; this is the guard.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const id = decodeURIComponent((await params).id);
  const person = await loadPerson(id);
  if (!person) return new Response("Not found", { status: 404 });

  const session = await auth();
  const unlocked = (await isUnlocked()) || !session?.user;
  if (!unlocked) return new Response("Locked", { status: 403 });

  const ics = buildRoutineIcs(person);
  if (!ics) return new Response("No routine to export", { status: 404 });

  const filename = `halolabs-routine-${id}.ics`.replace(/[^a-zA-Z0-9.\-]/g, "-");
  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

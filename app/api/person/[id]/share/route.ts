import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { appUrl } from "@/lib/env";
import { mintShareToken, revokeShareToken, checkinCountForOwner } from "@/lib/share";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Mint / revoke a person's public share link. Ownership-gated. The "plan" card
 * (neutral counts + composition) is available to any owner — it's pure top-of-
 * funnel fuel with no PII. The "progress" card requires at least one check-in.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = decodeURIComponent((await params).id);
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  }

  let kind: "plan" | "progress" = "plan";
  try {
    const body = (await req.json()) as { kind?: string };
    if (body.kind === "progress") kind = "progress";
  } catch {
    /* default to plan */
  }

  if (kind === "progress") {
    const n = await checkinCountForOwner(session.user.id, id);
    if (n === null) return NextResponse.json({ error: "Not found." }, { status: 404 });
    if (n === 0) {
      return NextResponse.json(
        { error: "Add a progress check-in first — then you can share your progress." },
        { status: 400 }
      );
    }
  }

  const token = await mintShareToken(session.user.id, id, kind);
  if (!token) return NextResponse.json({ error: "Not found." }, { status: 404 });

  return NextResponse.json({ url: `${appUrl()}/s/${token}`, token, kind });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = decodeURIComponent((await params).id);
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  }
  const ok = await revokeShareToken(session.user.id, id);
  if (!ok) return NextResponse.json({ error: "Not found." }, { status: 404 });
  return NextResponse.json({ revoked: true });
}

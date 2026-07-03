import { promises as fs } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { IMAGE_EXTS, VIDEO_EXTS, resolvePersonDir } from "@/lib/paths";
import { loadResults } from "@/lib/data";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { deletePersonForUser } from "@/lib/delete";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Intake status for one person: profile presence, uploaded media, and whether
 * an analysis exists yet. Used by the /start/photos page to drive its
 * checklist. Cloud-aware: a signed-in owner of a DB person reads counts from
 * Postgres; otherwise it inspects the local person folder.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const id = decodeURIComponent((await params).id);

  // ── Cloud path ──────────────────────────────────────────────────────
  const session = await auth();
  if (session?.user?.id) {
    const person = await prisma.person.findFirst({
      where: { userId: session.user.id, id },
      include: {
        photos: true,
        results: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    });
    if (person) {
      const result = person.results[0];
      // Photos normally come from Photo rows (R2). But when R2 isn't configured
      // (prod uses the disk volume), cloudUpload writes files to the person
      // folder with no Photo row — so fall back to listing that folder, or the
      // capture page would show zero photos and never let the user proceed. The
      // capture grid builds `<id>/<name>`, so return bare filenames here.
      let images = person.photos.map((p) => p.r2Key);
      if (images.length === 0) {
        const dir = resolvePersonDir(id);
        if (dir) {
          try {
            images = (await fs.readdir(dir))
              .filter(
                (n) => !n.startsWith(".") && IMAGE_EXTS.has(path.extname(n).toLowerCase())
              )
              .sort();
          } catch {
            /* no folder yet — leave empty */
          }
        }
      }
      return NextResponse.json({
        exists: true,
        hasProfile: Boolean(person.profile),
        images,
        videos: [],
        analyzed: Boolean(result),
        analyzedAt: result?.createdAt ?? null,
      });
    }
  }

  // ── Local path ──────────────────────────────────────────────────────
  const dir = resolvePersonDir(id);
  if (!dir) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  let entries: string[] = [];
  try {
    entries = await fs.readdir(dir);
  } catch {
    return NextResponse.json({ exists: false }, { status: 404 });
  }

  const images: string[] = [];
  const videos: string[] = [];
  for (const name of entries) {
    if (name.startsWith(".")) continue;
    const ext = path.extname(name).toLowerCase();
    if (IMAGE_EXTS.has(ext)) images.push(name);
    else if (VIDEO_EXTS.has(ext)) videos.push(name);
  }
  images.sort();
  videos.sort();

  const hasProfile = entries.includes("profile.json");
  const { people } = await loadResults();
  const person = people.find((p) => p.id === id);

  return NextResponse.json({
    exists: true,
    hasProfile,
    images,
    videos,
    analyzed: Boolean(person),
    analyzedAt: person?.analyzedAt ?? null,
  });
}

/**
 * Update a person's onboarding profile — the "fill up your information" step
 * that runs after purchase. Storing it BEFORE the full-plan job kicks off means
 * the paid plan is personalized to these answers. Owner-only.
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  }
  const id = decodeURIComponent((await params).id);

  let body: { profile?: unknown; displayName?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const person = await prisma.person.findFirst({
    where: { userId: session.user.id, id },
  });
  if (!person) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const displayName =
    typeof body.displayName === "string" && body.displayName.trim()
      ? body.displayName.trim().slice(0, 80)
      : undefined;

  await prisma.person.update({
    where: { id: person.id },
    data: {
      ...(body.profile !== undefined ? { profile: body.profile as object } : {}),
      ...(displayName ? { displayName } : {}),
    },
  });

  return NextResponse.json({ ok: true });
}

/**
 * Delete a person the signed-in user owns — their photos (R2), check-offs, and
 * analysis records. This is what makes the privacy page's "delete individual
 * photos" promise real. Only DB-backed people (real accounts) are deletable;
 * the local seed/dev people aren't user data.
 */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  }
  const id = decodeURIComponent((await params).id);
  const deleted = await deletePersonForUser(session.user.id, id);
  if (!deleted) {
    return NextResponse.json(
      { error: "That profile doesn't exist on your account." },
      { status: 404 }
    );
  }
  return NextResponse.json({ deleted: true });
}

import { promises as fs } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { IMAGE_EXTS, VIDEO_EXTS, resolvePersonDir } from "@/lib/paths";
import { loadResults } from "@/lib/data";

export const dynamic = "force-dynamic";

/**
 * Intake status for one person: profile presence, uploaded media, and whether
 * an analysis exists yet. Used by the /start/photos page to drive its
 * checklist.
 */
export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const id = decodeURIComponent(params.id);
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

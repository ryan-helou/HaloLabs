import { promises as fs } from "node:fs";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { NextResponse } from "next/server";
import {
  IMAGE_EXTS,
  UPLOAD_IMAGE_EXTS,
  VIDEO_EXTS,
  resolvePersonDir,
} from "@/lib/paths";

export const dynamic = "force-dynamic";

const execFileAsync = promisify(execFile);

const MAX_IMAGE_BYTES = 40 * 1024 * 1024; // 40MB
const MAX_VIDEO_BYTES = 400 * 1024 * 1024; // 400MB

/** Sanitize an uploaded filename to a safe basename (keeps its extension). */
function safeName(original: string): string {
  const ext = path.extname(original).toLowerCase();
  const stem = path
    .basename(original, path.extname(original))
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "")
    .slice(0, 60);
  return `${stem || "upload"}${ext}`;
}

/** Find a non-colliding path by suffixing -2, -3… before the extension. */
async function uniquePath(dir: string, name: string): Promise<string> {
  const ext = path.extname(name);
  const stem = path.basename(name, ext);
  for (let i = 0; i < 100; i++) {
    const candidate = path.join(dir, i === 0 ? name : `${stem}-${i + 1}${ext}`);
    try {
      await fs.access(candidate);
    } catch {
      return candidate;
    }
  }
  throw new Error("Too many name collisions");
}

/**
 * Accepts multipart uploads for a person: images (jpg/png/webp, plus
 * HEIC/HEIF converted to jpg via macOS `sips`) and optional videos
 * (mp4/mov/webm). Files land in data/people/<id>/ — they never leave this
 * machine.
 */
export async function POST(req: Request) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart form" }, { status: 400 });
  }

  const id = String(form.get("id") ?? "");
  const dir = resolvePersonDir(id);
  if (!dir) {
    return NextResponse.json({ error: "Invalid person id" }, { status: 400 });
  }
  try {
    await fs.access(path.join(dir, "profile.json"));
  } catch {
    return NextResponse.json(
      { error: "Complete onboarding first — this profile doesn't exist yet." },
      { status: 404 }
    );
  }

  const files = form.getAll("files").filter((f): f is File => f instanceof File);
  if (files.length === 0) {
    return NextResponse.json({ error: "No files received" }, { status: 400 });
  }

  const saved: string[] = [];
  const errors: string[] = [];

  for (const file of files) {
    const ext = path.extname(file.name).toLowerCase();
    const isImage = UPLOAD_IMAGE_EXTS.has(ext);
    const isVideo = VIDEO_EXTS.has(ext);

    if (!isImage && !isVideo) {
      errors.push(`${file.name}: unsupported type (photos: jpg/png/webp/heic, video: mp4/mov/webm)`);
      continue;
    }
    if (file.size > (isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES)) {
      errors.push(`${file.name}: too large`);
      continue;
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const target = await uniquePath(dir, safeName(file.name));
    await fs.writeFile(target, buffer);

    // HEIC/HEIF → JPEG so both the browser and the analysis can read it.
    if (ext === ".heic" || ext === ".heif") {
      const jpgTarget = target.replace(/\.[^.]+$/, ".jpg");
      try {
        await execFileAsync("/usr/bin/sips", [
          "-s",
          "format",
          "jpeg",
          "-s",
          "formatOptions",
          "90",
          target,
          "--out",
          jpgTarget,
        ]);
        await fs.unlink(target); // keep only the converted copy
        saved.push(path.basename(jpgTarget));
      } catch {
        await fs.unlink(target).catch(() => {});
        errors.push(`${file.name}: HEIC conversion failed — please export as JPG and retry`);
      }
      continue;
    }

    if (isImage && !IMAGE_EXTS.has(ext)) {
      // Shouldn't happen (UPLOAD_IMAGE_EXTS minus HEIC == IMAGE_EXTS) but stay safe.
      await fs.unlink(target).catch(() => {});
      errors.push(`${file.name}: unsupported image type`);
      continue;
    }

    saved.push(path.basename(target));
  }

  return NextResponse.json({ saved, errors });
}
